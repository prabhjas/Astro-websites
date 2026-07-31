import './cms';
import { defineMiddleware } from 'astro:middleware';
import { logInfo } from './services/logger';

function shouldAccessLog(pathname: string): boolean {
  if (pathname.startsWith('/assets/')) return false;
  if (/\.(css|js|map|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|otf|avif)$/i.test(pathname)) return false;
  return true;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const started = Date.now();
  const pathname = context.url.pathname;

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
