import singleTemplate from "../data/single-post-template.html?raw";
import archiveTemplate from "../data/archive-template.html?raw";
import loopItemTemplate from "../data/loop-item-template.html?raw";
import type { PostEntry } from "./content-types";
import { formatDate, getPrimaryCategoryName, getRelatedPosts, stripHtml } from "./content";

function escapeHtml(s: string): string {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function readingTime(html: string): string {
  const words = stripHtml(html).split(/\s+/).filter(Boolean).length;
  const mins = Math.max(1, Math.round(words / 200));
  return `${mins} min read`;
}

function formatCardDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return formatDate(iso);
  }
}

/** Fill Elementor loop-item (2618) card for one post. */
export function renderPostCard(post: PostEntry, categoryName = ""): string {
  const title = stripHtml(post.title);
  const href = post.path.endsWith("/") ? post.path : `${post.path}/`;
  const image = String(post.featuredImage || "").trim();
  const category = categoryName || getPrimaryCategoryName(post);
  let html = loopItemTemplate;

  // Live omits the featured-image widget entirely when the post has no thumbnail.
  if (!image) {
    html = html.replace(
      /<div class="elementor-element elementor-element-4c2ea60[\s\S]*?<\/div>\s*<\/div>\s*(?=<div class="elementor-element elementor-element-52b5c52)/,
      "",
    );
    html = html.replace(/\bhas-post-thumbnail\b/g, "");
  }

  // Live wraps the theme-post-title in an <a>; template ships bare text.
  html = html.replace(
    /(<h2 class="elementor-heading-title elementor-size-default">)\{\{CARD_TITLE\}\}(<\/h2>)/,
    `$1<a href="${href}">{{CARD_TITLE}}</a>$2`,
  );
  html = html.replace(/\{\{CARD_TITLE\}\}/g, escapeHtml(title));
  html = html.replace(/\{\{CARD_IMAGE\}\}/g, image);
  html = html.replace(/\{\{CARD_DATE\}\}/g, formatCardDate(post.date));
  html = html.replace(
    /\{\{CARD_READ_TIME\}\}/g,
    readingTime(post.bodyHtml || post.content || post.excerpt || ""),
  );
  html = html.replace(/\{\{CARD_CATEGORY\}\}/g, escapeHtml(category));

  // Drop stale srcset/sizes from the sample post so CARD_IMAGE wins
  html = html.replace(/\s+srcset="[^"]*"/gi, "");
  html = html.replace(/\s+sizes="[^"]*"/gi, "");
  if (image) {
    html = html.replace(/\s+alt="[^"]*"/gi, ` alt="${escapeHtml(title)}"`);
  }

  // Point every card link at this post (image + title)
  html = html.replace(/\{\{CARD_HREF\}\}/g, href);

  // Match live loop item root classes for this post
  html = html.replace(
    /(data-elementor-id="2618"[^>]*class="[^"]*?)\bpost-\d+\b/,
    `$1post-${post.id}`,
  );
  html = html.replace(/elementor-location-archive/, "elementor-location-single");

  return html;
}

function slugifyHeading(text: string): string {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

/** Assign ids to h2s and build Elementor TOC list markup (Pro JS chunks are not mirrored). */
function injectHeadingIdsAndBuildToc(contentHtml: string): { content: string; tocHtml: string } {
  const used = new Set<string>();
  const items: { id: string; text: string }[] = [];
  const content = String(contentHtml || "").replace(/<h2(\b[^>]*)>([\s\S]*?)<\/h2>/gi, (full, attrs, inner) => {
    const text = stripHtml(inner).trim();
    if (!text) return full;
    const idMatch = /\sid=["']([^"']+)["']/i.exec(attrs);
    let id = idMatch?.[1] || slugifyHeading(text) || "section";
    let n = 2;
    const base = id;
    while (used.has(id)) id = `${base}-${n++}`;
    used.add(id);
    items.push({ id, text });
    if (idMatch) return full;
    return `<h2${attrs} id="${id}">${inner}</h2>`;
  });

  if (!items.length) {
    return {
      content,
      tocHtml: `<p class="elementor-toc__list-item-text">${escapeHtml("No headings were found on this page.")}</p>`,
    };
  }

  const lis = items
    .map(
      (item) =>
        `<li class="elementor-toc__list-item"><div class="elementor-toc__list-item-text-wrapper"><a class="elementor-toc__list-item-text elementor-toc__list-item-text--level-1" href="#${item.id}">${escapeHtml(item.text)}</a></div></li>`,
    )
    .join("");
  return {
    content,
    tocHtml: `<ol class="elementor-toc__list-wrapper">${lis}</ol>`,
  };
}

/** Build single-post Elementor shell (2959) with post body injected. */
export function renderSinglePostShell(post: PostEntry, contentHtml: string): string {
  const title = stripHtml(post.title);
  let html = singleTemplate;
  html = html.replace(/\{\{POST_TITLE\}\}/g, escapeHtml(title));
  html = html.replace(/\{\{POST_DATE\}\}/g, formatCardDate(post.date));
  html = html.replace(/\{\{POST_MODIFIED\}\}/g, formatCardDate(post.modified || post.date));
  html = html.replace(/\{\{POST_READ_TIME\}\}/g, readingTime(contentHtml || post.content || ""));
  html = html.replace(/\{\{POST_AUTHOR\}\}/g, escapeHtml(post.authorName || "Connect HR"));

  const { content, tocHtml } = injectHeadingIdsAndBuildToc(contentHtml || post.content || "");
  if (html.includes("<!--POST_CONTENT-->")) {
    html = html.replace("<!--POST_CONTENT-->", content);
  }
  // Replace Elementor TOC spinner with a real list (Pro TOC webpack chunks are absent locally)
  html = html.replace(
    /(<div id="elementor-toc__dcb6bba" class="elementor-toc__body">)[\s\S]*?(<\/div>\s*<\/div>\s*<\/div>\s*<div class="elementor-element elementor-element-2a3932d)/,
    `$1${tocHtml}$2`,
  );

  if (html.includes("<!--RELATED_POSTS-->")) {
    const cards = getRelatedPosts(post, 4)
      .map((p) => renderPostCard(p, getPrimaryCategoryName(p)))
      .join("\n");
    html = html.replace("<!--RELATED_POSTS-->", cards || "");
  }
  // Update shell root post id only — do not rewrite related/loop card post-* classes
  html = html.replace(
    /(data-elementor-id="2959"[^>]*class="[^"]*?)\bpost-\d+\b/,
    `$1post-${post.id}`,
  );
  return html;
}

/** Build category/archive Elementor shell (2953) with post cards. */
export function renderArchiveShell(opts: {
  title: string;
  posts: PostEntry[];
  categoryName?: string;
}): string {
  const cards = opts.posts.map((p) => renderPostCard(p, opts.categoryName || opts.title)).join("\n");
  let html = archiveTemplate;
  html = html.replace(/\{\{ARCHIVE_TITLE\}\}/g, escapeHtml(opts.title));
  html = html.replace("<!--ARCHIVE_POSTS-->", cards || "<p>No posts found.</p>");
  // Sidebar / secondary grid: first few posts
  const side = opts.posts
    .slice(0, 4)
    .map((p) => renderPostCard(p, opts.categoryName || opts.title))
    .join("\n");
  html = html.replace("<!--ARCHIVE_SIDEBAR_POSTS-->", side);
  // Replace leftover sample category title text
  html = html.replace(/Insurance Management/g, escapeHtml(opts.title));
  return html;
}
