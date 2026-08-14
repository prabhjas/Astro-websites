export const RUNTIME_GTM_LOADER_SCRIPT = `(() => {
  if (window.__runtimeGtmLoaderInstalled) return;
  window.__runtimeGtmLoaderInstalled = true;
  window.dataLayer = window.dataLayer || [];

  const src = '/runtime-gtm.js';
  let scheduled = false;

  function findExistingRuntimeScript() {
    return Array.from(document.scripts || []).some((script) => {
      const currentSrc = script.getAttribute('src') || '';
      return currentSrc === src || currentSrc.endsWith(src);
    });
  }

  function load(reason) {
    if (scheduled || window.__runtimeGtmLoaded || findExistingRuntimeScript()) return;
    scheduled = true;
    try {
      window.dataLayer.push({
        event: 'runtime_gtm_loader_start',
        runtimeGtmLoadReason: reason || 'auto',
      });
    } catch (_) {}
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.defer = true;
    script.setAttribute('data-runtime-gtm', '1');
    script.setAttribute('data-runtime-gtm-reason', reason || 'auto');
    (document.head || document.documentElement).appendChild(script);
  }

  function cleanup() {
    interactionEvents.forEach((eventName) => {
      window.removeEventListener(eventName, onInteraction, true);
      document.removeEventListener(eventName, onInteraction, true);
    });
    document.removeEventListener('submit', onInteraction, true);
  }

  function onInteraction(event) {
    cleanup();
    load(event && event.type ? event.type : 'interaction');
  }

  const interactionEvents = ['pointerdown', 'keydown', 'touchstart', 'focusin'];
  interactionEvents.forEach((eventName) => {
    try {
      window.addEventListener(eventName, onInteraction, { capture: true, passive: true, once: true });
      document.addEventListener(eventName, onInteraction, { capture: true, passive: true, once: true });
    } catch (_) {
      window.addEventListener(eventName, onInteraction, true);
      document.addEventListener(eventName, onInteraction, true);
    }
  });
  document.addEventListener('submit', onInteraction, true);

  window.__loadRuntimeGtm = load;
})();`;

export const RUNTIME_GTM_LOADER_TAG =
  `<script data-runtime-gtm="1" data-runtime-gtm-loader="delayed">${RUNTIME_GTM_LOADER_SCRIPT}</script>`;

/**
 * Strip hardcoded WP GTM / gtag snippets and inject the fleet runtime loader.
 * IDs come from .env (PUBLIC_GTM_ID / PUBLIC_GA4_ID) or FLOW gtm.json via /runtime-gtm.js.
 */
export function injectRuntimeGtmLoader(html: string): string {
  const stripped = stripLegacyAnalytics(html);
  let next = stripped;
  if (!next.includes('data-runtime-gtm="1"')) {
    next = /<\/head>/i.test(next)
      ? next.replace(/<\/head>/i, `${RUNTIME_GTM_LOADER_TAG}\n</head>`)
      : `${RUNTIME_GTM_LOADER_TAG}\n${next}`;
  }
  return next;
}

export function stripLegacyAnalytics(html: string): string {
  // Match one tag pair at a time and decide per block. A greedy pattern that spans
  // from one <script> to a later </script> can swallow </head>, canonical and most
  // of the document — do not reintroduce cross-boundary regexes here.
  let out = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (block) => {
    if (/googletagmanager\.com\/(?:gtm\.js|ns\.html|gtag\/js)/i.test(block)) return '';
    if (/['"]GTM-[A-Z0-9]+['"]/.test(block) && /dataLayer|gtm\.js|googletagmanager/i.test(block)) return '';
    if (/window\.dataLayer\s*=\s*window\.dataLayer\s*\|\|\s*\[\]/i.test(block) && /gtag\(\s*['"]config['"]/i.test(block)) {
      return '';
    }
    if (/function\s+gtag\s*\(/i.test(block) && /gtag\(\s*['"]config['"]/i.test(block)) return '';
    return block;
  });

  out = out.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, (block) =>
    /googletagmanager/i.test(block) ? '' : block,
  );

  out = out
    .replace(/<iframe\b[^>]*googletagmanager\.com\/ns\.html[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<!--\s*Google Tag Manager\s*(?:\(noscript\))?\s*-->/gi, '')
    .replace(/<!--\s*End Google Tag Manager\s*(?:\(noscript\))?\s*-->/gi, '')
    .replace(/<!--\s*Google tag\s*\(gtag\.js\)\s*-->/gi, '');

  return out;
}
