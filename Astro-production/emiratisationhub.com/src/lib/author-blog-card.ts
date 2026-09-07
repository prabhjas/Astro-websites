/**
 * Shared blog card markup for author pages (Astro components + load-more API).
 */
import {
  getPostExcerpt,
  getCategorySlug,
  resolveAuthorDisplayName,
  type BlogPost,
} from './blog.ts';
import { formatPublishedDate } from './blog-format.ts';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function categoryHref(post: BlogPost): string {
  const cat = post.categories[0];
  if (!cat) return '/blog/';
  if (cat.url) {
    const local = cat.url.replace(/^https:\/\/emiratisationhub\.com/i, '');
    return local.endsWith('/') ? local : `${local}/`;
  }
  return `/category/${getCategorySlug(cat)}/`;
}

/** Custom (non-Elementor) card used by the dynamic author rebuild fallback. */
export function buildAuthorBlogCardHtml(post: BlogPost): string {
  const img = post.featuredImage;
  const imgSrc = img?.src || '';
  const imgAlt = escapeHtml(img?.alt || post.title);
  const postUrl = `/${post.slug}/`;
  const title = escapeHtml(post.title);
  const excerpt = escapeHtml(getPostExcerpt(post, 140));
  const cat = post.categories[0];
  const catName = cat ? escapeHtml(cat.name) : '';
  const catUrl = escapeHtml(categoryHref(post));
  const date = escapeHtml(formatPublishedDate(post.publishedAt));

  const imgTag = imgSrc
    ? `<img loading="lazy" decoding="async" width="640" height="400" src="${escapeHtml(imgSrc)}" alt="${imgAlt}" sizes="(max-width: 544px) 100vw, (max-width: 1024px) 50vw, 25vw" />`
    : `<span class="emiratisationhub-author-post-card__thumb-placeholder" aria-hidden="true"></span>`;

  const categoryBlock = catName
    ? `<a class="emiratisationhub-author-post-card__category" href="${catUrl}">${catName}</a>`
    : '';

  return `<article class="emiratisationhub-author-post-card">
  <a class="emiratisationhub-author-post-card__thumb" href="${postUrl}" tabindex="-1">${imgTag}</a>
  <div class="emiratisationhub-author-post-card__body">
    ${categoryBlock}
    <h3 class="emiratisationhub-author-post-card__title"><a href="${postUrl}">${title}</a></h3>
    <p class="emiratisationhub-author-post-card__excerpt">${excerpt}</p>
    <p class="emiratisationhub-author-post-card__meta"><time datetime="${escapeHtml(post.publishedAt)}">${date}</time><span class="emiratisationhub-author-post-card__dot" aria-hidden="true">·</span></p>
    <a class="emiratisationhub-author-post-card__more" href="${postUrl}">Read More</a>
  </div>
</article>`;
}

/**
 * Live author archive card — Elementor loop template 2598
 * (horizontal image + category / date / byline / title / excerpt).
 */
