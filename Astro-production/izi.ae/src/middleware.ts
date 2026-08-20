import './cms';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { defineMiddleware } from 'astro:middleware';
import { getServerEnv } from './env/server';
import { logInfo } from './services/logger';
import { readRuntimeRedirects, readCanonicalRedirectsYaml, recordRedirectHit } from './lib/runtime-redirects/store';
import { handleAdminAjaxRequest } from './lib/wp-admin/admin-ajax';

const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://*.doubleclick.net",
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://www.googletagmanager.com",
  "media-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join('; ');

function addSecurityHeaders(response: Response): Response {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('text/html')) return response;
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  response.headers.set('Content-Security-Policy-Report-Only', CSP_REPORT_ONLY);
  return response;
}

function normalisePath(pathname: string): string {
  if (!pathname || pathname === '/') return '/';
  return pathname.endsWith('/') ? pathname : `${pathname}/`;
}

function shouldAccessLog(pathname: string): boolean {
  if (pathname.startsWith('/wp-content/') || pathname.startsWith('/wp-includes/')) return false;
  if (pathname.startsWith('/chrome/') || pathname.startsWith('/js/')) return false;
  if (pathname.startsWith('/wp-admin/')) return false;
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
    // Mirror WP car-detail AJAX used by filter-screen `.get-infodata` clicks.
    if (pathname.includes('admin-ajax.php')) {
      const ajax = await handleAdminAjaxRequest(context.request);
      if (ajax) return ajax;
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
      const match = all.find((rule) => normalisePath(rule.from) === normalisePath(pathname));
      if (match) {
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

  return addSecurityHeaders(response);
});
