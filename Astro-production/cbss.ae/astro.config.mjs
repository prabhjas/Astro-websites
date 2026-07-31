import node from '@astrojs/node';
import { defineConfig } from 'astro/config';

const siteUrl = (process.env.PUBLIC_SITE_URL || process.env.SITE_URL || 'https://www.cbss.ae')
  .trim()
  .replace(/\/$/, '');

export default defineConfig({
  site: siteUrl,
  output: 'static',
  adapter: node({ mode: 'standalone' }),
  build: {
    format: 'directory',
  },
  security: {
    allowedDomains: [
      { hostname: 'www.cbss.ae', protocol: 'https' },
      { hostname: 'cbss.ae', protocol: 'https' },
      { hostname: 'www.cbss.ae', protocol: 'http' },
      { hostname: 'cbss.ae', protocol: 'http' },
    ],
  },
});
