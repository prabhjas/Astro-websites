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

  const titleMarker = 'data-widget_type="theme-post-title.default"';
  let titleIdx = -1;
  let scan = 0;
  while ((scan = html.indexOf(titleMarker, scan)) !== -1) {
    const before = html.slice(Math.max(0, scan - 1200), scan);
    if (!before.includes("ecs-post-loop")) {
      titleIdx = html.lastIndexOf('<div class="elementor-element', scan);
      break;
    }
    scan += 1;
  }
  if (titleIdx === -1) return html;

  const wrapStart = html.lastIndexOf(
    "elementor-widget-wrap elementor-element-populated",
    titleIdx,
  );
  const between = html.slice(wrapStart, titleIdx);
  const featIdx = between.indexOf("elementor-widget-theme-post-featured-image");

  if (featIdx !== -1) {
    const absoluteFeat = wrapStart + featIdx;
    const containerIdx = html.indexOf(
      '<div class="elementor-widget-container">',
      absoluteFeat,
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

  return html.slice(0, titleIdx) + widget + html.slice(titleIdx);
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

function linkAuthorBoxSnippet(
  snippet: string,
  href: string,
  displayName: string,
  authorAvatar?: string,
): string {
  const avatarAlt = `Picture of ${displayName}`;
  let out = snippet;

  if (!/elementor-author-box__avatar[\s\S]*?<a[\s>]/i.test(out)) {
    out = out.replace(
      /(<div class="elementor-author-box__avatar">\s*)(<img\b[^>]*>)(\s*<\/div>)/i,
      (_match, pre: string, img: string, post: string) => {
        let src = normalizeAttr(authorAvatar || "");
        const srcMatch = img.match(/\bsrc="([^"]*)"/i);
        if (!src && srcMatch) src = normalizeAttr(srcMatch[1]);
        if (src.includes("gravatar.com")) {
          try {
            const url = new URL(src);
            url.searchParams.set("s", "100");
            src = url.toString();
          } catch {
            /* keep original */
          }
        }
        if (!src) return `${pre}${img}${post}`;
        return `${pre}<a href="${escapeAttr(href)}"><img src="${escapeAttr(src)}" alt="${escapeAttr(avatarAlt)}" width="50" height="50" loading="eager" decoding="async"></a>${post}`;
      },
    );
  }

  if (!/elementor-author-box__name[\s\S]*?<a[\s>]/i.test(out)) {
    out = out.replace(
      /(<h4 class="elementor-author-box__name">\s*)([\s\S]*?)(\s*<\/h4>)/i,
      (_match, pre: string, text: string, post: string) => {
        const name = text.replace(/\s+/g, " ").trim() || displayName;
        return `${pre}<a href="${escapeAttr(href)}">${escapeAttr(name)}</a>${post}`;
      },
    );
  }

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

  let out = html;
  if (relatedPosts.length && out.includes("ecs-posts")) {
    out = replaceEcsPostsInner(out, 1, renderBlogCardsHtml(relatedPosts));
  }

  out = injectFeaturedImageHtml(out, featuredImage, title);
  out = linkAuthorBoxHtml(out, post.authorSlug, post.authorName, authorAvatar);

  return out;
}
