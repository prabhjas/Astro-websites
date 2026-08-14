import './cms';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { defineMiddleware } from 'astro:middleware';
import { getServerEnv, resolveInternalAdminDir } from './env/server';
import { logInfo } from './services/logger';
import { readRuntimeRedirects, readCanonicalRedirectsYaml, recordRedirectHit, type RuntimeRedirectRule } from './lib/runtime-redirects/store';

function normalisePath(pathname: string): string {
  if (!pathname || pathname === '/') return '/';
  return pathname.endsWith('/') ? pathname : `${pathname}/`;
}

function canFrontendRedirectTarget(target: string): boolean {
  return target.startsWith('/') && !target.startsWith('//') && !target.includes('\\');
}

function shouldAccessLog(pathname: string): boolean {
  if (pathname.startsWith('/wp-content/') || pathname.startsWith('/wp-includes/')) return false;
  if (pathname.startsWith('/chrome/') || pathname.startsWith('/js/')) return false;
  if (/\.(css|js|map|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|otf|avif)$/i.test(pathname)) return false;
  return true;
}

/** WP resize URLs (-300x191.jpg) → full-size file when the variant is missing locally. */
function fullSizeUploadPath(pathname: string): string | null {
  if (!pathname.startsWith('/wp-content/uploads/')) return null;
  if (!/-\d+x\d+\.(?:jpe?g|png|gif|webp|avif)$/i.test(pathname)) return null;
  return pathname.replace(/-\d+x\d+(?=\.(?:jpe?g|png|gif|webp|avif)$)/i, '');
}

export const onRequest = defineMiddleware(async (context, next) => {
  const started = Date.now();
  const pathname = context.url.pathname;
  const method = context.request.method;

  const respond = async (): Promise<Response> => {
    // Enforce trailingSlash: 'always' — bare paths (no file extension) redirect with slash.
    // Use Response directly: Astro redirect() has coerced non-GET to 301 in practice.
    // 301 for GET/HEAD (SEO); 308 for POST/etc so method + body are preserved.
    if (pathname !== '/' && !pathname.endsWith('/') && !pathname.includes('.')) {
      const target = `${pathname}/${context.url.search}`;
      const status = method === 'GET' || method === 'HEAD' ? 301 : 308;
      return new Response(null, {
        status,
        headers: { Location: target },
      });
    }

    // Per-site dashboard UI removed — content/leads managed via central CMS → /api/internal/*
    if (
      pathname === '/internal/operations' ||
      pathname.startsWith('/internal/operations/') ||
      pathname === '/internal/lead-operations' ||
      pathname.startsWith('/internal/lead-operations/')
    ) {
      return new Response('Not found', { status: 404 });
    }

    if (!['GET', 'HEAD'].includes(method)) {
      return next();
    }

    if (pathname.startsWith('/api/internal/') || pathname === '/api/health' || pathname === '/api/health/') {
      return next();
    }

    const canonical = readCanonicalRedirectsYaml(process.cwd());
    let internalAdminDir: string | null = null;
    let hasTrustedEnv = false;
    let runtime: RuntimeRedirectRule[] = [];

    try {
      const env = getServerEnv();
      internalAdminDir = env.internalAdminDir;
      hasTrustedEnv = true;
    } catch {
      // Secretless frontend has no backend/Pipedrive env; repo YAML still applies below.
      try {
        internalAdminDir = resolveInternalAdminDir();
      } catch {
        internalAdminDir = null;
      }
    }

    if (internalAdminDir) {
      runtime = await readRuntimeRedirects(internalAdminDir);
    }

    const all = [...canonical, ...runtime];
    const match = all.find((rule) => {
      if (!hasTrustedEnv && !canFrontendRedirectTarget(String(rule.to || ''))) return false;
      return normalisePath(rule.from) === normalisePath(pathname);
    });
    if (match) {
      if (internalAdminDir) {
        try {
          await recordRedirectHit(internalAdminDir, match.from);
        } catch {
          // Secretless frontend is read-only; redirect stats are best-effort.
        }
      }
      const status = (match.status || 301) as 301 | 302 | 303 | 307 | 308;
      return context.redirect(match.to, status);
    }

    // Before hitting static 404 for missing WP thumbnails, try full-size upload.
    const fullPath = fullSizeUploadPath(pathname);
    if (fullPath) {
      const publicRoot = join(process.cwd(), 'public');
      const localVariant = join(publicRoot, ...pathname.split('/').filter(Boolean));
      const localFull = join(publicRoot, ...fullPath.split('/').filter(Boolean));
      if (!existsSync(localVariant) && existsSync(localFull)) {
        return context.redirect(fullPath, 302);
      }
    }

    return next();
  };

  const response = await respond();

  if (shouldAccessLog(pathname)) {
    try {
      logInfo('http_access', {
        method,
        path: pathname,
        status: response.status,
        ms: Date.now() - started,
      });
    } catch {
      // never break the response for logging
    }
  }

  return response;
});
