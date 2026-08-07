/** Decode Cloudflare email-protection spans baked into mirrored HTML. */

export function decodeCfEmail(encoded: string): string {
  const r = Number.parseInt(encoded.slice(0, 2), 16);
  let email = "";
  for (let n = 2; n < encoded.length; n += 2) {
    email += String.fromCharCode(Number.parseInt(encoded.slice(n, n + 2), 16) ^ r);
  }
  return email;
}

/** Replace CF email protection markup with plain mailto / text. */
export function fixCfEmails(html: string): string {
  if (!html || !/__cf_email__|email-protection|data-cfemail/i.test(html)) return html;

  let out = html;
  out = out.replace(/<a\b([^>]*\b__cf_email__\b[^>]*)>([\s\S]*?)<\/a>/gi, (full, attrs) => {
    const m = String(attrs).match(/data-cfemail=["']([a-f0-9]+)["']/i);
    if (!m) return full;
    const email = decodeCfEmail(m[1]);
    return `<a href="mailto:${email}">${email}</a>`;
  });
  out = out.replace(
    /<span class=["']__cf_email__["'] data-cfemail=["']([a-f0-9]+)["']>[\s\S]*?<\/span>/gi,
    (_, enc: string) => decodeCfEmail(enc),
  );
  out = out.replace(
    /<a([^>]*href=["']\/cdn-cgi\/l\/email-protection[^"']*["'][^>]*)>[\s\S]*?<\/a>/gi,
    (full) => {
      const m = full.match(/data-cfemail=["']([a-f0-9]+)["']/i);
      if (!m) return full;
      const email = decodeCfEmail(m[1]);
      return `<a href="mailto:${email}">${email}</a>`;
    },
  );
  return out;
}
