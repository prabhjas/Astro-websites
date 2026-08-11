/**
 * Central site-origin resolver for robots.txt and sitemap absolute URLs.
 */
export type ResolveSiteOriginOptions = {
  env?: Record<string, string | undefined>;
  astroSite?: string | URL | undefined;
  request?: Request | undefined;
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
  if (!trimmed) throw new Error('Site origin must be a non-empty string');

  let withProtocol = trimmed;
  if (!/^https?:\/\//i.test(withProtocol)) {
    withProtocol = `https://${withProtocol}`;
  }

  const url = new URL(withProtocol);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Site origin must use http or https: ${input}`);
  }

  const host = url.hostname.toLowerCase();
  const isLocal =
    host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.local');

  if (!isLocal && url.protocol === 'http:') {
    url.protocol = 'https:';
  }

  return url.origin;
}

export function resolveSiteOrigin(options: ResolveSiteOriginOptions = {}): string {
  const env = options.env ?? (typeof process !== 'undefined' ? process.env : {});
  const isDev =
    options.isDev ?? (env.NODE_ENV !== 'production' && env.MODE !== 'production');

  const fromEnv = readEnv(env);
  if (fromEnv) return normaliseSiteOrigin(fromEnv);

  if (options.astroSite) return normaliseSiteOrigin(String(options.astroSite));

  if (options.request && options.trustRequestHost) {
    try {
      return normaliseSiteOrigin(new URL(options.request.url).origin);
    } catch {
      // ignore
    }
  }

  if (isDev) return 'http://localhost:4321';

  throw new Error(
    'Unable to resolve site origin. Set PUBLIC_SITE_URL or configure astro.config `site`.',
  );
}

export function absoluteUrl(siteOrigin: string, path: string): string {
  const origin = normaliseSiteOrigin(siteOrigin);
  const normalisedPath = path.startsWith('/') ? path : `/${path}`;
  return new URL(normalisedPath, `${origin}/`).href;
}
