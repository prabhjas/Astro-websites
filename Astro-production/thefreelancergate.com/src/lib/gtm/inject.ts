const GTM_LOADER_TAG = '<script src="/runtime-gtm.js" defer data-runtime-gtm="1"></script>';

/**
 * Strip hardcoded WP GTM / gtag snippets and inject the fleet runtime loader.
 * IDs come from .env (PUBLIC_GTM_ID / PUBLIC_GA4_ID) or FLOW gtm.json via /runtime-gtm.js.
 */
export function injectRuntimeGtmLoader(html: string): string {
  const stripped = stripLegacyAnalytics(html);
  let next = stripped;
  if (!next.includes('data-runtime-gtm="1"')) {
    next = /<\/head>/i.test(next)
      ? next.replace(/<\/head>/i, `${GTM_LOADER_TAG}\n</head>`)
      : `${GTM_LOADER_TAG}\n${next}`;
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
