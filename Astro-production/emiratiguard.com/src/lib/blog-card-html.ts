import { formatDate, getCategories, stripHtml, type PostEntry } from "./content";

/** Matches live Elementor loop template 1514 (insights grid). */
export const BLOG_LOAD_MORE_PER_PAGE = 12;

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Decode common WP HTML entities before escaping for text nodes. */
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

function categoryMeta(post: PostEntry): { name: string; slug: string; path: string; className: string } {
  const cats = getCategories();
  for (const id of post.categories) {
    const hit = cats.find((c) => c.id === id);
    if (hit?.name) {
      return {
        name: plainText(hit.name),
        slug: hit.slug || "blog",
        path: hit.path || `/category/${hit.slug || "blog"}/`,
        className: `category-${hit.slug || "blog"}`,
      };
    }
  }
  return { name: "Blog", slug: "blog", path: "/insights/", className: "category-blog" };
}

function resolveImageSrc(path: string): string {
  const src = path.trim();
  if (!src) return "";
  // Live absolute → root-relative (served from local public/)
  const stripped = src.replace(/^https?:\/\/(?:www\.)?emiratiguard\.com/i, "");
  if (/^https?:\/\//i.test(stripped)) return stripped; // external CDN/etc.
  return stripped.startsWith("/") ? stripped : `/${stripped}`;
}

function cardImage(post: PostEntry, href: string, title: string): string {
  const src = resolveImageSrc(post.featuredImage || post.seo?.ogImage || "");
  if (!src) {
    return `<div class="sp-blog-card-placeholder" style="aspect-ratio:16/9;background:#f3eef8;" aria-hidden="true"></div>`;
  }
  return `<a href="${escapeAttr(href)}">
							<img loading="lazy" decoding="async" width="800" height="450" src="${escapeAttr(src)}" class="attachment-large size-large" alt="${escapeAttr(title)}" />								</a>`;
}

/** HTML for one Elementor loop-1514 blog grid card (Emirati Guard insights). */
export function renderBlogCardHtml(post: PostEntry): string {
  const title = plainText(post.title);
  const href = post.path.endsWith("/") ? post.path : `${post.path}/`;
  const cat = categoryMeta(post);
  const thumbClass = post.featuredImage || post.seo?.ogImage ? "has-post-thumbnail" : "";
  const dateLabel = formatDate(post.date);
  const tagClasses = (post.tags || []).map((id) => `tag-${id}`).join(" ");

  return `<article id="post-${post.id}" class="elementor-post elementor-grid-item ecs-post-loop post-${post.id} post type-post status-publish format-standard ${thumbClass} hentry ${cat.className} ${tagClasses}">
				<div data-elementor-type="loop" data-elementor-id="1514" class="elementor elementor-1514 post-${post.id} post type-post status-publish format-standard ${thumbClass} hentry ${cat.className}" data-elementor-post-type="elementor_library">
					<section class="elementor-section elementor-top-section elementor-element elementor-element-262ad03 elementor-section-boxed elementor-section-height-default elementor-section-height-default wpr-particle-no wpr-jarallax-no wpr-parallax-no wpr-sticky-section-no wpr-column-slider-no wpr-equal-height-no" data-id="262ad03" data-element_type="section" data-e-type="section">
						<div class="elementor-container elementor-column-gap-default">
					<div class="elementor-column elementor-col-100 elementor-top-column elementor-element elementor-element-d1bbcf0" data-id="d1bbcf0" data-element_type="column" data-e-type="column">
			<div class="elementor-widget-wrap elementor-element-populated">
						<div class="elementor-element elementor-element-ad4b51e elementor-widget elementor-widget-image" data-id="ad4b51e" data-element_type="widget" data-e-type="widget" data-widget_type="image.default">
				<div class="elementor-widget-container">
																${cardImage(post, href, title)}															</div>
				</div>
				<section class="elementor-section elementor-inner-section elementor-element elementor-element-1449f51 elementor-section-boxed elementor-section-height-default elementor-section-height-default wpr-particle-no wpr-jarallax-no wpr-parallax-no wpr-sticky-section-no wpr-column-slider-no wpr-equal-height-no" data-id="1449f51" data-element_type="section" data-e-type="section">
						<div class="elementor-container elementor-column-gap-default">
					<div class="elementor-column elementor-col-50 elementor-inner-column elementor-element elementor-element-5cb6bac" data-id="5cb6bac" data-element_type="column" data-e-type="column" data-settings="{&quot;background_background&quot;:&quot;classic&quot;}">
			<div class="elementor-widget-wrap elementor-element-populated">
						<div class="elementor-element elementor-element-808708e elementor-widget elementor-widget-post-info" data-id="808708e" data-element_type="widget" data-e-type="widget" data-widget_type="post-info.default">
				<div class="elementor-widget-container">
							<ul class="elementor-inline-items elementor-icon-list-items elementor-post-info">
								<li class="elementor-icon-list-item elementor-repeater-item-06bbfcb elementor-inline-item" itemprop="about">
													<span class="elementor-icon-list-text elementor-post-info__item elementor-post-info__item--type-terms">
										<span class="elementor-post-info__terms-list">
				<a href="${escapeAttr(cat.path)}" class="elementor-post-info__terms-list-item">${escapeAttr(cat.name)}</a>				</span>
					</span>
								</li>
				</ul>
						</div>
				</div>
				<div class="elementor-element elementor-element-dd686b6 heading-linear elementor-widget elementor-widget-theme-post-title elementor-page-title elementor-widget-heading" data-id="dd686b6" data-element_type="widget" data-e-type="widget" data-widget_type="theme-post-title.default">
				<div class="elementor-widget-container">
					<h1 class="elementor-heading-title elementor-size-default"><a href="${escapeAttr(href)}">${escapeAttr(title)}</a></h1>				</div>
				</div>
				<div class="elementor-element elementor-element-72355a2 elementor-widget__width-auto elementor-widget elementor-widget-post-info" data-id="72355a2" data-element_type="widget" data-e-type="widget" data-widget_type="post-info.default">
				<div class="elementor-widget-container">
							<ul class="elementor-inline-items elementor-icon-list-items elementor-post-info">
								<li class="elementor-icon-list-item elementor-repeater-item-06bbfcb elementor-inline-item" itemprop="datePublished">
													<span class="elementor-icon-list-text elementor-post-info__item elementor-post-info__item--type-date">
										<time datetime="${escapeAttr(post.date)}">${escapeAttr(dateLabel)}</time>					</span>
								</li>
				</ul>
						</div>
				</div>
					</div>
		</div>
				<div class="elementor-column elementor-col-50 elementor-inner-column elementor-element elementor-element-f88007f" data-id="f88007f" data-element_type="column" data-e-type="column">
			<div class="elementor-widget-wrap">
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
