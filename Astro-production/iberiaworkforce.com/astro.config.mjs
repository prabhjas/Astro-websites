import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';

// Public site URL — used for canonical links, hreflang and the sitemap.
const SITE = 'https://iberiaworkforce.com';

export default defineConfig({
  site: SITE,
  // Static output for speed/SEO; only /api/lead runs on-demand (prerender = false).
  output: 'static',
  adapter: node({ mode: 'standalone' }),
  trailingSlash: 'always',
  integrations: [
    sitemap({
      // Tell search engines EN (root) and ES (/es/) are translations of each other.
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en', es: 'es' },
      },
    }),
  ],
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es'],
    routing: { prefixDefaultLocale: false },
  },
  devToolbar: { enabled: false },
});
