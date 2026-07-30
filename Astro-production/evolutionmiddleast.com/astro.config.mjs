// @ts-check
import node from '@astrojs/node';
import { defineConfig } from 'astro/config';

/** Canonical production origin — prefer PUBLIC_SITE_URL. */
const siteUrl = (
  process.env.PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  'https://www.evolutionmiddleast.com'
)
  .trim()
  .replace(/\/$/, '');

// Rank Math–style robots/sitemaps live under src/pages/
// (robots.txt.ts, sitemap_index.xml.ts, page-sitemap.xml.ts, post-sitemap.xml.ts).
// Do not add @astrojs/sitemap — it would emit a competing sitemap-index.xml.
// Node adapter enables SSR endpoints like POST /api/contact while keeping pages static.
export default defineConfig({
  site: siteUrl,
  output: 'static',
  adapter: node({ mode: 'standalone' }),
  // Caddy terminates TLS and reverse-proxies to this Node server over plain HTTP.
  // Without allowedDomains, Astro ignores X-Forwarded-Proto, builds the request URL
  // as http://, and its checkOrigin middleware then rejects every HTTPS visitor's
  // form POST with "Cross-site POST form submissions are forbidden" (403).
  // Listing the domains here lets Astro trust the forwarded proto/host from Caddy.
  security: {
    allowedDomains: [
      { hostname: 'www.evolutionmiddleast.com', protocol: 'https' },
      { hostname: 'evolutionmiddleast.com', protocol: 'https' },
      { hostname: 'www.evolutionmiddleast.com', protocol: 'http' },
      { hostname: 'evolutionmiddleast.com', protocol: 'http' },
    ],
  },
  build: {
    format: 'directory',
  },
  vite: {
    assetsInclude: ['**/*.cleaned.html'],
  },
});
