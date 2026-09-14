import { renderBlogCardsHtml, replaceEcsPostsInner } from "./blog-card-html";
import { stripHtml, type PostEntry } from "./content";

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function normalizeAttr(value: string): string {
  return value.replace(/&amp;/gi, "&").trim();
}

function findMainPostTitleWidgetStart(html: string): number {
  const titleMarker = 'data-widget_type="theme-post-title.default"';
  let scan = 0;
  while ((scan = html.indexOf(titleMarker, scan)) !== -1) {
    const before = html.slice(Math.max(0, scan - 1200), scan);
    if (!before.includes("ecs-post-loop")) {
      const start = html.lastIndexOf('<div class="elementor-element', scan);
      if (start !== -1) return start;
    }
    scan += 1;
  }
  return -1;
}

function findMainPostRegionStart(html: string, titleIdx: number): number {
  const markers = ['data-elementor-id="652"', 'class="elementor elementor-652"'];
  let start = 0;
  for (const marker of markers) {
    const idx = html.lastIndexOf(marker, titleIdx);
    if (idx > start) start = idx;
  }
  return start;
}

function removeElementorWidgetAt(html: string, widgetStart: number): string {
  if (widgetStart < 0) return html;

  let depth = 0;
  let i = widgetStart;
  while (i < html.length) {
    const openDiv = html.indexOf("<div", i);
    const closeDiv = html.indexOf("</div>", i);
    if (closeDiv === -1) return html;

    if (openDiv !== -1 && openDiv < closeDiv) {
      depth += 1;
      i = openDiv + 4;
      continue;
    }

    depth -= 1;
    i = closeDiv + 6;
    if (depth === 0) return html.slice(0, widgetStart) + html.slice(i);
  }

  return html;
}

function findElementorWidgetStarts(
  html: string,
  from: number,
  to: number,
  matches: (openTag: string) => boolean,
): number[] {
  const starts: number[] = [];
  let pos = from;
  while (pos < to) {
    const idx = html.indexOf('<div class="elementor-element', pos);
    if (idx === -1 || idx >= to) break;
    const endTag = html.indexOf(">", idx);
    if (endTag === -1 || endTag >= to) break;
    const openTag = html.slice(idx, endTag + 1);
    if (matches(openTag)) starts.push(idx);
    pos = idx + 1;
  }
  return starts;
}

function isLegacySpFeaturedWidget(openTag: string): boolean {
  return (
    openTag.includes("elementor-element-sp-featured") ||
    openTag.includes('data-id="sp-featured"')
  );
}

function isThemeFeaturedImageWidget(openTag: string): boolean {
  return openTag.includes("elementor-widget-theme-post-featured-image");
}

function replaceFeaturedImageInWidget(html: string, widgetStart: number, img: string): string {
  const containerIdx = html.indexOf(
    '<div class="elementor-widget-container">',
    widgetStart,
  );
  if (containerIdx === -1) return html;

  const contentStart = html.indexOf(">", containerIdx) + 1;
  let depth = 1;
  let pos = contentStart;
  while (pos < html.length && depth > 0) {
    const nextOpen = html.indexOf("<div", pos);
    const nextClose = html.indexOf("</div>", pos);
    if (nextClose === -1) break;

    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth += 1;
      pos = nextOpen + 4;
      continue;
    }

    depth -= 1;
    if (depth === 0) {
      return html.slice(0, contentStart) + img + html.slice(nextClose);
    }
    pos = nextClose + 6;
  }

  return html;
}

/** Replace or insert the hero featured image in the main post column (not related cards). */
export function injectFeaturedImageHtml(
  html: string,
  featuredImage?: string,
  title?: string,
): string {
  if (!html || !featuredImage?.trim()) return html;

  const src = escapeAttr(normalizeAttr(featuredImage.trim()));
  const alt = escapeAttr((title || "Featured image").trim());
  const img = `<img fetchpriority="high" decoding="async" width="800" height="450" src="${src}" class="attachment-large size-large" alt="${alt}" loading="eager">`;
  const widget = `<div class="elementor-element elementor-element-dbe211f elementor-widget elementor-widget-theme-post-featured-image elementor-widget-image" data-id="dbe211f" data-element_type="widget" data-widget_type="theme-post-featured-image.default">
				<div class="elementor-widget-container">
					${img}				</div>
				</div>
				`;

  const titleIdx = findMainPostTitleWidgetStart(html);
  if (titleIdx === -1) return html;

  const regionStart = findMainPostRegionStart(html, titleIdx);
  let out = html;

  const legacyFeatured = findElementorWidgetStarts(
    out,
    regionStart,
    titleIdx,
    isLegacySpFeaturedWidget,
  );
  for (let i = legacyFeatured.length - 1; i >= 0; i -= 1) {
    out = removeElementorWidgetAt(out, legacyFeatured[i]!);
  }

  const titleIdxAfterLegacy = findMainPostTitleWidgetStart(out);
  if (titleIdxAfterLegacy === -1) return out;
  const regionStartAfterLegacy = findMainPostRegionStart(out, titleIdxAfterLegacy);

  const featuredWidgets = findElementorWidgetStarts(
    out,
    regionStartAfterLegacy,
    titleIdxAfterLegacy,
    isThemeFeaturedImageWidget,
  );

  let workingTitleIdx = titleIdxAfterLegacy;
  if (featuredWidgets.length > 1) {
    for (let i = featuredWidgets.length - 1; i > 0; i -= 1) {
      out = removeElementorWidgetAt(out, featuredWidgets[i]!);
    }
    workingTitleIdx = findMainPostTitleWidgetStart(out);
    if (workingTitleIdx === -1) return out;
  }

  const featuredWidgetsFinal = findElementorWidgetStarts(
    out,
    findMainPostRegionStart(out, workingTitleIdx),
    workingTitleIdx,
    isThemeFeaturedImageWidget,
  );

  if (featuredWidgetsFinal.length > 0) {
    return replaceFeaturedImageInWidget(out, featuredWidgetsFinal[0]!, img);
  }

  return out.slice(0, workingTitleIdx) + widget + out.slice(workingTitleIdx);
}

