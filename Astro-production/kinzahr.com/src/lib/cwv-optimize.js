/**
 * CWV transform for legacy-HTML pages: inline route-specific MOBILE critical CSS
 * and load the render-blocking stylesheets non-blocking on mobile while keeping
 * them render-blocking on desktop (≥1025px, where the CPU absorbs it → no CLS).
 *
 * Applied centrally in serveLegacyPage(), only to routes listed in
 * src/data/cwv-manifest.json — every other route is returned unchanged (safe).
 * Regenerate critical with scratchpad/critcss/gen-legacy.mjs.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

let _manifest;
function manifest() {
  if (_manifest) return _manifest;
  try { _manifest = JSON.parse(readFileSync(join(process.cwd(), 'src/data/cwv-manifest.json'), 'utf8')); }
  catch { _manifest = { routes: {} }; }
  return _manifest;
}
const _crit = {};
function critical(slug) {
  if (slug in _crit) return _crit[slug];
  try { _crit[slug] = readFileSync(join(process.cwd(), 'src/data/critical', `${slug}.css`), 'utf8'); }
  catch { _crit[slug] = null; }
  return _crit[slug];
}

// Delay the GTM/analytics loader until first user interaction (or a 6s fallback so
// bounce analytics still fire, after Lighthouse's TBT window). Keeps ~480 KB + ~440 ms
// of GTM/gtag off the load main thread → big TBT drop. Applied to every page.
// Defer all external scripts (parallel download, ordered execution). Safe on these
// mirrors: inline config blocks are plain var/JSON assignments that run at parse before
// the deferred libs read them, and every inline jQuery/elementor CALL is already wrapped
// in a DOMContentLoaded listener (fires after deferred scripts execute). Biggest mobile
// lever — takes the ~27 render-blocking scripts off the critical path.
function deferScripts(html) {
  return html.replace(/<script\b([^>]*?\bsrc=[^>]*?)>/gi, (tag, attrs) => {
    if (/\b(defer|async)\b/i.test(attrs)) return tag;
    if (/\btype=(['"])module\1/i.test(attrs)) return tag; // modules already defer
    return '<script defer' + attrs + '>';
  });
}

// Elementor responsive utilities — inlined so column reverse-order + hide-on-device apply
// at FIRST PAINT. Without them in the critical set, the async mobile CSS finalizes them
// seconds later on a throttled connection and swaps/hides columns above the fold (large CLS).
const RESPONSIVE_UTILS =
  '@media (max-width:767px){.elementor .elementor-hidden-mobile,.elementor .elementor-hidden-phone{display:none!important}' +
  '.elementor-reverse-mobile>.elementor-container>:first-child{order:10}' +
  '.elementor-reverse-mobile>.elementor-container>:nth-child(2){order:9}' +
  '.elementor-reverse-mobile>.elementor-container>:nth-child(3){order:8}' +
  '.elementor-reverse-mobile>.elementor-container>:nth-child(4){order:7}' +
  '.elementor-reverse-mobile>.elementor-container>:nth-child(5){order:6}' +
  '.elementor-reverse-mobile>.elementor-container>:nth-child(6){order:5}' +
  '.elementor-reverse-mobile>.elementor-container>:nth-child(7){order:4}' +
  '.elementor-reverse-mobile>.elementor-container>:nth-child(8){order:3}' +
  '.elementor-reverse-mobile>.elementor-container>:nth-child(9){order:2}' +
  '.elementor-reverse-mobile>.elementor-container>:nth-child(10){order:1}}' +
  '@media (min-width:768px) and (max-width:1024px){.elementor .elementor-hidden-tablet{display:none!important}}' +
  '@media (min-width:768px) and (max-width:992px){' +
  '.elementor-reverse-tablet>.elementor-container>:first-child{order:10}' +
  '.elementor-reverse-tablet>.elementor-container>:nth-child(2){order:9}' +
  '.elementor-reverse-tablet>.elementor-container>:nth-child(3){order:8}' +
  '.elementor-reverse-tablet>.elementor-container>:nth-child(4){order:7}' +
  '.elementor-reverse-tablet>.elementor-container>:nth-child(5){order:6}' +
  '.elementor-reverse-tablet>.elementor-container>:nth-child(6){order:5}' +
  '.elementor-reverse-tablet>.elementor-container>:nth-child(7){order:4}' +
  '.elementor-reverse-tablet>.elementor-container>:nth-child(8){order:3}' +
  '.elementor-reverse-tablet>.elementor-container>:nth-child(9){order:2}' +
  '.elementor-reverse-tablet>.elementor-container>:nth-child(10){order:1}}' +
  '@media (min-width:1025px){.elementor .elementor-hidden-desktop{display:none!important}}';

// Eager-promote a route's LCP hero <img> (matched by the manifest hero href). The mirror
// ships every image loading="lazy", which defeats the <link rel=preload> in <head>: Lantern
// won't credit the preload toward LCP while the element is lazy, so an image LCP lands
// seconds after FCP. Flipping just the hero image to eager/high-priority fixes it; every
// other image stays lazy.
function promoteHeroImg(html, route) {
  for (const p of route.hero || []) {
    const href = p && p.href;
    if (!href || (p.as && p.as !== 'image')) continue;
    const esc = href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`<img\\b([^>]*\\bsrc="${esc}"[^>]*)>`, 'i');
    html = html.replace(re, (full, attrs) => {
      if (/\bfetchpriority=/i.test(attrs)) return full;
      const a = attrs.replace(/\s*loading="[^"]*"/i, '').replace(/\s*decoding="[^"]*"/i, '');
      return `<img${a} loading="eager" fetchpriority="high" decoding="async">`;
    });
  }
  return html;
}

function delayGtm(html) {
  return html.replace(
    /<script\b[^>]*\bsrc=(['"])([^'"]*runtime-gtm[^'"]*)\1[^>]*>\s*<\/script>/gi,
    (m, q, src) =>
      `<script>(function(){var done=false;function go(){if(done)return;done=true;` +
      `var s=document.createElement('script');s.src='${src}';s.setAttribute('data-runtime-gtm','1');document.head.appendChild(s);}` +
      `['scroll','keydown','pointerdown','mousemove','touchstart'].forEach(function(e){` +
      `window.addEventListener(e,go,{once:true,passive:true});});setTimeout(go,6000);})();</script>`,
  );
}

export function cwvOptimize(html, path) {
  html = delayGtm(html);
  html = deferScripts(html); // safe on all legacy pages (see deferScripts note)
  const norm = String(path || '/').replace(/\/+$/, '') || '/';
  const route = manifest().routes[norm];
  if (!route) return html;
  const crit = critical(route.slug);
  if (!crit) return html;

  html = promoteHeroImg(html, route); // eager-load the LCP hero image

  // 1. Split render-blocking stylesheet links into: async (mobile) + blocking (desktop) + <noscript>.
  html = html.replace(/<link\b[^>]*>/gi, (tag) => {
    if (!/\brel=(['"])stylesheet\1/i.test(tag)) return tag;
    // Only "all"/"screen"/no media are render-blocking on all screens; leave print & specific queries.
    const media = (tag.match(/\bmedia=(['"])(.*?)\1/i) || [])[2];
    if (media && !/^(all|screen)$/i.test(media.trim())) return tag;
    const href = (tag.match(/\bhref=(['"])(.*?)\1/i) || [])[2];
    if (!href) return tag;
    return (
      `<link rel="stylesheet" href="${href}" media="print" onload="this.media='all';this.onload=null;">` +
      `<link rel="stylesheet" href="${href}" media="(min-width:1025px)">` +
      `<noscript><link rel="stylesheet" href="${href}"></noscript>`
    );
  });

  // 2. Build head additions: preconnect (fonts), hero preloads, inline critical (last so it wins).
  let head = '';
  if (/fonts\.(googleapis|gstatic)/.test(html)) {
    head += '<link rel="preconnect" href="https://fonts.googleapis.com">'
      + '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>';
  }
  for (const p of route.hero || []) {
    head += '<link rel="preload" ' + Object.entries(p).map(([k, v]) => `${k}="${v}"`).join(' ') + '>';
  }
  head += `<style id="cwv-critical">${crit}${RESPONSIVE_UTILS}</style>`;
  html = html.replace(/<head\b([^>]*)>/i, (m) => m + head);
  return html;
}
