import './cms';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { defineMiddleware } from 'astro:middleware';
import { getServerEnv } from './env/server';
import { logInfo } from './services/logger';
import { readRuntimeRedirects, readCanonicalRedirectsYaml, recordRedirectHit } from './lib/runtime-redirects/store';

function normalisePath(pathname: string): string {
  if (!pathname || pathname === '/') return '/';
  return pathname.endsWith('/') ? pathname : `${pathname}/`;
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

    if (pathname.startsWith('/api/internal/') || pathname === '/api/health') {
      return next();
    }

    try {
      const env = getServerEnv();
      const runtime = await readRuntimeRedirects(env.internalAdminDir);
      const canonical = readCanonicalRedirectsYaml(process.cwd());
      const all = [...canonical, ...runtime];
      const pathNorm = normalisePath(pathname);
      const match = all.find((rule) => normalisePath(rule.from) === pathNorm);
      // Skip self-redirects (e.g. from `/blog` → `/blog/` also matches `/blog/` after normalisation).
      if (match && normalisePath(match.to) !== pathNorm) {
        await recordRedirectHit(env.internalAdminDir, match.from);
        const status = (match.status || 301) as 301 | 302 | 303 | 307 | 308;
        return context.redirect(match.to, status);
      }
    } catch {
      // Missing env / redirect store should never break public pages
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
