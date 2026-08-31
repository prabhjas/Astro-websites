/**
 * Runtime SEO enrichment for mirrored WP/Elementor HTML.
 * Fills gaps QA tools flag: Twitter Card fields + Organization sameAs social profiles.
 */

const SOCIAL_PROFILES = [
  'https://www.facebook.com/emiratisationgate',
  'https://www.instagram.com/emiratisationgate/',
  'https://www.linkedin.com/company/emiratisation-gate',
] as const;

const TWITTER_SITE = '@emiratisationgate';

function attr(html: string, re: RegExp): string {
  const m = html.match(re);
  return m?.[1]?.trim() || '';
}

function upsertMeta(
  html: string,
  kind: 'name' | 'property',
  key: string,
  content: string,
): string {
  if (!content) return html;
  const escaped = content.replace(/"/g, '&quot;');
  const re = new RegExp(
    `<meta\\s+[^>]*${kind}=["']${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>`,
    'i',
  );
  const tag = `<meta ${kind}="${key}" content="${escaped}" />`;
  if (re.test(html)) return html.replace(re, tag);
  return html.replace(/<\/head>/i, `${tag}\n</head>`);
}

/** Ensure twitter:title / description / image / url / site from title + OG tags. */
export function ensureTwitterCardMeta(html: string, pageUrl?: string): string {
  if (!html) return html;

  const title =
    attr(html, /<meta\s+property=["']og:title["']\s+content=["']([^"']*)["']/i) ||
    attr(html, /<title>([^<]*)<\/title>/i);
  const description =
    attr(html, /<meta\s+property=["']og:description["']\s+content=["']([^"']*)["']/i) ||
    attr(html, /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
  const image = attr(html, /<meta\s+property=["']og:image["']\s+content=["']([^"']*)["']/i);
  const url =
    pageUrl ||
    attr(html, /<meta\s+property=["']og:url["']\s+content=["']([^"']*)["']/i) ||
    attr(html, /<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i);

  let out = html;
  if (!/name=["']twitter:card["']/i.test(out)) {
    out = upsertMeta(out, 'name', 'twitter:card', 'summary_large_image');
  }
  out = upsertMeta(out, 'name', 'twitter:title', title);
  out = upsertMeta(out, 'name', 'twitter:description', description);
  if (image) out = upsertMeta(out, 'name', 'twitter:image', image);
  if (url) out = upsertMeta(out, 'name', 'twitter:url', url);
  out = upsertMeta(out, 'name', 'twitter:site', TWITTER_SITE);
  return out;
}

/**
 * Expand Organization.sameAs to Instagram + Facebook + LinkedIn
 * (header social icons; Yoast export only had Facebook).
 */
export function ensureOrganizationSameAs(html: string): string {
  if (!html || !/"@type"\s*:\s*"Organization"/i.test(html)) return html;

  // Prefer escaped-slash form so we match Yoast JSON-LD style when present.
  const sameAsEscaped = JSON.stringify([...SOCIAL_PROFILES]).replace(/\//g, '\\/');
  const sameAsPlain = JSON.stringify([...SOCIAL_PROFILES]);

  return html.replace(
    /(<script\b[^>]*type=["']application\/ld\+json["'][^>]*>)([\s\S]*?)(<\/script>)/gi,
    (full, open: string, body: string, close: string) => {
      if (!/"@type"\s*:\s*"Organization"/i.test(body)) return full;

      const useEscaped = body.includes('\\/');
      const sameAsJson = useEscaped ? sameAsEscaped : sameAsPlain;

      let next = body;
      if (/"sameAs"\s*:\s*\[[\s\S]*?\]/.test(next)) {
        next = next.replace(/"sameAs"\s*:\s*\[[\s\S]*?\]/, `"sameAs":${sameAsJson}`);
      } else if (/"@type"\s*:\s*"Organization"[\s\S]{0,800}?"url"\s*:\s*"[^"]*"/.test(next)) {
        next = next.replace(
          /("@type"\s*:\s*"Organization"[\s\S]{0,800}?"url"\s*:\s*"[^"]*")/,
          `$1,"sameAs":${sameAsJson}`,
        );
      } else {
        next = next.replace(
          /("@type"\s*:\s*"Organization"[\s\S]{0,400}?"name"\s*:\s*"[^"]*")/,
          `$1,"sameAs":${sameAsJson}`,
        );
      }
      return `${open}${next}${close}`;
    },
  );
}

/**
 * Editorial heading scale for post body copy.
 * Astra global H1/H2 (64px/48px) overpowers long-form content vs design intent.
 * Elementor post-title widgets keep their own rules (higher specificity).
 */
export function ensureHeadingScaleCss(html: string): string {
  if (!html || html.includes('data-eg-heading-scale="1"')) return html;
  const css = `<style data-eg-heading-scale="1">
.elementor-widget-theme-post-content .elementor-widget-container > h1,
.elementor-widget-theme-post-content .elementor-widget-container h1:not(.elementor-heading-title){font-size:2rem;line-height:1.25;font-weight:600;}
.elementor-widget-theme-post-content .elementor-widget-container > h2,
.elementor-widget-theme-post-content .elementor-widget-container h2:not(.elementor-heading-title){font-size:1.75rem;line-height:1.3;font-weight:600;}
.elementor-widget-theme-post-content .elementor-widget-container > h3,
.elementor-widget-theme-post-content .elementor-widget-container h3:not(.elementor-heading-title){font-size:1.35rem;line-height:1.35;font-weight:600;}
.elementor-widget-theme-post-content .elementor-widget-container > h4,
.elementor-widget-theme-post-content .elementor-widget-container h4:not(.elementor-heading-title){font-size:1.15rem;line-height:1.4;font-weight:600;}
.elementor-widget-theme-post-content .elementor-widget-container > h5,
.elementor-widget-theme-post-content .elementor-widget-container h5:not(.elementor-heading-title){font-size:1rem;line-height:1.45;font-weight:600;}
.elementor-widget-theme-post-content .elementor-widget-container > h6,
.elementor-widget-theme-post-content .elementor-widget-container h6:not(.elementor-heading-title){font-size:0.9rem;line-height:1.5;font-weight:600;}
</style>`;
  return /<\/head>/i.test(html) ? html.replace(/<\/head>/i, `${css}\n</head>`) : css + html;
}

const FOOTER_SOCIAL_HTML = `
				<div class="elementor-element elementor-element-eg-footer-social elementor-shape-circle elementor-grid-0 e-grid-align-center elementor-widget elementor-widget-social-icons" data-id="egfootersocial" data-element_type="widget" data-e-type="widget" data-widget_type="social-icons.default">
				<div class="elementor-widget-container">
							<div class="elementor-social-icons-wrapper elementor-grid" role="list">
							<span class="elementor-grid-item" role="listitem">
					<a class="elementor-icon elementor-social-icon elementor-social-icon-instagram" href="https://www.instagram.com/emiratisationgate/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
						<span class="elementor-screen-only">Instagram</span>
						<i aria-hidden="true" class="fab fa-instagram"></i>					</a>
				</span>
							<span class="elementor-grid-item" role="listitem">
					<a class="elementor-icon elementor-social-icon elementor-social-icon-facebook" href="https://www.facebook.com/emiratisationgate" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
						<span class="elementor-screen-only">Facebook</span>
						<i aria-hidden="true" class="fab fa-facebook"></i>					</a>
				</span>
							<span class="elementor-grid-item" role="listitem">
					<a class="elementor-icon elementor-social-icon elementor-social-icon-linkedin" href="https://www.linkedin.com/company/emiratisation-gate" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
						<span class="elementor-screen-only">LinkedIn</span>
						<i aria-hidden="true" class="fab fa-linkedin"></i>					</a>
				</span>
					</div>
						</div>
				</div>`;

/** Inject Instagram / Facebook / LinkedIn into Elementor footers that lack social icons. */
export function ensureFooterSocialProfiles(html: string): string {
  if (!html || html.includes('elementor-element-eg-footer-social')) return html;
  if (!/data-elementor-type="footer"/i.test(html)) return html;

  // Prefer inserting just before the copyright heading inside the footer.
  const copyrightRe =
    /(<footer\b[^>]*data-elementor-type="footer"[^>]*>[\s\S]*?)(<div class="elementor-element elementor-element-665b748[\s\S]*?Copyright ©)/i;
  if (copyrightRe.test(html)) {
    return html.replace(copyrightRe, `$1${FOOTER_SOCIAL_HTML}\n$2`);
  }

  // Fallback: before </footer>
  return html.replace(/<\/footer>/i, `${FOOTER_SOCIAL_HTML}\n</footer>`);
}

export function enrichMirrorSeoHtml(html: string, pageUrl?: string): string {
  let out = html;
  out = ensureTwitterCardMeta(out, pageUrl);
  out = ensureOrganizationSameAs(out);
  out = ensureFooterSocialProfiles(out);
  out = ensureHeadingScaleCss(out);
  return out;
}
