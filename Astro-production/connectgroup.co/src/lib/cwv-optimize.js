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
  const norm = String(path || '/').replace(/\/+$/, '') || '/';
  const route = manifest().routes[norm];
  if (!route) return html;
  const crit = critical(route.slug);
  if (!crit) return html;

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
  head += `<style id="cwv-critical">${crit}</style>`;
  html = html.replace(/<head\b([^>]*)>/i, (m) => m + head);
  return html;
}