export function buildAuthorElementorLoopCardHtml(post: BlogPost): string {
  const img = post.featuredImage;
  const imgSrc = img?.src || '';
  const imgAlt = escapeHtml(img?.alt || post.title);
  const postUrl = `/${post.slug}/`;
  const title = escapeHtml(post.title);
  const excerpt = escapeHtml(getPostExcerpt(post, 160));
  const date = escapeHtml(formatPublishedDate(post.publishedAt));
  const authorName = escapeHtml(resolveAuthorDisplayName(post));
  const cat = post.categories[0];
  const catName = cat ? escapeHtml(cat.name) : '';
  const catClasses = post.categories
    .map((c) => ` category-${(c.slug || getCategorySlug(c)).toLowerCase().replace(/\s+/g, '-')}`)
    .join('');
  const postDomId = `post-${post.slug.replace(/[^a-z0-9_-]/gi, '-')}`;
  const thumbClass = imgSrc ? ' has-post-thumbnail' : '';
  const imgTag = imgSrc
    ? `<img loading="lazy" decoding="async" width="800" height="450" src="${escapeHtml(imgSrc)}" class="attachment-large size-large" alt="${imgAlt}" />`
    : '';

  const categoryBlock = catName
    ? `<div class="elementor-element elementor-element-3a2f6d2 elementor-widget__width-auto elementor-absolute elementor-widget elementor-widget-post-info" data-id="3a2f6d2" data-element_type="widget" data-e-type="widget" data-settings="{&quot;_position&quot;:&quot;absolute&quot;}" data-widget_type="post-info.default">
				<div class="elementor-widget-container">
							<ul class="elementor-inline-items elementor-icon-list-items elementor-post-info">
								<li class="elementor-icon-list-item elementor-repeater-item-1df0964 elementor-inline-item" itemprop="about">
													<span class="elementor-icon-list-text elementor-post-info__item elementor-post-info__item--type-terms">
										<span class="elementor-post-info__terms-list">
				<span class="elementor-post-info__terms-list-item">${catName}</span>				</span>
					</span>
								</li>
				</ul>
						</div>
				</div>`
    : '';

  return `<article id="${postDomId}" class="elementor-post elementor-grid-item ecs-post-loop ${postDomId} type-post status-publish format-standard${thumbClass} hentry${catClasses}">
				<div data-elementor-type="loop" data-elementor-id="2598" class="elementor elementor-2598 elementor-location-archive ${postDomId} type-post status-publish format-standard${thumbClass} hentry${catClasses}" data-elementor-post-type="elementor_library">
					<section class="elementor-section elementor-top-section elementor-element elementor-element-a9aeabb elementor-section-boxed elementor-section-height-default elementor-section-height-default" data-id="a9aeabb" data-element_type="section" data-e-type="section">
						<div class="elementor-container elementor-column-gap-default">
					<div class="elementor-column elementor-col-50 elementor-top-column elementor-element elementor-element-1b7ba41" data-id="1b7ba41" data-element_type="column" data-e-type="column">
			<div class="elementor-widget-wrap elementor-element-populated">
						<div class="elementor-element elementor-element-b282400 elementor-widget elementor-widget-theme-post-featured-image elementor-widget-image" data-id="b282400" data-element_type="widget" data-e-type="widget" data-widget_type="theme-post-featured-image.default">
				<div class="elementor-widget-container">
																<a href="${postUrl}">
							${imgTag}								</a>
															</div>
				</div>
				${categoryBlock}
					</div>
		</div>
				<div class="elementor-column elementor-col-50 elementor-top-column elementor-element elementor-element-caea212" data-id="caea212" data-element_type="column" data-e-type="column">
			<div class="elementor-widget-wrap elementor-element-populated">
						<div class="elementor-element elementor-element-93f0d03 elementor-widget elementor-widget-post-info" data-id="93f0d03" data-element_type="widget" data-e-type="widget" data-widget_type="post-info.default">
				<div class="elementor-widget-container">
							<ul class="elementor-inline-items elementor-icon-list-items elementor-post-info">
								<li class="elementor-icon-list-item elementor-repeater-item-f3d8c7f elementor-inline-item" itemprop="datePublished">
													<span class="elementor-icon-list-text elementor-post-info__item elementor-post-info__item--type-date">
										<time>${date}</time>					</span>
								</li>
				<li class="elementor-icon-list-item elementor-repeater-item-b4b5bd9 elementor-inline-item" itemprop="author">
										<span class="elementor-icon-list-icon">
								<i aria-hidden="true" class="fas fa-circle"></i>							</span>
									<span class="elementor-icon-list-text elementor-post-info__item elementor-post-info__item--type-author">
							<span class="elementor-post-info__item-prefix">&nbsp;&nbsp;by</span>
										${authorName}					</span>
								</li>
				</ul>
						</div>
				</div>
				<div class="elementor-element elementor-element-517561f elementor-widget elementor-widget-theme-post-title elementor-page-title elementor-widget-heading" data-id="517561f" data-element_type="widget" data-e-type="widget" data-widget_type="theme-post-title.default">
				<div class="elementor-widget-container">
					<h2 class="elementor-heading-title elementor-size-default"><a href="${postUrl}">${title}</a></h2>				</div>
				</div>
				<div class="elementor-element elementor-element-0f35299 elementor-widget elementor-widget-theme-post-excerpt" data-id="0f35299" data-element_type="widget" data-e-type="widget" data-widget_type="theme-post-excerpt.default">
				<div class="elementor-widget-container">
					<p>${excerpt}				</div>
				</div>
					</div>
		</div>
					</div>
		</section>
				</div>
				</article>`;
}
