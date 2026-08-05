import { formatDate, getCategories, stripHtml, type PostEntry } from "./content";

/** Matches Elementor posts.classic widget on /insights/ (6 per page). */
export const INSIGHTS_PER_PAGE = 6;

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function categoryClasses(post: PostEntry): string {
  const cats = getCategories();
  return post.categories
    .map((id) => cats.find((c) => c.id === id)?.slug)
    .filter(Boolean)
    .map((slug) => `category-${slug}`)
    .join(" ");
}

function excerptParagraph(post: PostEntry): string {
  const raw = stripHtml(post.excerpt || post.content || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);
  if (!raw) return "";
  return `<p>${escapeAttr(raw)}</p>`;
}

function thumbnailHtml(post: PostEntry, title: string): string {
  const src = (post.featuredImage || "").replace(/^https?:\/\/ngmanpower\.com/, "").trim();
  if (!src) return "";
  return `<a class="elementor-post__thumbnail__link" href="${escapeAttr(post.path)}" tabindex="-1">
			<div class="elementor-post__thumbnail"><img decoding="async" width="300" height="169" src="${escapeAttr(src)}" class="attachment-medium size-medium" alt="${escapeAttr(title)}" loading="lazy"></div>
		</a>`;
}

/** One classic Elementor posts-widget card (insights archive). */
export function renderInsightsClassicPostHtml(post: PostEntry): string {
  const title = stripHtml(post.title);
  const href = post.path.endsWith("/") ? post.path : `${post.path}/`;
  const thumbClass = post.featuredImage ? "has-post-thumbnail" : "";
  const cats = categoryClasses(post);
  const excerpt = excerptParagraph(post);
  return `<article class="elementor-post elementor-grid-item post-${post.id} post type-post status-publish format-standard ${thumbClass} hentry ${cats}" role="listitem">
				${thumbnailHtml(post, title)}
				<div class="elementor-post__text">
				<h3 class="elementor-post__title">
			<a href="${escapeAttr(href)}">
				${escapeAttr(title)}			</a>
		</h3>
				<div class="elementor-post__meta-data">
					<span class="elementor-post-date">
			${escapeAttr(formatDate(post.date))}		</span>
				</div>
				<div class="elementor-post__excerpt">
			${excerpt}
		</div>
		
		<a class="elementor-post__read-more" href="${escapeAttr(href)}" aria-label="Read more about ${escapeAttr(title)}" tabindex="-1">
			Read More »		</a>

				</div>
				</article>`;
}

export function renderInsightsClassicPostsHtml(posts: PostEntry[]): string {
  return posts.map(renderInsightsClassicPostHtml).join("\n");
}

export function renderInsightsPaginationHtml(page: number, totalPages: number): string {
  const prevHref = page <= 2 ? "/insights/" : `/insights/${page - 1}/`;
  const nextHref = `/insights/${page + 1}/`;
  const prev =
    page > 1
      ? `<a class="page-numbers prev" href="${prevHref}">« Previous</a>`
      : `<span class="page-numbers prev">« Previous</span>`;
  const next =
    page < totalPages
      ? `<a class="page-numbers next" href="${nextHref}">Next »</a>`
      : `<span class="page-numbers next">Next »</span>`;
  return `<nav class="elementor-pagination" aria-label="Pagination">
			${prev}
${next}		</nav>`;
}
