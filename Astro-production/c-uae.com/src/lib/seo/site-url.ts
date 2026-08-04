/**
 * Central site-origin resolver for robots.txt and sitemap absolute URLs.
 *
 * Precedence:
 * 1. PUBLIC_SITE_URL (or SITE_URL) environment variable
 * 2. Astro `site` config value
 * 3. Request origin (SSR / trusted forwarded headers only when allowed)
 * 4. Localhost fallback in development
 */

export type ResolveSiteOriginOptions = {
  env?: Record<string, string | undefined>;
  astroSite?: string | URL | undefined;
  request?: Request | undefined;
  /** Allow Host / X-Forwarded-* only when the adapter provides a trusted origin. Default false. */
  trustRequestHost?: boolean;
  isDev?: boolean;
};

function readEnv(env: Record<string, string | undefined>): string | undefined {
  const raw = env.PUBLIC_SITE_URL ?? env.SITE_URL;
  if (!raw || !raw.trim()) return undefined;
  return raw.trim();
}

export function normaliseSiteOrigin(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('Site origin must be a non-empty string');
  }

  let withProtocol = trimmed;
  if (!/^https?:\/\//i.test(withProtocol)) {
    withProtocol = `https://${withProtocol}`;
  }

  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    throw new Error(`Invalid site origin: ${input}`);
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Site origin must use http or https: ${input}`);
  }

  // Prefer HTTPS for non-localhost production-style hosts
  const host = url.hostname.toLowerCase();
  const isLocal =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host.endsWith('.local');

  if (!isLocal && url.protocol === 'http:') {
    url.protocol = 'https:';
  }

  url.pathname = '';
  url.search = '';
  url.hash = '';
  url.username = '';
  url.password = '';

  // URL.href for origins includes a trailing slash — strip it
  return url.origin;
}

function originFromRequest(request: Request, trustRequestHost: boolean): string | undefined {
  if (!trustRequestHost) return undefined;

  try {
    const url = new URL(request.url);
    // Prefer the request URL origin (adapter-provided) over raw Host headers
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return normaliseSiteOrigin(url.origin);
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export function resolveSiteOrigin(options: ResolveSiteOriginOptions = {}): string {
  const env = options.env ?? (typeof process !== 'undefined' ? process.env : {});
  const isDev =
    options.isDev ??
    (env.NODE_ENV !== 'production' && env.MODE !== 'production');

  const fromEnv = readEnv(env);
  if (fromEnv) {
    return normaliseSiteOrigin(fromEnv);
  }

  if (options.astroSite) {
    return normaliseSiteOrigin(String(options.astroSite));
  }

  if (options.request) {
    const fromRequest = originFromRequest(options.request, options.trustRequestHost === true);
    if (fromRequest) return fromRequest;
  }

  if (isDev) {
    return 'http://localhost:4321';
  }

  throw new Error(
    'Unable to resolve site origin. Set PUBLIC_SITE_URL (recommended) or configure astro.config `site`.',
  );
}

/** Build an absolute canonical URL for a path under the site origin. */
export function absoluteUrl(siteOrigin: string, path: string): string {
  const origin = normaliseSiteOrigin(siteOrigin);
  const normalisedPath = path.startsWith('/') ? path : `/${path}`;
  return new URL(normalisedPath, `${origin}/`).href;
}
