import { existsSync } from "node:fs";
import { join } from "node:path";
import { formatDate, getCategories, stripHtml, type PostEntry } from "./content";

/** Connect FM Elementor loop-grid page size (initial scrape had 15). */
export const BLOG_LOAD_MORE_PER_PAGE = 15;

const LIVE_ORIGIN = "https://connectfm.ae";

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

function categoryLinks(post: PostEntry): string {
  const cats = getCategories();
  const links: string[] = [];
  for (const id of post.categories) {
    const hit = cats.find((c) => c.id === id);
    if (!hit?.name) continue;
    const path = hit.path || `/category/${hit.slug || "blog"}/`;
    links.push(`<a href="${escapeAttr(path)}" rel="tag">${escapeAttr(plainText(hit.name))}</a>`);
  }
  if (!links.length) {
    links.push(`<a href="/blog/" rel="tag">Blog</a>`);
  }
  return links.join(", ");
}

function categoryClasses(post: PostEntry): string {
  const cats = getCategories();
  return post.categories
    .map((id) => cats.find((c) => c.id === id)?.slug)
    .filter(Boolean)
    .map((slug) => `category-${slug}`)
    .join(" ");
}

function resolveImageSrc(path: string): string {
  const src = path.trim();
  if (!src) return "";
  if (/^https?:\/\//i.test(src)) return src;
  const rel = src.replace(/^\//, "");
  if (existsSync(join(process.cwd(), "public", rel))) {
    return src.startsWith("/") ? src : `/${src}`;
  }
  return `${LIVE_ORIGIN}${src.startsWith("/") ? src : `/${src}`}`;
}

function dateArchivePath(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(+d)) return "/blog/";
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `/${y}/${m}/${day}/`;
}

/** HTML for one Connect FM Elementor loop template 2553 card. */
export function renderBlogCardHtml(post: PostEntry): string {
  const title = plainText(post.title);
  const href = post.path.endsWith("/") ? post.path : `${post.path}/`;
  const thumbClass = post.featuredImage || post.seo?.ogImage ? "has-post-thumbnail" : "";
  const dateLabel = formatDate(post.date);
  const dateHref = dateArchivePath(post.date);
  const catClass = categoryClasses(post);
  const tagClasses = (post.tags || []).map((id) => `tag-${id}`).join(" ");
  const imgSrc = resolveImageSrc(post.featuredImage || post.seo?.ogImage || "");
  const img = imgSrc
    ? `<a href="${escapeAttr(href)}">
							<img loading="lazy" decoding="async" width="800" height="534" src="${escapeAttr(imgSrc)}" class="attachment-large size-large" alt="${escapeAttr(title)}" />								</a>`
    : `<a href="${escapeAttr(href)}" aria-label="${escapeAttr(title)}"></a>`;

  return `<div data-elementor-type="loop-item" data-elementor-id="2553" class="elementor elementor-2553 e-loop-item e-loop-item-${post.id} post-${post.id} post type-post status-publish format-standard ${thumbClass} hentry ${catClass} ${tagClasses}" data-elementor-post-type="elementor_library">
			<div class="elementor-element elementor-element-efccfe4 e-flex e-con-boxed e-con e-parent" data-id="efccfe4" data-element_type="container" data-e-type="container">
					<div class="e-con-inner">
				<div class="elementor-element elementor-element-eda9ec8 elementor-widget elementor-widget-theme-post-featured-image elementor-widget-image" data-id="eda9ec8" data-element_type="widget" data-e-type="widget" data-widget_type="theme-post-featured-image.default">
																${img}
															</div>
				<div class="elementor-element elementor-element-6185f82 elementor-widget elementor-widget-post-info" data-id="6185f82" data-element_type="widget" data-e-type="widget" data-widget_type="post-info.default">
							<ul class="elementor-inline-items elementor-icon-list-items elementor-post-info">
								<li class="elementor-icon-list-item elementor-repeater-item-8e38d38 elementor-inline-item">
													<span class="elementor-icon-list-text elementor-post-info__item elementor-post-info__item--type-custom">
										${categoryLinks(post)}					</span>
								</li>
				</ul>
						</div>
				<div class="elementor-element elementor-element-91525b2 elementor-widget elementor-widget-theme-post-title elementor-page-title elementor-widget-heading" data-id="91525b2" data-element_type="widget" data-e-type="widget" data-widget_type="theme-post-title.default">
					<h2 class="elementor-heading-title elementor-size-default"><a href="${escapeAttr(href)}">${escapeAttr(title)}</a></h2>				</div>
		<div class="elementor-element elementor-element-a2f8446 e-con-full e-flex e-con e-child" data-id="a2f8446" data-element_type="container" data-e-type="container">
				<div class="elementor-element elementor-element-b69b340 elementor-widget elementor-widget-post-info" data-id="b69b340" data-element_type="widget" data-e-type="widget" data-widget_type="post-info.default">
							<ul class="elementor-inline-items elementor-icon-list-items elementor-post-info">
								<li class="elementor-icon-list-item elementor-repeater-item-9633aa9 elementor-inline-item" itemprop="datePublished">
						<a href="${escapeAttr(dateHref)}">
											<span class="elementor-icon-list-text elementor-post-info__item elementor-post-info__item--type-date">
										<time datetime="${escapeAttr(post.date)}">${escapeAttr(dateLabel)}</time>					</span>
					</a>
								</li>
				</ul>
						</div>
				</div>
					</div>
				</div>
				</div>`;
}

export function renderBlogCardsHtml(posts: PostEntry[]): string {
  return posts.map(renderBlogCardHtml).join("\n");
}
