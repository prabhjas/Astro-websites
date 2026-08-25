/**
 * Place the single-post title immediately after the featured image in Elementor HTML.
 * Iberia's Elementor template 234 currently puts theme-post-title after TOC.
 */

function stripHtml(html: string): string {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeBasicEntities(value: string): string {
  return String(value || "")
    .replace(/&#038;|&amp;/gi, "&")
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

function escapeHtmlText(value: string): string {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Extract the Elementor widget div that contains `marker` (must be an elementor-element). */
function extractElementorWidget(
  html: string,
  marker: string,
  fromIndex = 0,
): { start: number; end: number; html: string } | null {
  const markerIdx = html.indexOf(marker, fromIndex);
  if (markerIdx < 0) return null;

  let start = html.lastIndexOf("<div", markerIdx);
  while (start >= 0) {
    const openTagEnd = html.indexOf(">", start);
    const openTag = openTagEnd > start ? html.slice(start, openTagEnd + 1) : "";
    if (/\belementor-element\b/i.test(openTag)) break;
    start = html.lastIndexOf("<div", start - 1);
  }
  if (start < 0) return null;

  let depth = 0;
  let i = start;
  while (i < html.length) {
    const nextOpen = html.indexOf("<div", i);
    const nextClose = html.indexOf("</div>", i);
    if (nextClose < 0) return null;
    if (nextOpen >= 0 && nextOpen < nextClose) {
      depth += 1;
      i = nextOpen + 4;
    } else {
      depth -= 1;
      i = nextClose + 6;
      if (depth === 0) {
        return { start, end: i, html: html.slice(start, i) };
      }
    }
  }
  return null;
}

function buildTitleWidget(titleHtml: string): string {
  const text = escapeHtmlText(decodeBasicEntities(stripHtml(titleHtml)).trim());
  if (!text) return "";
  // Match Elementor template 234 (post-234.css → b4b743d), but omit
  // `elementor-page-title`: header template post-31.css sets
  // `--page-title-display:none`, which hides `.elementor-page-title`.
  return (
    `<div class="elementor-element elementor-element-b4b743d elementor-widget elementor-widget-theme-post-title elementor-widget-heading" data-id="b4b743d" data-element_type="widget" data-widget_type="theme-post-title.default" style="display:block">` +
    `<div class="elementor-widget-container">` +
    `<h1 class="elementor-heading-title elementor-size-default">${text}</h1>` +
    `</div></div>`
  );
}

/** Remove only the primary single-post H1 title widget — keep related-card titles. */
function removePrimaryPostTitleWidgets(html: string): string {
  let out = html;
  // Template id for the single H1 title in Elementor kit 234.
  for (;;) {
    const byId = extractElementorWidget(out, "elementor-element-b4b743d");
    if (!byId) break;
    out = out.slice(0, byId.start) + out.slice(byId.end);
  }

  // Also drop any other theme-post-title widget that wraps an <h1> (not related cards).
  let searchFrom = 0;
  for (;;) {
    const markerIdx = out.indexOf("elementor-widget-theme-post-title", searchFrom);
    if (markerIdx < 0) break;
    const widget = extractElementorWidget(out, "elementor-widget-theme-post-title", searchFrom);
    if (!widget) break;
    if (/<h1\b/i.test(widget.html)) {
      out = out.slice(0, widget.start) + out.slice(widget.end);
      searchFrom = widget.start;
      continue;
    }
    searchFrom = widget.end;
  }
  return out;
}

/**
 * Move / inject the post title so it sits directly under the featured image.
 * Uses `title` from post data (dynamic). Removes the misplaced primary H1 only.
 */
export function placeSinglePostTitleAfterFeaturedImage(bodyHtml: string, title: string): string {
  if (!bodyHtml || !title) return bodyHtml;

  const titleWidget = buildTitleWidget(title);
  if (!titleWidget) return bodyHtml;

  let html = removePrimaryPostTitleWidgets(bodyHtml);

  const featured = extractElementorWidget(html, 'data-widget_type="theme-post-featured-image.default"');
  if (featured) {
    return html.slice(0, featured.end) + titleWidget + html.slice(featured.end);
  }

  const content = extractElementorWidget(html, 'data-widget_type="theme-post-content.default"');
  if (content) {
    return html.slice(0, content.start) + titleWidget + html.slice(content.start);
  }

  // No featured image / post content widgets — leave HTML alone (never prepend page titles).
  return html;
}
