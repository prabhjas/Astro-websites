#!/usr/bin/env node
/**
 * Concatenate the shared live-order stylesheets (src/data/live-css-order.json)
 * into a single render-blocking bundle: public/css/_head-bundle.css.
 *
 * Why: the WP/Elementor mirror ships ~71 tiny stylesheets. Individually a few KB,
 * but each is a render-blocking request that delays FCP. Bundling keeps identical
 * rules + order (no FOUC, CLS unchanged) while cutting ~71 requests to one.
 *
 * Handles:
 *   - @import (Google Fonts) hoisted to the top (CSS requires @import first)
 *   - @charset stripped (bundle is UTF-8)
 *   - relative url(...) rebased to absolute web paths so fonts/images still resolve
 *
 * Re-run whenever live-css-order.json or any listed CSS changes:
 *   node scripts/build-css-head-bundle.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const PUBLIC = join(SITE, 'public');
const OUT = join(PUBLIC, 'css/_head-bundle.css');

const order = JSON.parse(readFileSync(join(SITE, 'src/data/live-css-order.json'), 'utf8'));
const list = Array.isArray(order) ? order : order.css || order.order;

const imports = [];
const bodies = [];

function rebaseUrls(css, hrefDir) {
  return css.replace(/url\(\s*(['"]?)([^)'"]+)\1\s*\)/g, (m, q, val) => {
    const v = val.trim();
    if (/^(\/|https?:|data:|#)/.test(v)) return m;
    const abs = posix.normalize(posix.join(hrefDir, v));
    return `url(${q}${abs}${q})`;
  });
}

let missing = 0;
for (const href of list) {
  const p = join(PUBLIC, href.replace(/^\//, ''));
  if (!existsSync(p)) {
    console.warn('  skip missing:', href);
    missing++;
    continue;
  }
  let css = readFileSync(p, 'utf8');
  const hrefDir = posix.dirname(href);
  css = css.replace(/@charset[^;]+;/gi, '');
  // Self-hosted @font-face ship font-display:auto (FOIT) — the hero heading (LCP)
  // stays invisible until the font loads. swap paints it immediately in fallback.
  css = css.replace(/font-display\s*:\s*auto/gi, 'font-display:swap');
  // NB: Google Fonts CSS2 URLs contain ';' *inside* url(...) (wght@0,200;0,300;…),
  // so match through the closing ')' before the terminating ';' — not the first ';'.
  css = css.replace(/@import\s+url\([^)]*\)[^;]*;/gi, (imp) => {
    imports.push(imp.trim());
    return '';
  });
  css = rebaseUrls(css, hrefDir);
  bodies.push(`/* ${href} */\n${css.trim()}\n`);
}

const out = `${imports.join('\n')}\n${bodies.join('\n')}`;
writeFileSync(OUT, out);
console.log(
  `bundle → public/css/_head-bundle.css : ${(out.length / 1024) | 0} KB from ${
    list.length - missing
  } files, ${imports.length} hoisted @import(s)`,
);
