const GTM_LOADER_TAG = '<script src="/runtime-gtm.js" defer data-runtime-gtm="1"></script>';

/**
 * Strip hardcoded WP GTM / gtag snippets and inject the fleet runtime loader.
 * IDs come from .env (PUBLIC_GTM_ID / PUBLIC_GA4_ID) or FLOW gtm.json via /runtime-gtm.js.
 */
export function injectRuntimeGtmLoader(html: string): string {
  const stripped = stripWordpressDiscovery(stripLegacyAnalytics(html));
  let next = stripped;
  if (!next.includes('data-runtime-gtm="1"')) {
    next = /<\/head>/i.test(next)
      ? next.replace(/<\/head>/i, `${GTM_LOADER_TAG}\n</head>`)
      : `${GTM_LOADER_TAG}\n${next}`;
  }
  return next;
}

/** Remove WP REST / xmlrpc / oEmbed discovery links that would 404 on Astro. */
export function stripWordpressDiscovery(html: string): string {
  return html
    .replace(/<link[^>]+rel=["']https:\/\/api\.w\.org\/["'][^>]*>\s*/gi, '')
    .replace(/<link[^>]+href=["'][^"']*\/wp-json\/[^"']*["'][^>]*>\s*/gi, '')
    .replace(/<link[^>]+href=["'][^"']*xmlrpc\.php[^"']*["'][^>]*>\s*/gi, '')
    .replace(/<link[^>]+rel=["']EditURI["'][^>]*>\s*/gi, '')
    .replace(/<link[^>]+rel=["']pingback["'][^>]*>\s*/gi, '')
    .replace(/<link[^>]+rel=["']shortlink["'][^>]*>\s*/gi, '')
    .replace(/<link[^>]+type=["']application\/json\+oembed["'][^>]*>\s*/gi, '')
    .replace(/<link[^>]+type=["']text\/xml\+oembed["'][^>]*>\s*/gi, '')
    .replace(/<link[^>]+type=["']application\/json["'][^>]*href=["'][^"']*\/wp-json\/[^"']*["'][^>]*>\s*/gi, '');
}

export function stripLegacyAnalytics(html: string): string {
  return html
    // Classic GTM container
    .replace(/<!--\s*Google Tag Manager\s*\(noscript\)\s*-->[\s\S]*?<!--\s*End Google Tag Manager\s*\(noscript\)\s*-->/gi, '')
    .replace(/<!--\s*Google Tag Manager\s*-->[\s\S]*?<!--\s*End Google Tag Manager\s*-->/gi, '')
    .replace(/<noscript>\s*<iframe[^>]+googletagmanager\.com\/ns\.html[\s\S]*?<\/iframe>\s*<\/noscript>/gi, '')
    .replace(/<iframe[^>]+googletagmanager\.com\/ns\.html[\s\S]*?<\/iframe>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?googletagmanager\.com\/gtm\.js[\s\S]*?<\/script>/gi, '')
    .replace(/<script[^>]+googletagmanager\.com\/gtm\.js[^>]*>\s*<\/script>/gi, '')
    // GA4 gtag.js (often mislabeled as GTM in WP exports)
    .replace(/<!--\s*Google tag\s*\(gtag\.js\)\s*-->\s*/gi, '')
    .replace(/<script[^>]+googletagmanager\.com\/gtag\/js[^>]*>\s*<\/script>\s*/gi, '')
    .replace(
      /<script[^>]*>\s*window\.dataLayer\s*=\s*window\.dataLayer\s*\|\|\s*\[\];[\s\S]*?gtag\(\s*['"]config['"][\s\S]*?<\/script>\s*/gi,
      '',
    )
    .replace(
      /<script[^>]*>\s*function gtag\(\)[\s\S]*?gtag\(\s*['"]config['"][\s\S]*?<\/script>\s*/gi,
      '',
    );
}
