import {
  authors,
  formatDate,
  getCategories,
  stripHtml,
  type PostEntry,
} from "./content";

/** Matches blog Advanced Post Block grid (postsPerPage: 12). */
export const APB_POSTS_PER_PAGE = 12;

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function plainText(value: string): string {
  return stripHtml(value || "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ");
}

/** SVG icons match Advanced Post Block plugin (`view.js`). */
const APB_ICON_AUTHOR =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 416 504" width="0.9em" height="0.9em" aria-hidden="true" focusable="false"><path d="m208 240c66.3 0 120-53.7 120-120 0-66.3-53.7-120-120-120-66.3 0-120 53.7-120 120 0 66.3 53.7 120 120 120zm-29.7 56c-98.5 0-178.3 79.8-178.3 178.3 0 16.4 13.3 29.7 29.7 29.7h356.6c16.4 0 29.7-13.3 29.7-29.7 0-98.5-79.8-178.3-178.3-178.3z"/></svg>';

const APB_ICON_DATE =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 480" width="0.9em" height="0.9em" aria-hidden="true" focusable="false"><path d="m128 0c17.7 0 32 14.3 32 32v32h128v-32c0-17.7 14.3-32 32-32 17.7 0 32 14.3 32 32v32h32c35.3 0 64 28.7 64 64v288c0 35.3-28.7 64-64 64h-320c-35.3 0-64-28.7-64-64v-288c0-35.3 28.7-64 64-64h32v-32c0-17.7 14.3-32 32-32zm-64 240v32c0 8.8 7.2 16 16 16h32c8.8 0 16-7.2 16-16v-32c0-8.8-7.2-16-16-16h-32c-8.8 0-16 7.2-16 16zm128 0v32c0 8.8 7.2 16 16 16h32c8.8 0 16-7.2 16-16v-32c0-8.8-7.2-16-16-16h-32c-8.8 0-16 7.2-16 16zm144-16c-8.8 0-16 7.2-16 16v32c0 8.8 7.2 16 16 16h32c8.8 0 16-7.2 16-16v-32c0-8.8-7.2-16-16-16zm-272 144v32c0 8.8 7.2 16 16 16h32c8.8 0 16-7.2 16-16v-32c0-8.8-7.2-16-16-16h-32c-8.8 0-16 7.2-16 16zm144-16c-8.8 0-16 7.2-16 16v32c0 8.8 7.2 16 16 16h32c8.8 0 16-7.2 16-16v-32c0-8.8-7.2-16-16-16zm112 16v32c0 8.8 7.2 16 16 16h32c8.8 0 16-7.2 16-16v-32c0-8.8-7.2-16-16-16h-32c-8.8 0-16 7.2-16 16z"/></svg>';

const APB_ICON_CATEGORY =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 542 416" width="0.9em" height="0.9em" aria-hidden="true" focusable="false"><path d="m24 193.6l-23.6 70.6v-200.2c0-35.3 28.7-64 64-64h138.7c13.8 0 27.3 4.5 38.4 12.8l38.4 28.8c5.5 4.2 12.3 6.4 19.2 6.4h117.3c35.3 0 64 28.7 64 64v16h-365.4c-41.3 0-78 26.4-91.1 65.6zm421.8 222.4h-378.8c-32.8 0-55.9-32.1-45.5-63.2l48-144c6.5-19.6 24.9-32.8 45.5-32.8h378.8c32.8 0 55.9 32.1 45.5 63.2l-48 144c-6.5 19.6-24.9 32.8-45.5 32.8z"/></svg>';

/** Blog block uses `M j, Y` (e.g. Sep 14, 2024). */
function formatApbDate(date: string): string {
  const d = new Date(date);
  if (Number.isNaN(+d)) return formatDate(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function resolveImageSrc(path: string): string {
  const src = (path || "").trim();
  if (!src) return "";
  const stripped = src.replace(/^https?:\/\/(?:www\.)?emiratiguard\.com/i, "");
  if (/^https?:\/\//i.test(stripped)) return stripped;
  return stripped.startsWith("/") ? stripped : `/${stripped}`;
}

function categoryMeta(post: PostEntry): { name: string } {
  const cats = getCategories();
  for (const id of post.categories || []) {
    const hit = cats.find((c) => c.id === id);
    if (hit?.name) {
      return { name: plainText(hit.name) };
    }
  }
  return { name: "Blog" };
}

function authorMeta(post: PostEntry): { name: string; path: string } {
  const bySlug = post.authorSlug
    ? authors.find((a) => a.slug === post.authorSlug)
    : undefined;
  const byId = post.author ? authors.find((a) => a.id === post.author) : undefined;
  const hit = bySlug || byId;
  if (hit) {
    return { name: plainText(hit.name), path: hit.path || `/author/${hit.slug}/` };
  }
  const name = plainText(post.authorName || "Emirati Guard");
  return { name, path: "/author/" };
}

/**
 * Thumb markup matches Advanced Post Block CSS:
 * `.apbThumb` is a 60% padding-bottom box; img is absolutely positioned.
 */
function cardThumb(post: PostEntry, href: string, title: string): string {
  const src = resolveImageSrc(post.featuredImage || post.seo?.ogImage || "");
  if (!src) {
    return `<div class="apbThumb apbThumb--placeholder" aria-hidden="true"></div>`;
  }
  return `<div class="apbThumb"><a href="${escapeAttr(href)}" tabindex="-1"><img loading="lazy" decoding="async" width="800" height="450" src="${escapeAttr(src)}" alt="${escapeAttr(title)}" /></a></div>`;
}

/** One Advanced Post Block card — matches /blog/ grid styling. */
export function renderApbCardHtml(post: PostEntry): string {
  const title = plainText(post.title);
  const href = post.path.endsWith("/") ? post.path : `${post.path}/`;
  const cat = categoryMeta(post);
  const author = authorMeta(post);
  const dateLabel = formatApbDate(post.date);

  return `<article class="apbPost apbDefault fillContentHeight">
	${cardThumb(post, href, title)}
	<div class="apbText">
		<div class="apbTitle">
			<h3><a href="${escapeAttr(href)}">${escapeAttr(title)}</a></h3>
		</div>
		<div class="apbMeta">
			<span class="metaItem apbPostAuthor">${APB_ICON_AUTHOR}<span><a href="${escapeAttr(author.path)}">${escapeAttr(author.name)}</a></span></span>
			<span class="metaItem apbPostDate">${APB_ICON_DATE}<span>${escapeAttr(dateLabel)}</span></span>
			<span class="metaItem apbPostCategory">${APB_ICON_CATEGORY}<span>${escapeAttr(cat.name)}</span></span>
		</div>
		<div class="apbReadMore">
			<a href="${escapeAttr(href)}">Read More</a>
		</div>
	</div>
</article>`;
}

export function renderApbCardsHtml(posts: PostEntry[]): string {
  return posts.map(renderApbCardHtml).join("\n");
}
