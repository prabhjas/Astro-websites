import node from '@astrojs/node';
import { defineConfig } from 'astro/config';

const siteUrl = (process.env.PUBLIC_SITE_URL || process.env.SITE_URL || 'https://cbss.example.com')
  .trim()
  .replace(/\/$/, '');

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
      { hostname: 'www.cbss.ae', protocol: 'https' },
      { hostname: 'cbss.ae', protocol: 'https' },
      { hostname: 'www.cbss.ae', protocol: 'http' },
      { hostname: 'cbss.ae', protocol: 'http' },
    ],
  },
  build: {
    format: 'directory',
  },
});
