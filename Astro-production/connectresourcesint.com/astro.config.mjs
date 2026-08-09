import node from '@astrojs/node';
import { defineConfig } from 'astro/config';

const siteUrl = (process.env.PUBLIC_SITE_URL || 'https://www.connectresourcesint.com')
  .trim()
  .replace(/\/$/, '');

export default defineConfig({
  site: siteUrl,
  trailingSlash: 'always',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  security: {
    checkOrigin: true,
    allowedDomains: [
      { hostname: 'connectresourcesint.com', protocol: 'https' },
      { hostname: 'www.connectresourcesint.com', protocol: 'https' },
      { hostname: 'connectresourcesint.com', protocol: 'http' },
      { hostname: 'www.connectresourcesint.com', protocol: 'http' },
      { hostname: '127.0.0.1', protocol: 'http' },
      { hostname: 'localhost', protocol: 'http' }
    ]
  },
  build: {
    format: 'directory'
  }
});
