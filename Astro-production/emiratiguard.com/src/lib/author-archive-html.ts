import { renderApbCardsHtml } from "./apb-card-html";
import { stripHtml, type PostEntry } from "./content";

export interface AuthorArchiveAuthor {
  id: number;
  name: string;
  slug: string;
  path: string;
  title?: string;
  description?: string;
  avatar?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function plainName(value: string): string {
  return stripHtml(value || "").trim();
}

export function buildAuthorHeroHtml(author: AuthorArchiveAuthor): string {
  const name = escapeHtml(plainName(author.name));
  const title = author.title ? escapeHtml(stripHtml(author.title)) : "";
  const bio = author.description ? escapeHtml(stripHtml(author.description)) : "";

  return `<section class="author-archive-profile has-text-align-center">
	<h1 class="author-archive__name">${name}</h1>
	${title ? `<p class="author-archive__title">${title}</p>` : ""}
	${bio ? `<p class="author-archive__bio">${bio}</p>` : ""}
</section>`;
}

export function buildAuthorPostsHeadingHtml(author: AuthorArchiveAuthor): string {
  const name = escapeHtml(plainName(author.name));
  return `<h2 class="author-archive__posts-heading">Articles By ${name}</h2>`;
}

export function buildAuthorPostsGridHtml(
  author: AuthorArchiveAuthor,
  posts: PostEntry[],
): string {
  const cards = renderApbCardsHtml(posts);
  return `${buildAuthorPostsHeadingHtml(author)}
<div class="alignwide wp-block-ap-block-posts" id="apbAdvancedPosts-author" data-sp-author-grid="1">
	<div class="apbGridPosts columns-3 columns-tablet-2 columns-mobile-1">
${cards}
	</div>
</div>`;
}

/** @deprecated Use buildAuthorHeroHtml + buildAuthorPostsGridHtml. */
export function buildAuthorArchiveHtml(input: {
  author: AuthorArchiveAuthor;
  posts: PostEntry[];
}): string {
  const { author, posts } = input;
  return `${buildAuthorHeroHtml(author)}
<div class="post-inner thin">
	<div class="entry-content">
		${posts.length ? buildAuthorPostsGridHtml(author, posts) : "<p>No posts by this author.</p>"}
	</div>
</div>`;
}