function extractAuthorBox(html: string): { start: number; end: number; snippet: string } | null {
  const marker = 'class="elementor-author-box"';
  const markerIdx = html.indexOf(marker);
  if (markerIdx === -1) return null;

  const start = html.lastIndexOf("<div", markerIdx);
  if (start === -1) return null;

  let depth = 0;
  let i = start;
  while (i < html.length) {
    const openDiv = html.indexOf("<div", i);
    const closeDiv = html.indexOf("</div>", i);
    if (closeDiv === -1) return null;

    if (openDiv !== -1 && openDiv < closeDiv) {
      depth += 1;
      i = openDiv + 4;
      continue;
    }

    depth -= 1;
    i = closeDiv + 6;
    if (depth === 0) {
      return { start, end: i, snippet: html.slice(start, i) };
    }
  }

  return null;
}

function resolveAvatarSrc(authorAvatar: string | undefined, fallbackImg: string): string {
  let src = normalizeAttr(authorAvatar || "");
  if (!src) {
    const srcMatch = fallbackImg.match(/\bsrc="([^"]*)"/i);
    if (srcMatch) src = normalizeAttr(srcMatch[1]);
  }
  if (src.includes("gravatar.com")) {
    try {
      const url = new URL(src);
      url.searchParams.set("s", "100");
      src = url.toString();
    } catch {
      /* keep original */
    }
  }
  return src;
}

function linkAuthorBoxSnippet(
  snippet: string,
  href: string,
  displayName: string,
  authorAvatar?: string,
): string {
  const avatarAlt = `Picture of ${displayName}`;
  const safeHref = escapeAttr(href);
  const safeName = escapeAttr(displayName);
  let out = snippet;

  // Always rewrite avatar + name from the live post author (bodyHtml is a frozen WP mirror).
  out = out.replace(
    /(<div class="elementor-author-box__avatar">\s*)(?:<a\b[^>]*>\s*)?(<img\b[^>]*>)(?:\s*<\/a>)?(\s*<\/div>)/i,
    (_match, pre: string, img: string, post: string) => {
      const src = resolveAvatarSrc(authorAvatar, img);
      if (!src) return `${pre}${img}${post}`;
      return `${pre}<a href="${safeHref}"><img src="${escapeAttr(src)}" alt="${escapeAttr(avatarAlt)}" width="50" height="50" loading="eager" decoding="async"></a>${post}`;
    },
  );

  out = out.replace(
    /(<h4 class="elementor-author-box__name">\s*)(?:<a\b[^>]*>\s*)?([\s\S]*?)(?:\s*<\/a>)?(\s*<\/h4>)/i,
    (_match, pre: string, _text: string, post: string) =>
      `${pre}<a href="${safeHref}">${safeName}</a>${post}`,
  );

  return out;
}

/** Link Elementor author box avatar + name to the author archive page. */
export function linkAuthorBoxHtml(
  html: string,
  authorSlug?: string,
  authorName?: string,
  authorAvatar?: string,
): string {
  if (!html || !authorSlug?.trim()) return html;

  const href = `/author/${authorSlug.replace(/^\/+|\/+$/g, "")}/`;
  const displayName = (authorName || authorSlug).trim();
  const box = extractAuthorBox(html);
  if (!box) return html;

  const linked = linkAuthorBoxSnippet(box.snippet, href, displayName, authorAvatar);
  if (linked === box.snippet) return html;

  return html.slice(0, box.start) + linked + html.slice(box.end);
}

/** Patch Elementor single-post HTML: hero featured image, author links, related cards. */
export function prepareElementorPostHtml(
  html: string,
  post: PostEntry,
  relatedPosts: PostEntry[],
  authorAvatar?: string,
): string {
  if (!html) return html;

  const title = stripHtml(post.title);
  const featuredImage = (post.featuredImage || post.seo?.ogImage || "").trim();
  const featuredAlt = (post.featuredImageAlt || title).trim();

  let out = html;
  if (relatedPosts.length && out.includes("ecs-posts")) {
    out = replaceEcsPostsInner(out, 1, renderBlogCardsHtml(relatedPosts));
  }

  out = injectFeaturedImageHtml(out, featuredImage, featuredAlt);
  out = linkAuthorBoxHtml(out, post.authorSlug, post.authorName, authorAvatar);

  return out;
}
