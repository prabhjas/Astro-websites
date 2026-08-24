import { defineConfig, fontProviders } from 'astro/config';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';

const siteUrl = (
  process.env.PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  'https://iberiaworkforce.com'
)
  .trim()
  .replace(/\/$/, '');

let siteHost = 'iberiaworkforce.com';
try {
  siteHost = new URL(siteUrl).hostname;
} catch {
  /* keep default */
}

export default defineConfig({
  site: siteUrl,
  output: 'static',
  adapter: node({ mode: 'standalone' }),
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  security: {
    checkOrigin: true,
    allowedDomains: [
      { hostname: siteHost, protocol: 'https' },
      { hostname: siteHost, protocol: 'http' },
      { hostname: 'www.iberiaworkforce.com', protocol: 'https' },
      { hostname: 'www.iberiaworkforce.com', protocol: 'http' },
      { hostname: 'iberiaworkforce.com', protocol: 'https' },
      { hostname: 'iberiaworkforce.com', protocol: 'http' },
      { hostname: 'localhost', protocol: 'http' },
      { hostname: '127.0.0.1', protocol: 'http' },
    ],
  },
  redirects: {
    '/es/services/eor': '/es/employer-of-record/spain/',
    '/es/services/payroll': '/es/payroll-outsourcing/spain/',
    '/es/services/labour-legal': '/es/services/',
    '/es/services/compliance': '/es/services/',
    '/es/services/staff-outsourcing': '/es/staff-outsourcing/spain/',
    '/services/eor': '/employer-of-record/spain/',
    '/services/payroll': '/payroll-outsourcing/spain/',
    '/services/labour-legal': '/services/',
    '/services/compliance': '/services/',
    '/services/staff-outsourcing': '/staff-outsourcing/spain/',
  },
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
      config: {
        webp: { quality: 92, effort: 6 },
      },
    },
  },
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Pliant',
      cssVariable: '--font-pliant',
      weights: [400, 500, 600, 700],
      styles: ['normal'],
      subsets: ['latin', 'latin-ext'],
      fallbacks: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
    },
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  devToolbar: { enabled: false },
});
