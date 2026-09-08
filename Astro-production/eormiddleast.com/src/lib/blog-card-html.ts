import { formatDate, getCategories, stripHtml, type PostEntry } from "./content";

export const BLOG_LOAD_MORE_PER_PAGE = 12;
/** Left featured card on /insights/ News & Articles. */
export const INSIGHTS_FEATURED_COUNT = 1;
/** Right "// LATEST" list — live Elementor layout shows exactly 2 posts. */
export const INSIGHTS_LATEST_COUNT = 2;

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function categoryClass(post: PostEntry): string {
  const cats = getCategories();
  for (const id of post.categories) {
    const hit = cats.find((c) => c.id === id);
    if (hit?.slug) return `category-${hit.slug}`;
  }
  return "category-blog";
}

function excerptText(post: PostEntry, max = 120): string {
  const raw = stripHtml(post.excerpt || post.content || "").slice(0, max).trim();
  return raw ? `${raw}${raw.length >= max ? "…" : ""}` : "";
}

function postHref(post: PostEntry): string {
  return post.path.endsWith("/") ? post.path : `${post.path}/`;
}

function thumbClass(post: PostEntry): string {
  return post.featuredImage || post.seo?.ogImage ? "has-post-thumbnail" : "";
}

function featuredImageBlock(post: PostEntry): string {
  const src = (post.featuredImage || post.seo?.ogImage || "").trim();
  const href = escapeAttr(postHref(post));
  if (!src) {
    return `<div class="sp-blog-card-placeholder" style="aspect-ratio:16/9;background:#e8eef5;" aria-hidden="true"></div>`;
  }
  const alt = escapeAttr(stripHtml(post.title) || "Post image");
  return `<a href="${href}">
							<img loading="lazy" decoding="async" width="1140" height="641" src="${escapeAttr(src)}" class="attachment-large size-large" alt="${alt}">								</a>`;
}

