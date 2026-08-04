const GTM_LOADER_TAG = '<script src="/runtime-gtm.js" defer data-runtime-gtm="1"></script>';

export function injectRuntimeGtmLoader(html: string): string {
  const stripped = stripLegacyAnalytics(html);
  let next = stripped;
  if (!next.includes('data-runtime-gtm="1"')) {
    next = next.replace('</head>', `${GTM_LOADER_TAG}\n</head>`);
  }
  return next;
}

function stripLegacyAnalytics(html: string): string {
  // Only strip within a single <script>...</script> block — never cross script boundaries
  // (a greedy cross-script match can delete most of the document).
  let out = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (block) => {
    if (/googletagmanager\.com\/(?:gtm\.js|ns\.html)/i.test(block)) return '';
    if (/['"]GTM-[A-Z0-9]+['"]/.test(block) && /dataLayer|gtm\.js|googletagmanager/i.test(block)) return '';
    if (/window\.dataLayer\s*=\s*window\.dataLayer\s*\|\|\s*\[\]/i.test(block) && /gtag\(['"]config['"]/i.test(block)) return '';
    return block;
  });
  out = out
    .replace(/<noscript[^>]*>[\s\S]*?googletagmanager[\s\S]*?<\/noscript>/gi, '')
    .replace(/<iframe[^>]+googletagmanager\.com\/ns\.html[\s\S]*?<\/iframe>/gi, '')
    .replace(/<!--\s*Google Tag Manager\s*(?:\(noscript\))?\s*-->/gi, '')
    .replace(/<!--\s*End Google Tag Manager\s*(?:\(noscript\))?\s*-->/gi, '');
  return out;
}
