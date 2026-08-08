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

    // Bust stale Connect Resources favicon cache on localhost (new path + redirect).
    const faviconRedirects: Record<string, string> = {
      '/favicon.ico': '/icons/mbs/favicon.ico?v=3',
      '/favicon.svg': '/icons/mbs/favicon.svg?v=3',
      '/favicon-16x16.png': '/icons/mbs/favicon-16x16.png?v=3',
      '/favicon-32x32.png': '/icons/mbs/favicon-32x32.png?v=3',
      '/apple-touch-icon.png': '/icons/mbs/apple-touch-icon.png?v=3',
      '/favicon-192x192.png': '/icons/mbs/favicon-192x192.png?v=3',
    };
    if (faviconRedirects[pathname]) {
      return context.redirect(faviconRedirects[pathname], 302);
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
