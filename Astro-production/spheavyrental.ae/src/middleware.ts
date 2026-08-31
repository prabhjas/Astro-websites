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
    // Stale /favicon.ico is still served from an old release tip on this host.
    if (pathname === "/favicon.ico" || pathname === "/favicon.ico/") {
      return context.redirect("/favicon-32x32.png?v=20260826", 302);
    }

    // Enforce trailingSlash: 'always' for all non-file paths (308 keeps POST body)
    if (
      pathname !== '/' &&
      !pathname.endsWith('/') &&
      !pathname.includes('.')
    ) {
      const target = `${pathname}/${context.url.search}`;
      return context.redirect(target, 308);
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

    // Canonical YAML redirects must apply even when env / internal-admin is missing.
    const canonical = readCanonicalRedirectsYaml(process.cwd());
    let runtime: Awaited<ReturnType<typeof readRuntimeRedirects>> = [];
    let internalAdminDir: string | null = null;
    try {
      const env = getServerEnv();
      internalAdminDir = env.internalAdminDir;
      runtime = await readRuntimeRedirects(env.internalAdminDir);
    } catch {
      // Missing env / redirect store should never break public pages or YAML redirects.
    }
    const all = [...canonical, ...runtime];
    const match = all.find(
      (rule) => rule.from === pathname || normalisePath(rule.from) === normalisePath(pathname),
    );
    // Skip no-op / self redirects (e.g. normalised `/author` ↔ `/author/` collisions).
    if (match && match.to !== pathname && normalisePath(match.to) !== normalisePath(pathname)) {
      if (internalAdminDir) {
        try {
          await recordRedirectHit(internalAdminDir, match.from);
        } catch {
          // Hit stats are best-effort.
        }
      }
      return context.redirect(match.to, (match.status || 301) as 301 | 302 | 303 | 307 | 308);
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
