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

  // Lead-safe: never redirect POST /api/contact — browsers treat 301 as GET and drop the body.
  if (pathname === '/api/contact' && method !== 'GET' && method !== 'HEAD') {
    return context.rewrite(`/api/contact/${context.url.search}`);
  }

  // Enforce trailing slash — bare paths (no file extension) redirect with slash.
  // 301 for GET/HEAD (SEO); rewrite mutating /api/* so bodies are preserved.
  if (pathname !== '/' && !pathname.endsWith('/') && !pathname.includes('.')) {
    const target = `${pathname}/${context.url.search}`;
    if (method !== 'GET' && method !== 'HEAD' && pathname.startsWith('/api/')) {
      return context.rewrite(target);
    }
    const status = method === 'GET' || method === 'HEAD' ? 301 : 308;
    return new Response(null, {
      status,
      headers: { Location: target },
    });
  }

  // Live crawlers use `/sitemap-index.xml` (→ `/sitemap-0.xml`). Keep /sitemap.xml
  // as a 301 so nothing that still asks for the short name 404s.
  if (pathname === '/sitemap.xml' || pathname === '/sitemap.xml/') {
    return new Response(null, {
      status: method === 'GET' || method === 'HEAD' ? 301 : 308,
      headers: { Location: `/sitemap-index.xml${context.url.search}` },
    });
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
