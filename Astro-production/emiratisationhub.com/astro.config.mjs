import node from '@astrojs/node';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { defineConfig } from 'astro/config';
import { parse } from 'yaml';

const root = dirname(fileURLToPath(import.meta.url));
const redirectsFile = join(root, 'src/data/redirects.yml');

/** Canonical production origin — prefer PUBLIC_SITE_URL; never hardcode only in SEO endpoints. */
const siteUrl = (process.env.PUBLIC_SITE_URL || process.env.SITE_URL || 'https://emiratisationhub.com')
  .trim()
  .replace(/\/$/, '');

function loadRedirects() {
  try {
    const data = parse(readFileSync(redirectsFile, 'utf8')) ?? {};
    const list = Array.isArray(data.redirects) ? data.redirects : [];
    /** @type {Record<string, string | { status: number; destination: string }>} */
    const map = {};
    for (const row of list) {
      if (!row?.from || !row?.to) continue;
      const status = row.status ?? 301;
      map[row.from] = { status, destination: row.to };
    }
    return map;
  } catch {
    return {};
  }
}

// https://astro.build/config
// Rank Math–style robots/sitemaps are custom endpoints under src/pages/
// (robots.txt.ts, sitemap_index.xml.ts, page-sitemap*.xml.ts, post-sitemap*.xml.ts).
// Do not add @astrojs/sitemap — it would emit a competing sitemap-index.xml.
export default defineConfig({
  site: siteUrl,
  trailingSlash: 'always',
  output: 'static',
  adapter: node({ mode: 'standalone' }),
  security: {
    checkOrigin: true,
    allowedDomains: [
      { hostname: 'emiratisationhub.com', protocol: 'https' },
      { hostname: 'www.emiratisationhub.com', protocol: 'https' },
      { hostname: '127.0.0.1', protocol: 'http' },
      { hostname: 'localhost', protocol: 'http' },
    ],
  },
  redirects: loadRedirects(),
  build: {
    format: 'directory',
  },
  vite: {
    assetsInclude: ['**/*.cleaned.html'],
  },
});
