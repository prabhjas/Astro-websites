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
  return html
    .replace(/<script[^>]+googletagmanager\.com\/gtm\.js[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[^>]+googletagmanager\.com\/ns\.html[\s\S]*?<\/iframe>/gi, '')
    .replace(/<script[^>]+googletagmanager\.com\/gtag\/js[^>]*><\/script>\s*/gi, '')
    .replace(/<script>\s*window\.dataLayer\s*=\s*window\.dataLayer\s*\|\|\s*\[\];[\s\S]*?gtag\('config'[\s\S]*?<\/script>/gi, '');
}
