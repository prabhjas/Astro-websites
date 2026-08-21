import node from '@astrojs/node';
import { defineConfig } from 'astro/config';

// The fleet registry uses the apex host as its stable service identity, while
// Caddy redirects that host to the public www canonical. Keep generated SEO
// URLs on the public canonical even though the isolated builder supplies the
// registry host through PUBLIC_SITE_URL.
const siteUrl = 'https://www.connectresourcesint.com';

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
