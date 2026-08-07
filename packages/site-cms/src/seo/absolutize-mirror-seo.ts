/**
 * Absolutize SEO signals in mirrored WP/Elementor HTML (SEO/AI crawler audit 2026-08-06).
 *
 * Rank Math often emits relative canonical/og URLs and JSON-LD "@id":"/…".
 * Search engines and assistants expect absolute HTTPS identifiers.
 */
export type AbsolutizeMirrorSeoOptions = {
  /** Canonical origin, no trailing slash (e.g. https://connectgroup.co). */
  siteOrigin: string;
  /** Path for missing canonical, e.g. `/` or `/about-us/`. */
  path?: string;
  /**
   * Site-relative or absolute share image. Injected only when the page has no
   * `og:image` (Connect Group homepage gap from the audit).
   */
  defaultOgImage?: string;
};

function toAbsolute(siteOrigin: string, value: string, fallbackPath: string): string {
  const origin = siteOrigin.replace(/\/$/, '');
  const raw = (value || fallbackPath).trim();
  try {
    return new URL(raw, `${origin}/`).href;
  } catch {
    return `${origin}${fallbackPath.startsWith('/') ? fallbackPath : `/${fallbackPath}`}`;
  }
}

function rewriteJsonLdBody(body: string, absolute: (v: string) => string): string {
  return body
    .replace(/"@id"\s*:\s*"(\/[^"]*)"/g, (_m, path: string) => `"@id":"${absolute(path)}"`)
    .replace(/"url"\s*:\s*"(\/[^"]*)"/g, (_m, path: string) => `"url":"${absolute(path)}"`)
    .replace(/"contentUrl"\s*:\s*"(\/[^"]*)"/g, (_m, path: string) => `"contentUrl":"${absolute(path)}"`)
    .replace(/"thumbnailUrl"\s*:\s*"(\/[^"]*)"/g, (_m, path: string) => `"thumbnailUrl":"${absolute(path)}"`)
    .replace(
      /"target"\s*:\s*"(\/\?s=\{search_term_string\})"/g,
      (_m, path: string) => `"target":"${absolute(path)}"`,
    );
}

/**
 * Rewrite relative SEO URLs / JSON-LD IDs to absolute HTTPS on the site origin.
 * Does not strip scripts (see sanitizeMirrorHtml hygiene rules).
 */
export function absolutizeMirrorSeoHtml(html: string, options: AbsolutizeMirrorSeoOptions): string {
  const origin = String(options.siteOrigin || '').trim().replace(/\/$/, '');
  if (!origin || !html) return html;

  const fallbackPath = options.path && options.path !== 'homepage' ? options.path : '/';
  const path =
    fallbackPath === '/'
      ? '/'
      : `/${String(fallbackPath).replace(/^\/|\/$/g, '')}/`;

  const absolute = (value: string) => toAbsolute(origin, value, path);

  let out = html
    .replace(/(<link\s+rel="canonical"\s+href=")([^"]+)("[^>]*>)/i, (_m, before, value, after) =>
      `${before}${absolute(value)}${after}`,
    )
    .replace(/(<meta\s+property="og:url"\s+content=")([^"]+)("[^>]*>)/i, (_m, before, value, after) =>
      `${before}${absolute(value)}${after}`,
    )
    .replace(/(<meta\s+property="og:image"\s+content=")([^"]+)("[^>]*>)/i, (_m, before, value, after) =>
      `${before}${absolute(value)}${after}`,
    )
    .replace(/(<meta\s+name="twitter:image"\s+content=")([^"]+)("[^>]*>)/i, (_m, before, value, after) =>
      `${before}${absolute(value)}${after}`,
    )
    .replace(
      /(<script\b[^>]*type=["']application\/ld\+json["'][^>]*>)([\s\S]*?)(<\/script>)/gi,
      (_m, open: string, body: string, close: string) => `${open}${rewriteJsonLdBody(body, absolute)}${close}`,
    );

  if (!/rel=["']canonical["']/i.test(out)) {
    out = out.replace(/<\/head>/i, `<link rel="canonical" href="${absolute(path)}" />\n</head>`);
  }

  if (options.defaultOgImage && !/property=["']og:image["']/i.test(out)) {
    const img = absolute(options.defaultOgImage);
    const tags = [
      `<meta property="og:image" content="${img}" />`,
      `<meta name="twitter:image" content="${img}" />`,
    ].join('\n');
    out = out.replace(/<\/head>/i, `${tags}\n</head>`);
  }

  return out;
}
