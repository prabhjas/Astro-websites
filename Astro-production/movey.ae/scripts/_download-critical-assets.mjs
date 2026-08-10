#!/usr/bin/env node
/**
 * Download critical CSS/JS from live movey.ae when local files are missing.
 * Used for QA parity (original paths + Elementor/ElementsKit widgets).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIVE = 'https://movey.ae';
const LOCAL = process.env.LOCAL_ORIGIN || 'http://127.0.0.1:5104';

const need = [
  '/wp-content/plugins/header-footer-elementor/inc/widgets-css/frontend.css',
  '/wp-content/plugins/header-footer-elementor/assets/css/header-footer-elementor.css',
  '/wp-content/plugins/contact-form-7/includes/css/styles.css',
  '/wp-content/plugins/elementor/assets/lib/eicons/css/elementor-icons.min.css',
  '/wp-content/plugins/elementor/assets/lib/swiper/v8/css/swiper.min.css',
  '/wp-content/plugins/elementor/assets/lib/font-awesome/css/brands.css',
  '/wp-content/plugins/elementor/assets/lib/font-awesome/css/fontawesome.css',
  '/wp-content/plugins/elementor/assets/lib/font-awesome/css/solid.css',
  '/wp-content/plugins/elementor/assets/lib/font-awesome/css/solid.min.css',
  '/wp-content/plugins/elementor/assets/lib/font-awesome/css/brands.min.css',
  '/wp-content/plugins/elementor/assets/lib/font-awesome/css/regular.min.css',
  '/wp-content/plugins/bloglentor-for-elementor/assets/lib/slick/slick.css',
  '/wp-content/plugins/bloglentor-for-elementor/assets/lib/slick/slick-theme.css',
  '/wp-content/plugins/bloglentor-for-elementor/assets/css/main.css',
  '/wp-content/plugins/post-grid-elementor-addon/assets/css/main.css',
  '/wp-content/plugins/elementskit-lite/widgets/init/assets/css/widget-styles.css',
  '/wp-content/plugins/elementskit-lite/widgets/init/assets/css/responsive.css',
  '/wp-content/plugins/elementskit-lite/modules/elementskit-icon-pack/assets/css/ekiticons.css',
  '/wp-content/plugins/elementskit-lite/modules/elementskit-icon-pack/assets/fonts/elementskit.woff',
  '/wp-content/plugins/elementor/assets/lib/eicons/fonts/eicons.woff2',
  '/wp-content/plugins/elementor/assets/lib/font-awesome/webfonts/fa-solid-900.woff2',
  '/wp-content/plugins/elementor/assets/lib/font-awesome/webfonts/fa-brands-400.woff2',
  '/wp-content/plugins/elementor/assets/lib/font-awesome/webfonts/fa-regular-400.woff2',
  '/wp-content/uploads/essential-addons-elementor/eael-5709.css',
  '/wp-content/uploads/elementor/google-fonts/css/roboto.css',
  '/wp-content/uploads/elementor/google-fonts/css/robotoslab.css',
  '/wp-content/uploads/elementor/google-fonts/css/syne.css',
  '/wp-content/uploads/elementor/google-fonts/css/manrope.css',
  '/wp-content/plugins/elementskit-lite/widgets/init/assets/js/widget-scripts.js',
  '/wp-content/plugins/elementskit-lite/widgets/init/assets/js/widgets/core.js',
  '/wp-content/plugins/elementskit-lite/widgets/init/assets/js/widgets/testimonial.js',
  '/wp-content/uploads/essential-addons-elementor/eael-5709.js',
  '/wp-content/plugins/contact-form-7/includes/js/index.js',
  '/wp-content/plugins/contact-form-7/includes/swv/js/index.js',
];

async function checkLocalRefs() {
  const html = await (await fetch(`${LOCAL}/`)).text();
  const urls = new Set();
  for (const m of html.matchAll(/(?:href|src)=["']([^"']+\.(?:css|js)(?:\?[^"']*)?)["']/gi)) {
    let u = m[1].split('?')[0];
    if (u.startsWith('http')) {
      try {
        u = new URL(u).pathname;
      } catch {
        continue;
      }
    }
    if (u.startsWith('/')) urls.add(u);
  }
  const bad = [];
  let ok = 0;
  for (const u of [...urls].sort()) {
    const r = await fetch(LOCAL + u, { method: 'HEAD' });
    if (r.status === 200) ok++;
    else bad.push([u, r.status]);
  }
  console.log({ cssJsOk: ok, cssJsBad: bad.length });
  for (const [u, s] of bad) console.log('BAD', u, s);
  return bad;
}

async function downloadNeed() {
  let saved = 0;
  let skipped = 0;
  const failed = [];
  for (const rel of need) {
    const dest = path.join(ROOT, 'public', rel.replace(/^\//, ''));
    if (fs.existsSync(dest) && fs.statSync(dest).size > 20) {
      skipped++;
      continue;
    }
    try {
      const r = await fetch(LIVE + rel, { headers: { 'User-Agent': 'KPM-Astro-QA' } });
      if (!r.ok) {
        failed.push([rel, r.status]);
        continue;
      }
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
      saved++;
      console.log('saved', rel, fs.statSync(dest).size);
    } catch (e) {
      failed.push([rel, e.message]);
    }
  }
  console.log({ saved, skipped, failed: failed.length });
  for (const f of failed.slice(0, 30)) console.log('fail', f);
}

await checkLocalRefs();
await downloadNeed();
await checkLocalRefs();
