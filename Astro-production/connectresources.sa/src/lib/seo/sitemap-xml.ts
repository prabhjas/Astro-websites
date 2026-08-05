export type SitemapEntry = {
  url: string;
  lastmod?: string;
  changefreq?: string;
  priority?: number;
  type?: 'page' | 'post';
};

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function renderUrlSet(entries: SitemapEntry[]): string {
  const body = entries
    .map((entry) => {
      const lines = [`  <url>`, `    <loc>${escapeXml(entry.url)}</loc>`];
      if (entry.lastmod) lines.push(`    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`);
      if (entry.changefreq) lines.push(`    <changefreq>${escapeXml(entry.changefreq)}</changefreq>`);
      if (typeof entry.priority === 'number' && Number.isFinite(entry.priority)) {
        lines.push(`    <priority>${entry.priority}</priority>`);
      }
      lines.push(`  </url>`);
      return lines.join('\n');
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export type SitemapIndexItem = {
  loc: string;
  lastmod?: string;
};

export function renderSitemapIndex(items: SitemapIndexItem[]): string {
  const body = items
    .map((item) => {
      const lines = [`  <sitemap>`, `    <loc>${escapeXml(item.loc)}</loc>`];
      if (item.lastmod) lines.push(`    <lastmod>${escapeXml(item.lastmod)}</lastmod>`);
      lines.push(`  </sitemap>`);
      return lines.join('\n');
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`;
}

export function buildIndexItemsFromChunks(
  siteOrigin: string,
  pageChunks: SitemapEntry[][],
  postChunks: SitemapEntry[][],
  chunkFilename: (prefix: 'page' | 'post', index: number) => string,
): SitemapIndexItem[] {
  const origin = siteOrigin.replace(/\/$/, '');
  const items: SitemapIndexItem[] = [];

  const newest = (chunk: SitemapEntry[]) =>
    chunk
      .map((e) => e.lastmod)
      .filter(Boolean)
      .sort()
      .at(-1);

  pageChunks.forEach((chunk, index) => {
    if (chunk.length === 0) return;
    items.push({
      loc: `${origin}/${chunkFilename('page', index)}`,
      lastmod: newest(chunk),
    });
  });

  postChunks.forEach((chunk, index) => {
    if (chunk.length === 0) return;
    items.push({
      loc: `${origin}/${chunkFilename('post', index)}`,
      lastmod: newest(chunk),
    });
  });

  return items;
}

export function renderRobotsTxt(
  siteOrigin: string,
  disallowPaths: readonly string[] = [],
): string {
  const origin = siteOrigin.replace(/\/$/, '');
  const disallow =
    disallowPaths.length > 0
      ? disallowPaths.map((p) => `Disallow: ${p}`)
      : ['Disallow:'];
  return ['User-agent: *', ...disallow, '', `Sitemap: ${origin}/sitemap_index.xml`, ''].join(
    '\n',
  );
}

export function xmlResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0',
    },
  });
}

export function textResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0',
    },
  });
}
