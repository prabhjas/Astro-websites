// @ts-check
import node from '@astrojs/node';
import { defineConfig } from 'astro/config';

/** Canonical production origin — prefer PUBLIC_SITE_URL. */
const siteUrl = (
  process.env.PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  'https://freelancerdxb.com'
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
  trailingSlash: 'always',
  adapter: node({ mode: 'standalone' }),
  // Caddy terminates TLS and reverse-proxies to Node over plain HTTP.
  // Without allowedDomains, Astro ignores X-Forwarded-Proto, builds the
  // request URL as http://, and checkOrigin rejects HTTPS visitors' form
  // POSTs with "Cross-site POST form submissions are forbidden" (403).
  security: {
    checkOrigin: true,
    allowedDomains: [
      { hostname: 'freelancerdxb.com', protocol: 'https' },
      { hostname: 'www.freelancerdxb.com', protocol: 'https' },
      { hostname: 'freelancerdxb.com', protocol: 'http' },
      { hostname: 'www.freelancerdxb.com', protocol: 'http' },
      { hostname: '127.0.0.1', protocol: 'http' },
      { hostname: 'localhost', protocol: 'http' },
    ],
  },
  build: {
    format: 'directory',
  },
  vite: {
    assetsInclude: ['**/*.cleaned.html'],
  },
});
