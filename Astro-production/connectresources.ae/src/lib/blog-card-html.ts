import { getCategories, stripHtml, type PostEntry } from "./content";

/** Matches Elementor loop template 540 (featured image + category + title + excerpt + CTA). */
const CATEGORY_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="25" viewBox="0 0 24 25" fill="none"><path d="M21.8418 7.18675C21.7417 6.95231 21.5978 6.73915 21.4178 6.55875C21.232 6.37182 21.011 6.22346 20.7677 6.12221C20.5243 6.02096 20.2633 5.9688 19.9998 5.96875H7.99977C7.70277 5.96875 7.42177 6.10075 7.23077 6.32775L2.23077 12.3278C1.92177 12.6988 1.92177 13.2378 2.23077 13.6088L7.23077 19.6087C7.42177 19.8367 7.70277 19.9688 7.99977 19.9688H19.9998C20.2616 19.9698 20.521 19.9189 20.7631 19.819C21.0051 19.7191 21.2249 19.5722 21.4098 19.3867C21.5967 19.2009 21.7451 18.98 21.8463 18.7366C21.9476 18.4933 21.9997 18.2323 21.9998 17.9688V7.96875C21.9998 7.70342 21.9471 7.44275 21.8418 7.18675Z" fill="#FFDD04"></path></svg>`;

const ARROW_ICON = `<svg aria-hidden="true" class="e-font-icon-svg e-fas-arrow-right" viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg"><path d="M190.5 66.9l22.2-22.2c9.4-9.4 24.6-9.4 33.9 0L441 239c9.4 9.4 9.4 24.6 0 33.9L246.6 467.3c-9.4 9.4-24.6 9.4-33.9 0l-22.2-22.2c-9.5-9.5-9.3-25 .4-34.3L311.4 296H24c-13.3 0-24-10.7-24-24v-32c0-13.3 10.7-24 24-24h287.4L190.9 101.2c-9.8-9.3-10-24.8-.4-34.3z"></path></svg>`;

export const BLOG_LOAD_MORE_PER_PAGE = 12;

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

function cardImage(post: PostEntry): string {
  const src = (post.featuredImage || post.seo?.ogImage || "").trim();
  if (!src) {
    return `<div class="sp-blog-card-placeholder" style="aspect-ratio:16/9;background:#1f1f1f;" aria-hidden="true"></div>`;
  }
  const alt = escapeAttr(stripHtml(post.title) || "Post image");
  return `<img decoding="async" width="800" height="450" src="${escapeAttr(src)}" class="attachment-large size-large" alt="${alt}" loading="lazy">`;
}

function excerptText(post: PostEntry): string {
  const raw = stripHtml(post.excerpt || post.content || "").slice(0, 160).trim();
  return raw ? `${raw}${raw.length >= 160 ? "…" : ""}` : "";
}

