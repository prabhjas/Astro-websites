/**
 * Rank Math / Yoast often emit og:type=article and Article JSON-LD on WordPress
 * *pages* (services, about, listings). Commercial pages should use og:type=website
 * plus WebPage/Service/LocalBusiness. Article markup is reserved for genuine posts.
 */

export type MirrorContentKind = 'auto' | 'article' | 'website';

export type NormalizeMirrorContentSeoOptions = {
  siteOrigin: string;
  path?: string;
  /**
   * Force article vs website. `auto` uses WP body classes + path
   * (`single-post` stays article; pages, listings, archives become website).
   */
  contentKind?: MirrorContentKind;
};

const ARTICLE_TYPES = new Set(['Article', 'NewsArticle', 'BlogPosting']);

const NON_SERVICE_PATH =
  /^\/(?:about(?:-us)?|contact(?:-us)?|privacy(?:-policy)?|terms(?:-of-(?:use|service))?|cookie-policy|disclaimer|insights|blog|search|faq)\/(?:page\/\d+\/)?$/i;

function normalizePath(raw?: string): string {
  if (!raw || raw === 'homepage') return '/';
  const trimmed = String(raw).trim();
  if (!trimmed || trimmed === '/') return '/';
  return `/${trimmed.replace(/^\/+|\/+$/g, '')}/`;
}

function bodyClassTag(html: string): string {
  return html.match(/<body\b[^>]*>/i)?.[0] ?? '';
}

function isWpPost(html: string): boolean {
  const body = bodyClassTag(html);
  return /\bsingle-post\b/i.test(body) || /\bpostid-\d+/i.test(body) || /\bpostid-\d+/i.test(body);
}

function isWpPage(html: string): boolean {
  const body = bodyClassTag(html);
  if (isWpPost(html)) return false;
  return /\bpage-id-\d+/i.test(body) || /\bpage-template/i.test(body);
}

function isListingPath(path: string): boolean {
  if (path === '/') return true;
  return /^(?:\/(?:insights|blog|category|tag|author)\/(?:page\/\d+\/)?|\/(?:category|tag|author)\/[^/]+\/(?:page\/\d+\/)?)$/i.test(
    path,
  );
}

export function isArticleContentPage(
  html: string,
  path: string,
  contentKind: MirrorContentKind = 'auto',
): boolean {
  if (contentKind === 'article') return true;
  if (contentKind === 'website') return false;
  if (isListingPath(path)) return false;
  return isWpPost(html);
}

export function isCommercialServicePage(html: string, path: string): boolean {
  if (path === '/' || isListingPath(path) || NON_SERVICE_PATH.test(path)) return false;
  return isWpPage(html);
}

export function isContactPage(path: string): boolean {
  return /^\/contact(?:-us)?\/$/i.test(path);
}

function metaContent(html: string, attr: 'property' | 'name', key: string): string {
  const re = new RegExp(
    `<meta\\s+${attr}=["']${key}["']\\s+content=["']([^"']*)["'][^>]*>|<meta\\s+content=["']([^"']*)["']\\s+${attr}=["']${key}["'][^>]*>`,
    'i',
  );
  const m = html.match(re);
  return (m?.[1] || m?.[2] || '').trim();
}

function pageTitle(html: string): string {
  return metaContent(html, 'property', 'og:title') || html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() || '';
}

function pageDescription(html: string): string {
  return (
    metaContent(html, 'property', 'og:description') ||
    metaContent(html, 'name', 'description') ||
    ''
  );
}

function asTypes(value: unknown): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value.map(String) : [String(value)];
}

function hasType(node: Record<string, unknown>, typeName: string): boolean {
  return asTypes(node['@type']).includes(typeName);
}

function uniqueTypes(types: string[]): string[] {
  return [...new Set(types.filter(Boolean))];
}

function rewriteArticleNode(node: Record<string, unknown>): Record<string, unknown> {
  const nextTypes = uniqueTypes(
    asTypes(node['@type']).map((t) => (ARTICLE_TYPES.has(t) ? 'WebPage' : t)),
  );
  const next: Record<string, unknown> = { ...node, '@type': nextTypes.length === 1 ? nextTypes[0] : nextTypes };
  if (!next.name && typeof next.headline === 'string') next.name = next.headline;
  return next;
}

