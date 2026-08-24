import './cms';
import { defineMiddleware } from 'astro:middleware';
import { logInfo } from './services/logger';

function shouldAccessLog(pathname: string): boolean {
  if (pathname.startsWith('/assets/')) return false;
  if (/\.(css|js|map|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|otf|avif)$/i.test(pathname)) return false;
  return true;
}

const LEGACY_REDIRECTS: Record<string, string> = {
  '/es/services/eor': '/es/employer-of-record/spain/',
  '/es/services/payroll': '/es/payroll-outsourcing/spain/',
  '/es/services/labour-legal': '/es/services/',
  '/es/services/compliance': '/es/services/',
  '/es/services/staff-outsourcing': '/es/staff-outsourcing/spain/',
  '/services/eor': '/employer-of-record/spain/',
  '/services/payroll': '/payroll-outsourcing/spain/',
  '/services/labour-legal': '/services/',
  '/services/compliance': '/services/',
  '/services/staff-outsourcing': '/staff-outsourcing/spain/',
};

function legacyTarget(pathname: string): string | undefined {
  if (LEGACY_REDIRECTS[pathname]) return LEGACY_REDIRECTS[pathname];
  if (pathname.endsWith('/') && pathname.length > 1) {
    return LEGACY_REDIRECTS[pathname.slice(0, -1)];
  }
  return undefined;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const started = Date.now();
  const pathname = context.url.pathname;
  const method = context.request.method;

  const legacy = legacyTarget(pathname);
  if (legacy) {
    return new Response(null, {
      status: method === 'GET' || method === 'HEAD' ? 301 : 308,
      headers: { Location: `${legacy}${context.url.search}` },
    });
  }

  // Enforce trailing slash — bare paths (no file extension) redirect with slash.
  // 301 for GET/HEAD (SEO); 308 for POST/etc so method + body are preserved.
  if (pathname !== '/' && !pathname.endsWith('/') && !pathname.includes('.')) {
    const target = `${pathname}/${context.url.search}`;
    const status = method === 'GET' || method === 'HEAD' ? 301 : 308;
    return new Response(null, {
      status,
      headers: { Location: target },
    });
  }

  // Legacy @astrojs/sitemap URLs → hand-rolled /sitemap.xml
  if (
    pathname === '/sitemap-index.xml' ||
    pathname === '/sitemap-index.xml/' ||
    pathname === '/sitemap-0.xml' ||
    pathname === '/sitemap-0.xml/'
  ) {
    return Response.redirect(new URL('/sitemap.xml', context.url), 301);
  }

  // Per-site dashboard UI removed — leads managed via central CMS → /api/internal/*
  if (
    pathname === '/internal/operations' ||
    pathname.startsWith('/internal/operations/') ||
    pathname === '/internal/lead-operations' ||
    pathname.startsWith('/internal/lead-operations/')
  ) {
    const response = new Response('Not found', { status: 404 });
    if (shouldAccessLog(pathname)) {
      try {
        logInfo('http_access', {
          method: context.request.method,
          path: pathname,
          status: response.status,
          ms: Date.now() - started,
        });
      } catch {
        // never break the response for logging
      }
    }
    return response;
  }

  const response = await next();

  if (shouldAccessLog(pathname)) {
    try {
      logInfo('http_access', {
        method: context.request.method,
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