/** HTML for one Elementor-style blog grid card. */
export function renderBlogCardHtml(post: PostEntry): string {
  const title = stripHtml(post.title);
  const href = post.path.endsWith("/") ? post.path : `${post.path}/`;
  const cat = categoryLabel(post);
  const catClass = categoryClass(post);
  const thumbClass = post.featuredImage ? "has-post-thumbnail" : "";
  const excerpt = excerptText(post);
  const tagClasses = (post.tags || [])
    .map((id) => `tag-${id}`)
    .join(" ");

  return `<article id="post-${post.id}" class="elementor-post elementor-grid-item ecs-post-loop post-${post.id} post type-post status-publish format-standard ${thumbClass} hentry ${catClass} ${tagClasses}">
				<div data-elementor-type="loop" data-elementor-id="540" class="elementor elementor-540 post-${post.id} post type-post status-publish format-standard ${thumbClass} hentry ${catClass}" data-elementor-post-type="elementor_library">
					<section class="elementor-section elementor-top-section elementor-element elementor-element-b01304e elementor-section-boxed elementor-section-height-default elementor-section-height-default" data-id="b01304e" data-element_type="section" data-settings="{&quot;background_background&quot;:&quot;classic&quot;}">
						<div class="elementor-container elementor-column-gap-no">
					<div class="elementor-column elementor-col-100 elementor-top-column elementor-element elementor-element-730151a col-hov" data-id="730151a" data-element_type="column" data-settings="{&quot;background_background&quot;:&quot;classic&quot;}">
			<div class="elementor-widget-wrap elementor-element-populated">
						<div class="elementor-element elementor-element-dbe211f elementor-widget elementor-widget-theme-post-featured-image elementor-widget-image" data-id="dbe211f" data-element_type="widget" data-widget_type="theme-post-featured-image.default">
				<div class="elementor-widget-container">
															${cardImage(post)}															</div>
				</div>
				<div class="elementor-element elementor-element-c3ca6b8 elementor-align-left elementor-widget elementor-widget-post-info" data-id="c3ca6b8" data-element_type="widget" data-widget_type="post-info.default">
				<div class="elementor-widget-container">
							<ul class="elementor-inline-items elementor-icon-list-items elementor-post-info">
								<li class="elementor-icon-list-item elementor-repeater-item-ef9c6cb elementor-inline-item" itemprop="about">
										<span class="elementor-icon-list-icon">
								${CATEGORY_ICON}							</span>
									<span class="elementor-icon-list-text elementor-post-info__item elementor-post-info__item--type-terms">
										<span class="elementor-post-info__terms-list">
				<span class="elementor-post-info__terms-list-item">${escapeAttr(cat)}</span>				</span>
					</span>
								</li>
				</ul>
						</div>
				</div>
				<div class="elementor-element elementor-element-af1da43 elementor-widget elementor-widget-theme-post-title elementor-page-title elementor-widget-heading" data-id="af1da43" data-element_type="widget" data-widget_type="theme-post-title.default">
				<div class="elementor-widget-container">
					<h2 class="elementor-heading-title elementor-size-default"><a href="${escapeAttr(href)}">${escapeAttr(title)}</a></h2>				</div>
				</div>
				<div class="elementor-element elementor-element-feef7b2 elementor-widget elementor-widget-theme-post-excerpt" data-id="feef7b2" data-element_type="widget" data-widget_type="theme-post-excerpt.default">
				<div class="elementor-widget-container">
					<p>${escapeAttr(excerpt)}				</p></div>
				</div>
				<div class="elementor-element elementor-element-e0046b6 elementor-widget elementor-widget-button" data-id="e0046b6" data-element_type="widget" data-widget_type="button.default">
				<div class="elementor-widget-container">
									<div class="elementor-button-wrapper">
					<a class="elementor-button elementor-button-link elementor-size-sm" href="${escapeAttr(href)}">
						<span class="elementor-button-content-wrapper">
						<span class="elementor-button-icon">
				${ARROW_ICON}			</span>
									<span class="elementor-button-text">Read MORE</span>
					</span>
					</a>
				</div>
								</div>
				</div>
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

/** Relative date label matching Impreza insights grid ("3 days ago"). */
export function relativePostDate(date: string): string {
  const then = new Date(date).getTime();
  if (!Number.isFinite(then)) return "";
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days < 1) {
    if (hours < 1) return minutes <= 1 ? "1 minute ago" : `${minutes} minutes ago`;
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  }
  if (days < 7) return days === 1 ? "1 day ago" : `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return months === 1 ? "1 month ago" : `${months} months ago`;
  const years = Math.floor(days / 365);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}

function categorySlugClass(post: PostEntry): string {
  const cats = getCategories();
  for (const id of post.categories) {
    const hit = cats.find((c) => c.id === id);
    if (hit?.slug) return `category-${hit.slug}`;
  }
  return "category-uncategorized";
}

/**
 * Impreza `w-grid` card HTML used on /insights/ (items_layout 38092).
 * Matches the static markup already on the page so Load More appends cleanly.
 */
export function renderImprezaGridCardHtml(post: PostEntry): string {
  const title = stripHtml(post.title);
  const href = post.path.endsWith("/") ? post.path : `${post.path}/`;
  const img = (post.featuredImage || post.seo?.ogImage || "").trim();
  const alt = escapeAttr(title || "Post image");
  const catClass = categorySlugClass(post);
  const thumbClass = img ? "has-post-thumbnail" : "";
  const when = relativePostDate(post.date);
  const datetime = escapeAttr(post.date || "");
  const imgHtml = img
    ? `<img loading="lazy" decoding="async" width="1920" height="1080" src="${escapeAttr(img)}" class="attachment-full size-full wp-post-image" alt="${alt}" />`
    : `<span class="w-post-elm-empty" aria-hidden="true"></span>`;

  return `<article class="w-grid-item size_1x1 post-${post.id} post type-post status-publish format-standard ${thumbClass} hentry ${catClass}" data-id="${post.id}">
		<div class="w-grid-item-h">
						<div class="w-post-elm post_image usg_post_image_1 stretched"><a href="${escapeAttr(href)}" aria-label="${escapeAttr(title)}">${imgHtml}</a></div><div class="w-vwrapper usg_vwrapper_1 align_left valign_top"><time class="w-post-elm post_date usg_post_date_1 has_text_color entry-date published" datetime="${datetime}">${escapeAttr(when)}</time><p class="w-post-elm post_title usg_post_title_1 has_text_color entry-title color_link_inherit"><a href="${escapeAttr(href)}">${escapeAttr(title)}</a></p></div>		</div>
			</article>`;
}

export function renderImprezaGridCardsHtml(posts: PostEntry[]): string {
  return posts.map(renderImprezaGridCardHtml).join("\n");
}
