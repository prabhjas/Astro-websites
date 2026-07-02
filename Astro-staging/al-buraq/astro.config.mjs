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
  // Match the live site's 301s for old/removed post slugs linked from article bodies.
  redirects: {
    '/dubai-e-trader-license/': '/e-trader-license-dubai/',
    '/dubai-police-complaint-number-guide/': '/',
  },
  devToolbar: { enabled: false },
  // Mirror pages embed the site's own already-minified CSS; don't re-minify it
  // (the strict lightningcss engine rejects some embedded modern syntax).
  vite: { build: { cssMinify: false } },
});
