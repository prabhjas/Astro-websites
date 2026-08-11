import { getAuthors, getCategories, getTags, stripHtml, type PostEntry } from "./content";

/**
 * Elementor loop template 861 (blog grid cards on /blog/).
 * Must match existing ECS/Elementor markup so post-861.css applies.
 */
export const BLOG_LOAD_MORE_PER_PAGE = 6;

const DEFAULT_AVATAR =
  "https://secure.gravatar.com/avatar/?s=96&d=mm&r=g";

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function categoryMeta(post: PostEntry): { name: string; slug: string; className: string } {
  const cats = getCategories();
  for (const id of post.categories) {
    const hit = cats.find((c) => c.id === id);
    if (hit?.slug) {
      return { name: hit.name, slug: hit.slug, className: `category-${hit.slug}` };
    }
  }
  return { name: "Blog", slug: "blog", className: "category-blog" };
}

function tagClasses(post: PostEntry): string {
  const tags = getTags();
  return (post.tags || [])
    .map((id) => tags.find((t) => t.id === id)?.slug)
    .filter(Boolean)
    .map((slug) => `tag-${slug}`)
    .join(" ");
}

function formatCardDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function resolveAuthor(post: PostEntry): {
  name: string;
  slug: string;
  path: string;
  avatar: string;
} {
  const fromStore = getAuthors().find((a) => a.id === post.author);
  const name = (post.authorName || fromStore?.name || "RAAD Recruitment").trim();
  const slug = (post.authorSlug || fromStore?.slug || "raad-recruitment").trim();
  const path = fromStore?.path || `/author/${slug}/`;
  const avatar = (fromStore?.avatar || "").trim() || DEFAULT_AVATAR;
  return { name, slug, path, avatar };
}

/** Shared fallback when a post has no featured/OG image. */
export const BLOG_FEATURED_PLACEHOLDER = "/images/blog-placeholder.svg";

/** Prefer full-size WP media URL when CMS stored a resized derivative (-300x270 etc.). */
function preferFullImageUrl(src: string): string {
  return src.replace(/-\d{2,4}x\d{2,4}(?=\.(?:webp|jpe?g|png|gif)$)/i, "");
}

function resolveCardImageSrc(post: PostEntry): { src: string; isPlaceholder: boolean } {
  const raw = (post.featuredImage || post.seo?.ogImage || "").trim();
  if (!raw || raw.includes("blog-placeholder")) {
    return { src: BLOG_FEATURED_PLACEHOLDER, isPlaceholder: true };
  }
  return { src: preferFullImageUrl(raw), isPlaceholder: false };
}

function cardImage(post: PostEntry, href: string, title: string): string {
  const { src, isPlaceholder } = resolveCardImageSrc(post);
  const alt = escapeAttr(isPlaceholder ? "Blog post placeholder image" : title || "Post image");
  const cls = isPlaceholder
    ? "attachment-full size-full sp-blog-card-placeholder-img"
    : "attachment-full size-full";
  return `<a href="${escapeAttr(href)}">
							<img decoding="async" width="1000" height="667" src="${escapeAttr(src)}" class="${cls}" alt="${alt}" loading="lazy">								</a>`;
}

function excerptText(post: PostEntry): string {
  const raw = stripHtml(post.excerpt || "").replace(/\s+/g, " ").trim();
  if (!raw) return "";
  // Match the length style used on the mirrored blog cards
  if (raw.length <= 110) return raw;
  return `${raw.slice(0, 107).trimEnd()}..`;
}

