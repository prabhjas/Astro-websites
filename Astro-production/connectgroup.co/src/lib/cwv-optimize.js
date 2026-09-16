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
function purged(slug) {
  if (slug in _crit) return _crit[slug];
  try { _crit[slug] = readFileSync(join(process.cwd(), 'src/data/critical', `${slug}.purged.css`), 'utf8'); }
  catch { _crit[slug] = null; }
  return _crit[slug];
}

// Delay the GTM/analytics loader until first user interaction (or a 6s fallback so
// bounce analytics still fire, after Lighthouse's TBT window). Keeps ~480 KB + ~440 ms
// of GTM/gtag off the load main thread → big TBT drop. Applied to every page.
// Elementor hosted background videos (the mobile hero on some pages) autoplay a ~1 MB mp4
// with no poster → the <video> is the LCP element and only "paints" after the whole file
// downloads (mobile LCP 30s+). Give each background <video> a poster frame (extracted from
// the mp4, ~3–23 KB) so it paints instantly, and preload="none" so the mp4 isn't fetched
// eagerly. The video still autoplays once buffered; the poster covers the gap. Posters live
// in /wp-content/uploads/video-posters/<name>.webp.
// Inlined so hide-on-device applies at first paint (the purged bundle is render-blocking so
// this is belt-and-suspenders, but harmless and cheap).
const RESPONSIVE_UTILS =
  '@media (max-width:767px){.elementor .elementor-hidden-mobile,.elementor .elementor-hidden-phone{display:none!important}}' +
  '@media (min-width:768px) and (max-width:1024px){.elementor .elementor-hidden-tablet{display:none!important}}' +
  '@media (min-width:1025px){.elementor .elementor-hidden-desktop{display:none!important}}';

function videoFacade(html) {
  const links = [...html.matchAll(/background_video_link&quot;:&quot;([^&]*?\.mp4)/gi)]
    .map((m) => m[1].replace(/\\\//g, '/'));
  if (!links.length) return html;
  let i = 0;
  const posters = [];
  html = html.replace(/<video\b([^>]*elementor-background-video-hosted[^>]*)>/gi, (full, attrs) => {
    const mp4 = links[i++];
    if (!mp4) return full;
    const name = mp4.split('/').pop().replace(/\.mp4$/, '');
    const poster = `/wp-content/uploads/video-posters/${name}.webp`;
    posters.push(poster);
    let a = attrs.replace(/\s*preload="[^"]*"/i, '');
    if (!/\bposter=/i.test(a)) a += ` poster="${poster}"`;
    a += ' preload="none"';
    return `<video${a}>`;
  });
  // Preload the first background-video poster (the mobile hero on these pages) so it paints
  // as LCP sooner — mobile-scoped so it doesn't waste bytes on desktop (where the video plays).
  if (posters.length) {
    html = html.replace(/<head\b([^>]*)>/i,
      (m) => m + `<link rel="preload" as="image" href="${posters[0]}" media="(max-width:1024px)" fetchpriority="high">`);
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
  html = videoFacade(html); // poster + preload=none on background videos (all pages)
  const norm = String(path || '/').replace(/\/+$/, '') || '/';
  const route = manifest().routes[norm];
  if (!route) return html;

  // Hero preloads (image LCP): apply whether or not this route has purged CSS. These are
  // CSS-background heroes discovered late (after CSS parse); preloading pulls LCP earlier.
  if (route.hero && route.hero.length) {
    const pre = route.hero
      .map((p) => '<link rel="preload" ' + Object.entries(p).map(([k, v]) => `${k}="${v}"`).join(' ') + '>')
      .join('');
    html = html.replace(/<head\b([^>]*)>/i, (m) => m + pre);
  }

  const css = purged(route.slug);
  if (!css) return html;

  // Replace the big render-blocking inline theme CSS (~350–430 KB, mostly unused pixfort/
  // Elementor rules) with the PurgeCSS'd subset for this page (~1/3 the size). Still
  // render-blocking → identical layout, NO reflow/CLS — just far less to parse → faster FCP.
  // The small blocks (<2KB) are left as-is.
  let removed = 0;
  html = html.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (full, attrs, body) => {
    if (/\bmedia=/i.test(attrs)) return full;   // scoped (e.g. print) — leave
    if (body.length < 2048) return full;         // tiny — cheap, keep
    removed++;
    return removed === 1
      ? `<style id="cg-purged">${css}</style>` // first big block → the purged bundle
      : '';                                      // drop the rest (their rules are in the bundle)
  });

  // Head additions: font preconnect + responsive utils (hero preloads already injected above).
  let head = '';
  if (/fonts\.(googleapis|gstatic)/.test(html)) {
    head += '<link rel="preconnect" href="https://fonts.googleapis.com">'
      + '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>';
  }
  head += `<style id="cwv-resp">${RESPONSIVE_UTILS}</style>`;
  html = html.replace(/<head\b([^>]*)>/i, (m) => m + head);
  return html;
}
