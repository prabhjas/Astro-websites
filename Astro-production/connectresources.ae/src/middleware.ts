import './cms';
import { defineMiddleware } from 'astro:middleware';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getServerEnv } from './env/server';
import { logInfo } from './services/logger';
import { readRuntimeRedirects, readCanonicalRedirectsYaml, recordRedirectHit } from './lib/runtime-redirects/store';

const __serverDir = dirname(fileURLToPath(import.meta.url));
const __projectRoot = resolve(__serverDir, '..');

function normalisePath(pathname: string): string {
  if (!pathname || pathname === '/') return '/';
  return pathname.endsWith('/') ? pathname : `${pathname}/`;
}

function shouldAccessLog(pathname: string): boolean {
  if (pathname.startsWith('/wp-content/') || pathname.startsWith('/wp-includes/')) return false;
  if (pathname.startsWith('/chrome/') || pathname.startsWith('/js/') || pathname.startsWith('/scripts/')) return false;
  if (/\.(css|js|map|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|otf|avif)$/i.test(pathname)) return false;
  return true;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const started = Date.now();
  const pathname = context.url.pathname;
  const method = context.request.method;

  const respond = async (): Promise<Response> => {
    // Per-site dashboard UI removed — content/leads managed via central CMS → /api/internal/*
    // Must run before trailing-slash redirects so /internal/operations returns 404 (not 308).
    if (
      pathname === '/internal/operations' ||
      pathname.startsWith('/internal/operations/') ||
      pathname === '/internal/lead-operations' ||
      pathname.startsWith('/internal/lead-operations/')
    ) {
      return new Response('Not found', { status: 404 });
    }

    // Enforce trailingSlash: 'always' — bare paths (no file extension) redirect with slash.
    // 301 for GET/HEAD (SEO); 308 for POST/etc so method + body are preserved.
    if (pathname !== '/' && !pathname.endsWith('/') && !pathname.includes('.')) {
      const target = `${pathname}/${context.url.search}`;
      const status = method === 'GET' || method === 'HEAD' ? 301 : 308;
      return new Response(null, {
        status,
        headers: { Location: target },
      });
    }

    if (!['GET', 'HEAD'].includes(method)) {
      return next();
    }

    // Public API routes must not be affected by redirect rules.
    if (pathname.startsWith('/api/') && !pathname.startsWith('/api/internal/')) {
      return next();
    }

    if (pathname.startsWith('/api/internal/') || pathname === '/api/health' || pathname === '/api/health/') {
      return next();
    }

    // Canonical redirects (from repo YAML / built JSON) — no env dependency
    try {
      const canonical = readCanonicalRedirectsYaml(process.cwd(), __projectRoot);
      const canonMatch = canonical.find((rule) => normalisePath(rule.from) === normalisePath(pathname));
      if (canonMatch) {
        return context.redirect(canonMatch.to, (canonMatch.status || 301) as 301 | 302 | 303 | 307 | 308);
      }
    } catch {
      // Never break public pages
    }

    // Runtime redirects (require env for admin dir path)
    try {
      const env = getServerEnv();
      const runtime = await readRuntimeRedirects(env.internalAdminDir);
      const match = runtime.find((rule) => normalisePath(rule.from) === normalisePath(pathname));
      if (match) {
        await recordRedirectHit(env.internalAdminDir, match.from);
        return context.redirect(match.to, (match.status || 301) as 301 | 302 | 303 | 307 | 308);
      }
    } catch {
      // Missing env / redirect store should never break public pages
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
