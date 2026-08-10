import './cms';
import { defineMiddleware } from 'astro:middleware';
import { resolveInternalAdminDir } from './env/server';
import { logInfo } from './services/logger';
import { readRuntimeRedirects, readCanonicalRedirectsYaml, recordRedirectHit } from './lib/runtime-redirects/store';

function normalisePath(pathname: string): string {
  if (!pathname || pathname === '/') return '/';
  return pathname.endsWith('/') ? pathname : `${pathname}/`;
}

function shouldAccessLog(pathname: string): boolean {
  if (/\.(css|js|map|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|otf|avif)$/i.test(pathname)) return false;
  return true;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const started = Date.now();
  const pathname = context.url.pathname;
  const method = context.request.method;

  const respond = async (): Promise<Response> => {
    // API routes handle their own routing — never force a trailing slash
    // (would 301/308 /api/contact → /api/contact/ and break form POSTs).
    const isApi = pathname === '/api' || pathname.startsWith('/api/');

    // Enforce trailing slash — bare paths (no file extension) redirect.
    // 301 for GET/HEAD (SEO); 308 for POST/etc so method + body are preserved.
    if (!isApi && pathname !== '/' && !pathname.endsWith('/') && !pathname.includes('.')) {
      const target = `${pathname}/${context.url.search}`;
      const status = method === 'GET' || method === 'HEAD' ? 301 : 308;
      return new Response(null, { status, headers: { Location: target } });
    }

    // Per-site dashboard UI removed — FLOW handles ops via /api/internal/*
    if (
      pathname === '/internal/operations' ||
      pathname.startsWith('/internal/operations/') ||
      pathname === '/internal/lead-operations' ||
      pathname.startsWith('/internal/lead-operations/')
    ) {
      return new Response('Not found', { status: 404 });
    }

    if (isApi || !['GET', 'HEAD'].includes(method)) return next();

    try {
      const adminDir = resolveInternalAdminDir();
      const runtime = await readRuntimeRedirects(adminDir);
      const canonical = readCanonicalRedirectsYaml(process.cwd());
      const byFrom = new Map<string, (typeof canonical)[number]>();
      for (const rule of canonical) byFrom.set(normalisePath(rule.from), rule);
      for (const rule of runtime) byFrom.set(normalisePath(rule.from), rule);
      const match = byFrom.get(normalisePath(pathname));
      if (match) {
        await recordRedirectHit(adminDir, match.from);
        const status = (match.status || 301) as 301 | 302 | 303 | 307 | 308;
        return context.redirect(match.to, status);
      }
    } catch {
      /* Missing env / redirect store must never break public pages */
    }

    return next();
  };

  const response = await respond();

  if (shouldAccessLog(pathname)) {
    try {
      logInfo('http_access', { method, path: pathname, status: response.status, ms: Date.now() - started });
    } catch {
      // never break response for logging
    }
  }

  return response;
});
