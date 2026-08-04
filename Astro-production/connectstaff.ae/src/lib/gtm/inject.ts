const GTM_LOADER_TAG = '<script src="/runtime-gtm.js" defer data-runtime-gtm="1"></script>';

export function injectRuntimeGtmLoader(html: string): string {
  const stripped = stripLegacyAnalytics(html);
  let next = stripped;
  if (!next.includes('data-runtime-gtm="1"')) {
    next = next.replace(/<\/head>/i, `${GTM_LOADER_TAG}\n</head>`);
  }
  return next;
}

function stripLegacyAnalytics(html: string): string {
  // Strip only within a single tag pair — never cross boundaries (cross-doc matches
  // can delete </head>, canonical, and most of the page).
  let out = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (block) => {
    if (/googletagmanager\.com\/(?:gtm\.js|ns\.html)/i.test(block)) return '';
    if (/['"]GTM-[A-Z0-9]+['"]/.test(block) && /dataLayer|gtm\.js|googletagmanager/i.test(block)) return '';
    if (/window\.dataLayer\s*=\s*window\.dataLayer\s*\|\|\s*\[\]/i.test(block) && /gtag\(['"]config['"]/i.test(block)) {
      return '';
    }
    return block;
  });

  out = out.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, (block) =>
    /googletagmanager/i.test(block) ? '' : block,
  );

  out = out
    .replace(/<iframe\b[^>]*googletagmanager\.com\/ns\.html[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<!--\s*Google Tag Manager\s*(?:\(noscript\))?\s*-->/gi, '')
    .replace(/<!--\s*End Google Tag Manager\s*(?:\(noscript\))?\s*-->/gi, '');

  return out;
}
