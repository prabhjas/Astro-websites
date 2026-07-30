import { defineMiddleware } from 'astro:middleware';
import { getServerEnv } from './env/server';
import { readRuntimeRedirects, readCanonicalRedirectsYaml, recordRedirectHit } from './lib/runtime-redirects/store';

function normalisePath(pathname: string): string {
  if (!pathname || pathname === '/') return '/';
  return pathname.endsWith('/') ? pathname : `${pathname}/`;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const pathname = context.url.pathname;

  // Legacy dashboard URL alias
  if (pathname === '/internal/lead-operations' || pathname.startsWith('/internal/lead-operations/')) {
    const rest = pathname.slice('/internal/lead-operations'.length) || '/';
    const target = `/internal/operations${rest.startsWith('/') ? rest : `/${rest}`}${context.url.search}`;
    return context.redirect(target, 308);
  }

  if (!['GET', 'HEAD'].includes(context.request.method)) {
    return next();
  }

  if (pathname.startsWith('/api/internal/') || pathname.startsWith('/internal/operations/')) {
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
      return context.redirect(match.to, match.status || 301);
    }
  } catch {
    // Missing env / redirect store should never break public pages
  }

  return next();
});
