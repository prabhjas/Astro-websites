/**
 * Normalize Elementor single-post breadcrumbs to:
 * Home → Blog → [Current Post Title]
 *
 * Preserves existing ekit separator markup (SVG caret / raquo) when present.
 */
const BC_OL_RE = /<ol\s+class="ekit-breadcrumb"[^>]*>[\s\S]*?<\/ol>/i;

const DEFAULT_SEP =
  `<li class="brd_sep"><span class="separate_icon"><svg aria-hidden="true" class="e-font-icon-svg e-fas-caret-right" viewBox="0 0 192 512" xmlns="http://www.w3.org/2000/svg"><path d="M0 384.662V127.338c0-17.818 21.543-26.741 34.142-14.142l128.662 128.662c7.81 7.81 7.81 20.474 0 28.284L34.142 398.804C21.543 411.404 0 402.48 0 384.662z"></path></svg></span></li>`;

function decodeHtmlEntities(text: string): string {
  return String(text || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => {
      const code = parseInt(h, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    });
}

function escapeHtml(text: string): string {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function extractSeparator(olHtml: string): string {
  const m = olHtml.match(/<li\s+class="brd_sep"[^>]*>[\s\S]*?<\/li>/i);
  return m ? m[0] : DEFAULT_SEP;
}

export function rewriteElementorPostBreadcrumb(html: string, postTitle: string): string {
  if (!html) return html;

  const title = escapeHtml(decodeHtmlEntities(String(postTitle || "").trim()) || "Blog Post");
  const match = html.match(BC_OL_RE);
  if (!match) return html;

  const sep = extractSeparator(match[0]);
  const nextOl =
    `<ol class="ekit-breadcrumb">` +
    `<li class="ekit_breadcrumbs_start"><a href="/">Home</a></li> ` +
    `${sep} ` +
    `<li><a href="/blog/" title="Blog">Blog</a></li> ` +
    `${sep}  ` +
    `<li>${title}</li>` +
    `</ol>`;

  return html.replace(BC_OL_RE, nextOl);
}
