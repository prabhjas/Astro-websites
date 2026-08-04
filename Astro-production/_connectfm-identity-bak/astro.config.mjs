import node from '@astrojs/node';
import { defineConfig } from 'astro/config';

const siteUrl = (process.env.PUBLIC_SITE_URL || process.env.SITE_URL || 'https://connectfm.ae')
  .trim()
  .replace(/\/$/, '');

let siteHost = 'connectfm.ae';
try {
  siteHost = new URL(siteUrl).hostname;
} catch {
  /* keep default */
}

export default defineConfig({
  site: siteUrl,
  output: 'static',
  adapter: node({ mode: 'standalone' }),
  build: {
    format: 'directory',
  },
  security: {
    checkOrigin: true,
    allowedDomains: [
      { hostname: siteHost, protocol: 'https' },
      { hostname: siteHost, protocol: 'http' },
      { hostname: 'www.connectfm.ae', protocol: 'https' },
      { hostname: 'www.connectfm.ae', protocol: 'http' },
      { hostname: 'connectfm.ae', protocol: 'https' },
      { hostname: 'connectfm.ae', protocol: 'http' },
      { hostname: 'localhost', protocol: 'http' },
      { hostname: '127.0.0.1', protocol: 'http' },
    ],
  },
});