/** HTML for one Elementor-861 blog grid card. */
export function renderBlogCardHtml(post: PostEntry): string {
  const title = stripHtml(post.title);
  const href = post.path.endsWith("/") ? post.path : `${post.path}/`;
  const { className: catClass } = categoryMeta(post);
  const thumbClass = "has-post-thumbnail";
  const excerpt = excerptText(post);
  const tagsCls = tagClasses(post);
  const dateLabel = formatCardDate(post.date);
  const author = resolveAuthor(post);
  const authorPath = author.path.endsWith("/") ? author.path : `${author.path}/`;

  return `<article id="post-${post.id}" class="elementor-post elementor-grid-item ecs-post-loop post-${post.id} post type-post status-publish format-standard ${thumbClass} hentry ${catClass} ${tagsCls} ast-article-single">
				<div data-elementor-type="loop" data-elementor-id="861" class="elementor elementor-861 post-${post.id} post type-post status-publish format-standard ${thumbClass} hentry ${catClass} ${tagsCls} ast-article-single" data-elementor-post-type="elementor_library">
					<section class="elementor-section elementor-top-section elementor-element elementor-element-9e26797 elementor-section-boxed elementor-section-height-default elementor-section-height-default" data-id="9e26797" data-element_type="section" data-e-type="section">
						<div class="elementor-container elementor-column-gap-default">
					<div class="elementor-column elementor-col-100 elementor-top-column elementor-element elementor-element-8da3af1" data-id="8da3af1" data-element_type="column" data-e-type="column">
			<div class="elementor-widget-wrap elementor-element-populated">
						<div class="elementor-element elementor-element-18e23fd elementor-widget elementor-widget-theme-post-featured-image elementor-widget-image" data-id="18e23fd" data-element_type="widget" data-e-type="widget" data-widget_type="theme-post-featured-image.default">
				<div class="elementor-widget-container">
																${cardImage(post, href, title)}
															</div>
				</div>
				<div class="elementor-element elementor-element-dda5999 elementor-widget elementor-widget-theme-post-title elementor-page-title elementor-widget-heading" data-id="dda5999" data-element_type="widget" data-e-type="widget" data-widget_type="theme-post-title.default">
				<div class="elementor-widget-container">
					<h2 class="elementor-heading-title elementor-size-default"><a href="${escapeAttr(href)}">${escapeHtml(title)}</a></h2>				</div>
				</div>
				<div class="elementor-element elementor-element-a702b21 elementor-widget elementor-widget-theme-post-excerpt" data-id="a702b21" data-element_type="widget" data-e-type="widget" data-widget_type="theme-post-excerpt.default">
				<div class="elementor-widget-container">
					<p>${escapeHtml(excerpt)}				</p></div>
				</div>
				<section class="elementor-section elementor-inner-section elementor-element elementor-element-fd20569 elementor-section-boxed elementor-section-height-default elementor-section-height-default" data-id="fd20569" data-element_type="section" data-e-type="section">
						<div class="elementor-container elementor-column-gap-default">
					<div class="elementor-column elementor-col-50 elementor-inner-column elementor-element elementor-element-d629ed0" data-id="d629ed0" data-element_type="column" data-e-type="column">
			<div class="elementor-widget-wrap elementor-element-populated">
						<div class="elementor-element elementor-element-2cb7d28 elementor-widget elementor-widget-post-info" data-id="2cb7d28" data-element_type="widget" data-e-type="widget" data-widget_type="post-info.default">
				<div class="elementor-widget-container">
							<ul class="elementor-inline-items elementor-icon-list-items elementor-post-info">
								<li class="elementor-icon-list-item elementor-repeater-item-f68b14a elementor-inline-item" itemprop="datePublished">
													<span class="elementor-icon-list-text elementor-post-info__item elementor-post-info__item--type-date">
										<time datetime="${escapeAttr(post.date)}">${escapeHtml(dateLabel)}</time>					</span>
								</li>
				</ul>
						</div>
				</div>
					</div>
		</div>
				<div class="elementor-column elementor-col-50 elementor-inner-column elementor-element elementor-element-73417ec" data-id="73417ec" data-element_type="column" data-e-type="column">
			<div class="elementor-widget-wrap elementor-element-populated">
						<div class="elementor-element elementor-element-1d0d1bb elementor-align-right elementor-mobile-align-left elementor-widget elementor-widget-post-info" data-id="1d0d1bb" data-element_type="widget" data-e-type="widget" data-widget_type="post-info.default">
				<div class="elementor-widget-container">
							<ul class="elementor-inline-items elementor-icon-list-items elementor-post-info">
								<li class="elementor-icon-list-item elementor-repeater-item-f68b14a elementor-inline-item" itemprop="author">
						<a href="${escapeAttr(authorPath)}">
											<span class="elementor-icon-list-icon">
								<img decoding="async" class="elementor-avatar" src="${escapeAttr(author.avatar)}" alt="Picture of ${escapeAttr(author.name)}" loading="lazy">
							</span>
									<span class="elementor-icon-list-text elementor-post-info__item elementor-post-info__item--type-author">
										${escapeHtml(author.name)}					</span>
									</a>
				</li>
				</ul>
						</div>
				</div>
					</div>
		</div>
					</div>
		</section>
					</div>
		</div>
					</div>
		</section>
				</div>
				</article>`;
}

export function renderBlogCardsHtml(posts: PostEntry[]): string {
  return posts.map(renderBlogCardHtml).join("\n");
}
