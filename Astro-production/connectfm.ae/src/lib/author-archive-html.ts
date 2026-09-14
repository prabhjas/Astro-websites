import { formatDate, getCategories, stripHtml, type PostEntry } from "./content";

export const AUTHOR_ARCHIVE_PER_PAGE = 9;

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function decodeEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function plainText(value: string): string {
  return decodeEntities(stripHtml(value || ""));
}

/** Rough reading time from HTML/plain content (~200 wpm). */
export function estimateReadMinutes(post: PostEntry): number {
  const text = plainText(post.content || post.excerpt || "");
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200) || 1);
}

function primaryCategory(post: PostEntry): { name: string; path: string } | null {
  const cats = getCategories();
  for (const id of post.categories || []) {
    const hit = cats.find((c) => c.id === id);
    if (!hit?.name) continue;
    return {
      name: plainText(hit.name),
      path: hit.path || `/category/${hit.slug}/`,
    };
  }
  return null;
}

export function renderAuthorArchiveCardHtml(post: PostEntry): string {
  const title = plainText(post.title);
  const href = post.path.endsWith("/") ? post.path : `${post.path}/`;
  const imgSrc = (post.featuredImage || post.seo?.ogImage || "").trim();
  const dateLabel = formatDate(post.date);
  const minutes = estimateReadMinutes(post);
  const cat = primaryCategory(post);

  const media = imgSrc
    ? `<a class="cfm-author-post-card__media" href="${escapeAttr(href)}"><img src="${escapeAttr(imgSrc)}" alt="${escapeAttr(title)}" width="640" height="400" loading="lazy" decoding="async" /></a>`
    : `<a class="cfm-author-post-card__media cfm-author-post-card__media--empty" href="${escapeAttr(href)}" aria-label="${escapeAttr(title)}"></a>`;

  const catHtml = cat
    ? `<a class="cfm-author-post-card__cat" href="${escapeAttr(cat.path)}">${escapeAttr(cat.name)}</a>`
    : `<span class="cfm-author-post-card__cat">Blog</span>`;

  return `<article class="cfm-author-post-card">
  ${media}
  <div class="cfm-author-post-card__body">
    ${catHtml}
    <h3 class="cfm-author-post-card__title"><a href="${escapeAttr(href)}">${escapeAttr(title)}</a></h3>
    <p class="cfm-author-post-card__meta">
      <span class="cfm-author-post-card__date">${escapeAttr(dateLabel)}</span>
      <span class="cfm-author-post-card__dot" aria-hidden="true">·</span>
      <span class="cfm-author-post-card__read">${minutes} min read</span>
    </p>
  </div>
</article>`;
}

export function renderAuthorArchiveCardsHtml(posts: PostEntry[]): string {
  return posts.map(renderAuthorArchiveCardHtml).join("\n");
}
