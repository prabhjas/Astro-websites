import './cms';
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

    // Enforce trailingSlash: 'always' for API + (legacy) internal paths (308 keeps POST body)
    if (
      pathname !== '/' &&
      !pathname.endsWith('/') &&
      !pathname.includes('.') &&
      (pathname.startsWith('/api/') || pathname.startsWith('/internal/'))
    ) {
      const target = `${pathname}/${context.url.search}`;
      return context.redirect(target, 308);
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

    try {
      const env = getServerEnv();
      const runtime = await readRuntimeRedirects(env.internalAdminDir);
      const canonical = readCanonicalRedirectsYaml(process.cwd());
      const all = [...canonical, ...runtime];
      const match = all.find((rule) => normalisePath(rule.from) === normalisePath(pathname));
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