function findGraph(data: unknown): { root: Record<string, unknown> | unknown[]; graph: unknown[]; kind: 'graph' | 'array' | 'single' } | null {
  if (!data || typeof data !== 'object') return null;
  const rec = data as Record<string, unknown>;
  if (Array.isArray(rec['@graph'])) {
    return { root: rec, graph: rec['@graph'] as unknown[], kind: 'graph' };
  }
  if (Array.isArray(data)) {
    return { root: data, graph: data, kind: 'array' };
  }
  return { root: rec, graph: [rec], kind: 'single' };
}

function rewriteJsonLd(
  parsed: unknown,
  opts: {
    isArticle: boolean;
    addService: boolean;
    addLocalBusiness: boolean;
    pageUrl: string;
    origin: string;
    title: string;
    description: string;
  },
): unknown {
  const found = findGraph(parsed);
  if (!found) return parsed;

  const graph = found.graph.filter((n) => n && typeof n === 'object') as Record<string, unknown>[];
  const hasWebPage = graph.some((n) => hasType(n, 'WebPage'));
  const org = graph.find((n) => hasType(n, 'Organization'));
  const orgId = typeof org?.['@id'] === 'string' ? org['@id'] : `${opts.origin}/#organization`;

  let next = graph
    .filter((n) => {
      if (opts.isArticle) return true;
      const articleLike = asTypes(n['@type']).some((t) => ARTICLE_TYPES.has(t));
      return !(articleLike && hasWebPage);
    })
    .map((n) => {
      if (opts.isArticle) return n;
      if (asTypes(n['@type']).some((t) => ARTICLE_TYPES.has(t))) return rewriteArticleNode(n);
      return n;
    });

  const hasService = next.some((n) => hasType(n, 'Service'));
  const hasLocalBusiness = next.some(
    (n) => hasType(n, 'LocalBusiness') || hasType(n, 'HomeAndConstructionBusiness'),
  );

  if (opts.addService && !hasService) {
    next.push({
      '@type': 'Service',
      '@id': `${opts.pageUrl}#service`,
      name: opts.title,
      url: opts.pageUrl,
      provider: { '@id': orgId },
      ...(opts.description ? { description: opts.description } : {}),
    });
  }

  if (opts.addLocalBusiness && !hasLocalBusiness) {
    next.push({
      '@type': 'LocalBusiness',
      '@id': `${opts.pageUrl}#localbusiness`,
      name: (typeof org?.name === 'string' && org.name) || opts.title,
      url: opts.origin,
      ...(opts.description ? { description: opts.description } : {}),
    });
  }

  if (found.kind === 'graph') {
    return { ...(found.root as Record<string, unknown>), '@graph': next };
  }
  if (found.kind === 'array') return next;
  return next[0] ?? parsed;
}

function setOgType(html: string, ogType: 'article' | 'website'): string {
  if (/<meta\b[^>]*property=["']og:type["'][^>]*>/i.test(html)) {
    return html.replace(
      /(<meta\b[^>]*property=["']og:type["'][^>]*content=["'])([^"']*)(["'][^>]*>)/i,
      `$1${ogType}$3`,
    );
  }
  return html.replace(/<\/head>/i, `<meta property="og:type" content="${ogType}" />\n</head>`);
}

/**
 * Align og:type + JSON-LD with page kind. Does not rewrite title, description,
 * canonical, or og:image.
 */
export function normalizeMirrorContentSeoHtml(
  html: string,
  options: NormalizeMirrorContentSeoOptions,
): string {
  if (!html) return html;
  const origin = String(options.siteOrigin || '').trim().replace(/\/$/, '');
  const path = normalizePath(options.path);
  const contentKind = options.contentKind ?? 'auto';
  const isArticle = isArticleContentPage(html, path, contentKind);
  const pageUrl = origin ? `${origin}${path}` : path;
  const title = pageTitle(html);
  const description = pageDescription(html);
  const addService = !isArticle && isCommercialServicePage(html, path);
  const addLocalBusiness = !isArticle && isContactPage(path);

  let out = setOgType(html, isArticle ? 'article' : 'website');

  out = out.replace(
    /(<script\b[^>]*type=["']application\/ld\+json["'][^>]*>)([\s\S]*?)(<\/script>)/gi,
    (full, open: string, body: string, close: string) => {
      const trimmed = body.trim();
      if (!trimmed) return full;
      try {
        const rewritten = rewriteJsonLd(JSON.parse(trimmed), {
          isArticle,
          addService,
          addLocalBusiness,
          pageUrl,
          origin: origin || pageUrl,
          title,
          description,
        });
        return `${open}${JSON.stringify(rewritten)}${close}`;
      } catch {
        return full;
      }
    },
  );

  return out;
}
