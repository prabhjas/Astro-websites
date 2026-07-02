import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import node from '@astrojs/node';

export default defineConfig({
  integrations: [mdx()],
  // Site stays static; only the /api/lead form endpoint runs on-demand (prerender=false).
  // Swap this adapter for your host's (Netlify/Vercel/Cloudflare) at deploy time.
  output: 'static',
  adapter: node({ mode: 'standalone' }),
  trailingSlash: 'always',
  redirects: {
    '/ac-cleaning-service-dubai/': '/',
    '/ac-installation-dubai/': '/',
    '/ac-maintenance-services-in-dubai/': '/',
    '/ac-service-dubai/': '/',
    '/ac-technician-dubai/': '/',
    '/affordable-home-renovation-dubai/': '/',
    '/bathroom-renovation-dubai/': '/',
    '/custom-furniture/': '/',
    '/electrical-services-dubai/': '/',
    '/emergency-ac-repair-dubai/': '/',
    '/flooring-renewal-services/': '/flooring-renewal-services-in-dubai/',
    '/flooring-renewal/': '/',
    '/flooring/': '/flooring-renewal-services-in-dubai/',
    '/garden-maintenance-dubai/': '/',
    '/home-automation-dubai/': '/',
    '/home-renovation/': '/home-renovation-contractors/',
    '/hvac-maintenance-dubai/': '/',
    '/interior/': '/interior-renovation/',
    '/kitchen/': '/kitchen-renovation/',
    '/lighting-services-dubai/': '/',
    '/modern-villa-design/': '/',
    '/modern-window-and-door-installation/': '/',
    '/pool-maintenance-dubai/': '/',
    '/redo-interior-renovation/': '/interior-renovation/',
    '/smart-home-automation/': '/',
    '/smart-home-renovation/': '/',
    '/villa-renovation/': '/villa-renovation-dubai/',
  },
  // Match the live site's 301s for old/removed post slugs linked from article bodies.
  devToolbar: { enabled: false },
  // Mirror pages embed the site's own already-minified CSS; don't re-minify it
  // (the strict lightningcss engine rejects some embedded modern syntax).
  vite: { build: { cssMinify: false } },
});
