/** Decode Cloudflare email-protection spans baked into mirrored HTML. */

export function decodeCfEmail(encoded: string): string {
  const r = Number.parseInt(encoded.slice(0, 2), 16);
  let email = "";
  for (let n = 2; n < encoded.length; n += 2) {
    email += String.fromCharCode(Number.parseInt(encoded.slice(n, n + 2), 16) ^ r);
  }
  return email;
}

/**
 * Replace CF email protection markup with plain mailto / text.
 * Preserves surrounding Elementor icon markup (only rewrites spans + hrefs).
 */
export function fixCfEmails(html: string): string {
  if (!html || !/__cf_email__|email-protection|data-cfemail/i.test(html)) return html;

  let out = html;

  out = out.replace(
    /<span\b([^>]*\bdata-cfemail=["']([a-f0-9]+)["'][^>]*)>[\s\S]*?<\/span>/gi,
    (_full, _attrs: string, enc: string) => decodeCfEmail(enc),
  );

  out = out.replace(
    /href=(["'])\/cdn-cgi\/l\/email-protection#([0-9a-f]+)\1/gi,
    (_full, q: string, enc: string) => `href=${q}mailto:${decodeCfEmail(enc)}${q}`,
  );

  return out;
}
