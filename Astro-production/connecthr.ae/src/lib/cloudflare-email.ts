/**
 * Cloudflare Email Address Obfuscation rewrites mailto: links to
 * /cdn-cgi/l/email-protection#… which opens an interstitial instead of the
 * mail client when decode JS fails or the link is opened in a new tab.
 *
 * Wrapping with <!--email_off--> tells Cloudflare to leave the markup alone:
 * https://developers.cloudflare.com/waf/tools/scrape-shield/email-address-obfuscation/
 */
export function disableCloudflareEmailObfuscation(html: string): string {
  const input = String(html || "");
  if (!input.includes("mailto:") && !input.includes("@")) return input;

  return input.replace(
    /<a\b([^>]*\bhref\s*=\s*["']mailto:[^"']+["'][^>]*)>([\s\S]*?)<\/a>/gi,
    (full, attrs: string, inner: string) => {
      if (/<!--\s*email_off\s*-->/i.test(full)) return full;
      // Already nested inside an email_off block immediately before this tag.
      return `<!--email_off--><a${attrs}>${inner}</a><!--/email_off-->`;
    },
  );
}