/** Featured card — Elementor loop template 21423 (image + author + date + title + excerpt). */
export function renderInsightsFeaturedCardHtml(post: PostEntry): string {
  const title = stripHtml(post.title);
  const href = escapeAttr(postHref(post));
  const catClass = categoryClass(post);
  const thumb = thumbClass(post);
  const excerpt = escapeAttr(excerptText(post, 140));
  const author = escapeAttr(stripHtml(post.authorName || ""));
  const dateLabel = escapeAttr(formatDate(post.date));

  return `<article id="post-${post.id}" class="elementor-post elementor-grid-item ecs-post-loop post-${post.id} post type-post status-publish format-standard ${thumb} hentry ${catClass}">
				<div data-elementor-type="loop" data-elementor-id="21423" class="elementor elementor-21423 post-${post.id} post type-post status-publish format-standard ${thumb} hentry ${catClass}" data-elementor-post-type="elementor_library">
					<section class="elementor-section elementor-top-section elementor-element elementor-element-ddd640c elementor-section-boxed elementor-section-height-default elementor-section-height-default" data-id="ddd640c" data-element_type="section" data-e-type="section">
						<div class="elementor-container elementor-column-gap-default">
					<div class="elementor-column elementor-col-100 elementor-top-column elementor-element elementor-element-dfcf983" data-id="dfcf983" data-element_type="column" data-e-type="column">
			<div class="elementor-widget-wrap elementor-element-populated">
						<div class="elementor-element elementor-element-47754f8 elementor-widget elementor-widget-theme-post-featured-image elementor-widget-image" data-id="47754f8" data-element_type="widget" data-e-type="widget" data-widget_type="theme-post-featured-image.default">
				<div class="elementor-widget-container">
																${featuredImageBlock(post)}
															</div>
				</div>
				<div class="elementor-element elementor-element-bc5e5f3 elementor-widget__width-auto elementor-widget elementor-widget-post-info" data-id="bc5e5f3" data-element_type="widget" data-e-type="widget" data-widget_type="post-info.default">
				<div class="elementor-widget-container">
							<ul class="elementor-inline-items elementor-icon-list-items elementor-post-info">
								<li class="elementor-icon-list-item elementor-repeater-item-2140026 elementor-inline-item" itemprop="author">
													<span class="elementor-icon-list-text elementor-post-info__item elementor-post-info__item--type-author">
										${author}					</span>
								</li>
				</ul>
						</div>
				</div>
				<div class="elementor-element elementor-element-0264f91 elementor-widget__width-auto elementor-widget elementor-widget-post-info" data-id="0264f91" data-element_type="widget" data-e-type="widget" data-widget_type="post-info.default">
				<div class="elementor-widget-container">
							<ul class="elementor-inline-items elementor-icon-list-items elementor-post-info">
								<li class="elementor-icon-list-item elementor-repeater-item-2140026 elementor-inline-item" itemprop="datePublished">
													<span class="elementor-icon-list-text elementor-post-info__item elementor-post-info__item--type-date">
										<time datetime="${escapeAttr(post.date)}">${dateLabel}</time>					</span>
								</li>
				</ul>
						</div>
				</div>
				<div class="elementor-element elementor-element-cd863d9 elementor-widget elementor-widget-theme-post-title elementor-page-title elementor-widget-heading" data-id="cd863d9" data-element_type="widget" data-e-type="widget" data-widget_type="theme-post-title.default">
				<div class="elementor-widget-container">
					<h3 class="elementor-heading-title elementor-size-default"><a href="${href}">${escapeAttr(title)}</a></h3>				</div>
				</div>
				<div class="elementor-element elementor-element-43c46ca elementor-widget elementor-widget-theme-post-excerpt" data-id="43c46ca" data-element_type="widget" data-e-type="widget" data-widget_type="theme-post-excerpt.default">
				<div class="elementor-widget-container">
					<p>${excerpt}				</p></div>
				</div>
				<div class="elementor-element elementor-element-4579f9c elementor-widget elementor-widget-button" data-id="4579f9c" data-element_type="widget" data-e-type="widget" data-widget_type="button.default">
				<div class="elementor-widget-container">
									<div class="elementor-button-wrapper">
					<a class="elementor-button elementor-button-link elementor-size-sm" href="${href}">
						<span class="elementor-button-content-wrapper">
						<span class="elementor-button-icon">
				<i aria-hidden="true" class="fas fa-arrow-right"></i>			</span>
									<span class="elementor-button-text">Read More</span>
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

/** Grid card — Elementor loop template 21445 (author + date + title + excerpt). */
export function renderBlogCardHtml(post: PostEntry): string {
  const title = stripHtml(post.title);
  const href = escapeAttr(postHref(post));
  const catClass = categoryClass(post);
  const thumb = thumbClass(post);
  const excerpt = escapeAttr(excerptText(post, 90));
  const author = escapeAttr(stripHtml(post.authorName || ""));
  const dateLabel = escapeAttr(formatDate(post.date));

  return `<article id="post-${post.id}" class="elementor-post elementor-grid-item ecs-post-loop post-${post.id} post type-post status-publish format-standard ${thumb} hentry ${catClass}">
				<div data-elementor-type="loop" data-elementor-id="21445" class="elementor elementor-21445 post-${post.id} post type-post status-publish format-standard ${thumb} hentry ${catClass}" data-elementor-post-type="elementor_library">
					<section class="elementor-section elementor-top-section elementor-element elementor-element-5b30a6a newsletter-title elementor-section-boxed elementor-section-height-default elementor-section-height-default" data-id="5b30a6a" data-element_type="section" data-e-type="section">
						<div class="elementor-container elementor-column-gap-default">
					<div class="elementor-column elementor-col-100 elementor-top-column elementor-element elementor-element-ea53409" data-id="ea53409" data-element_type="column" data-e-type="column">
			<div class="elementor-widget-wrap elementor-element-populated">
						<div class="elementor-element elementor-element-817203b elementor-widget__width-auto elementor-widget elementor-widget-post-info" data-id="817203b" data-element_type="widget" data-e-type="widget" data-widget_type="post-info.default">
				<div class="elementor-widget-container">
							<ul class="elementor-inline-items elementor-icon-list-items elementor-post-info">
								<li class="elementor-icon-list-item elementor-repeater-item-2140026 elementor-inline-item" itemprop="author">
													<span class="elementor-icon-list-text elementor-post-info__item elementor-post-info__item--type-author">
										${author}					</span>
								</li>
				</ul>
						</div>
				</div>
				<div class="elementor-element elementor-element-6146a4a elementor-widget__width-auto elementor-widget elementor-widget-post-info" data-id="6146a4a" data-element_type="widget" data-e-type="widget" data-widget_type="post-info.default">
				<div class="elementor-widget-container">
							<ul class="elementor-inline-items elementor-icon-list-items elementor-post-info">
								<li class="elementor-icon-list-item elementor-repeater-item-2140026 elementor-inline-item" itemprop="datePublished">
													<span class="elementor-icon-list-text elementor-post-info__item elementor-post-info__item--type-date">
										<time datetime="${escapeAttr(post.date)}">${dateLabel}</time>					</span>
								</li>
				</ul>
						</div>
				</div>
				<div class="elementor-element elementor-element-734dd72 elementor-widget elementor-widget-theme-post-title elementor-page-title elementor-widget-heading" data-id="734dd72" data-element_type="widget" data-e-type="widget" data-widget_type="theme-post-title.default">
				<div class="elementor-widget-container">
					<h3 class="elementor-heading-title elementor-size-default"><a href="${href}">${escapeAttr(title)}</a></h3>				</div>
				</div>
				<div class="elementor-element elementor-element-0e99783 elementor-widget elementor-widget-theme-post-excerpt" data-id="0e99783" data-element_type="widget" data-e-type="widget" data-widget_type="theme-post-excerpt.default">
				<div class="elementor-widget-container">
					<p>${excerpt}				</p></div>
				</div>
				<div class="elementor-element elementor-element-887701e elementor-widget elementor-widget-button" data-id="887701e" data-element_type="widget" data-e-type="widget" data-widget_type="button.default">
				<div class="elementor-widget-container">
									<div class="elementor-button-wrapper">
					<a class="elementor-button elementor-button-link elementor-size-sm" href="${href}">
						<span class="elementor-button-content-wrapper">
						<span class="elementor-button-icon">
				<i aria-hidden="true" class="fas fa-arrow-right"></i>			</span>
									<span class="elementor-button-text">Read More</span>
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

export function renderInsightsFeaturedCardsHtml(posts: PostEntry[]): string {
  return posts.map(renderInsightsFeaturedCardHtml).join("\n");
}

/** Replace inner HTML of the Nth `.ecs-posts` container (1-based). */
export function replaceEcsPostsInner(html: string, nth: number, innerHtml: string): string {
  const re = /<div([^>]*class="[^"]*ecs-posts[^"]*"[^>]*)>/gi;
  const opens: { index: number; length: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    opens.push({ index: m.index, length: m[0].length });
  }
  const target = opens[nth - 1];
  if (!target) return html;

  let pos = target.index + target.length;
  let depth = 1;
  while (pos < html.length && depth > 0) {
    const nextOpen = html.indexOf("<div", pos);
    const nextClose = html.indexOf("</div>", pos);
    if (nextClose < 0) break;
    if (nextOpen >= 0 && nextOpen < nextClose) {
      depth += 1;
      pos = nextOpen + 4;
    } else {
      depth -= 1;
      if (depth === 0) {
        return (
          html.slice(0, target.index + target.length) +
          `\n${innerHtml}\n` +
          html.slice(nextClose)
        );
      }
      pos = nextClose + 6;
    }
  }
  return html;
}
