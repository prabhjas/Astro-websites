import { formatDate, getCategories, stripHtml, type PostEntry } from "./content";

/** Matches Insights archive initial grid / Load More page size. */
export const BLOG_LOAD_MORE_PER_PAGE = 12;

/** Matches Insights archive initial grid size. */
export const INSIGHTS_POSTS_PER_PAGE = 12;

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function categoryLabel(post: PostEntry): string {
  const cats = getCategories();
  for (const id of post.categories) {
    const hit = cats.find((c) => c.id === id);
    if (hit?.name) return hit.name;
  }
  return "Blog";
}

function categoryClass(post: PostEntry): string {
  const cats = getCategories();
  for (const id of post.categories) {
    const hit = cats.find((c) => c.id === id);
    if (hit?.slug) return `category-${hit.slug}`;
  }
  return "category-blog";
}

function resolveImageSrc(path: string): string {
  const src = (path || "").trim();
  if (!src) return "";
  const stripped = src.replace(/^https?:\/\/(?:www\.)?iberiaeor\.com/i, "");
  if (/^https?:\/\//i.test(stripped)) return stripped;
  return stripped.startsWith("/") ? stripped : `/${stripped}`;
}

function cardImage(post: PostEntry): string {
  const src = resolveImageSrc(post.featuredImage || post.seo?.ogImage || "");
  if (!src) {
    return `<div class="sp-blog-card-placeholder" style="aspect-ratio:16/9;background:#e8e8e8;" aria-hidden="true"></div>`;
  }
  const alt = escapeAttr(stripHtml(post.title) || "Post image");
  return `<img decoding="async" width="800" height="450" src="${escapeAttr(src)}" class="attachment-large size-large" alt="${alt}" loading="lazy" />`;
}

/**
 * Insights archive card - Elementor loop template 213
 * (image + category/date meta + title + “Read Article”).
 */
export function renderInsightsCardHtml(post: PostEntry): string {
  const title = stripHtml(post.title);
  const href = post.path.endsWith("/") ? post.path : `${post.path}/`;
  const cat = categoryLabel(post);
  const catClass = categoryClass(post);
  const thumbClass = resolveImageSrc(post.featuredImage || post.seo?.ogImage || "")
    ? "has-post-thumbnail"
    : "";
  const dateLabel = formatDate(post.date);
  const tagClasses = (post.tags || []).map((id) => `tag-${id}`).join(" ");

  return `<article id="post-${post.id}" class="elementor-post elementor-grid-item ecs-post-loop post-${post.id} post type-post status-publish format-standard ${thumbClass} hentry ${catClass} ${tagClasses}">
				<div data-elementor-type="loop" data-elementor-id="213" class="elementor elementor-213 post-${post.id} post type-post status-publish format-standard ${thumbClass} hentry ${catClass}" data-elementor-settings="{&quot;ha_cmc_init_switcher&quot;:&quot;no&quot;}" data-elementor-post-type="elementor_library">
					<section class="elementor-section elementor-top-section elementor-element elementor-element-eec02c6 elementor-section-boxed elementor-section-height-default elementor-section-height-default" data-id="eec02c6" data-element_type="section" data-e-type="section" data-settings="{&quot;_ha_eqh_enable&quot;:false}">
						<div class="elementor-container elementor-column-gap-default">
					<div data-ha-element-link="{&quot;url&quot;:&quot;${escapeAttr(href)}&quot;,&quot;is_external&quot;:&quot;&quot;,&quot;nofollow&quot;:&quot;&quot;}" style="cursor: pointer" class="elementor-column elementor-col-100 elementor-top-column elementor-element elementor-element-047d960" data-id="047d960" data-element_type="column" data-e-type="column">
			<div class="elementor-widget-wrap elementor-element-populated">
						<div class="elementor-element elementor-element-dc218b1 elementor-widget elementor-widget-theme-post-featured-image elementor-widget-image" data-id="dc218b1" data-element_type="widget" data-e-type="widget" data-widget_type="theme-post-featured-image.default">
				<div class="elementor-widget-container">
															${cardImage(post)}															</div>
				</div>
				<div class="elementor-element elementor-element-5cc598e elementor-widget elementor-widget-post-info" data-id="5cc598e" data-element_type="widget" data-widget_type="post-info.default">
				<div class="elementor-widget-container">
							<ul class="elementor-inline-items elementor-icon-list-items elementor-post-info">
								<li class="elementor-icon-list-item elementor-repeater-item-6d60e97 elementor-inline-item" itemprop="about">
													<span class="elementor-icon-list-text elementor-post-info__item elementor-post-info__item--type-terms">
										<span class="elementor-post-info__terms-list">
				<span class="elementor-post-info__terms-list-item">${escapeAttr(cat)}</span>				</span>
					</span>
								</li>
				<li class="elementor-icon-list-item elementor-repeater-item-013bae6 elementor-inline-item" itemprop="datePublished">
													<span class="elementor-icon-list-text elementor-post-info__item elementor-post-info__item--type-date">
										<time>${escapeAttr(dateLabel)}</time>					</span>
								</li>
				</ul>
						</div>
				</div>
				<div class="elementor-element elementor-element-8dce244 elementor-widget elementor-widget-theme-post-title elementor-page-title elementor-widget-heading" data-id="8dce244" data-element_type="widget" data-widget_type="theme-post-title.default">
				<div class="elementor-widget-container">
					<h2 class="elementor-heading-title elementor-size-default"><a href="${escapeAttr(href)}">${escapeAttr(title)}</a></h2>				</div>
				</div>
				<div class="elementor-element elementor-element-0072051 elementor-widget elementor-widget-heading" data-id="0072051" data-element_type="widget" data-widget_type="heading.default">
				<div class="elementor-widget-container">
					<div class="elementor-heading-title elementor-size-default"><a href="${escapeAttr(href)}">Read Article</a></div>				</div>
				</div>
					</div>
		</div>
					</div>
		</section>
				</div>
				</article>`;
}

export function renderInsightsCardsHtml(posts: PostEntry[]): string {
  return posts.map(renderInsightsCardHtml).join("\n");
}
