import {
  formatDate,
  getCategories,
  getPosts,
  stripHtml,
  type PostEntry,
} from "./content";

const FILTER_SLUGS = [
  "employee-relocation",
  "employer-of-record",
  "employment-visa",
  "hr-services",
] as const;

const MAX_PER_FILTER = 3;

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function resolveImageSrc(path: string): string {
  const src = (path || "").trim();
  if (!src) return "";
  const stripped = src.replace(/^https?:\/\/(?:www\.)?iberiaeor\.com/i, "");
  if (/^https?:\/\//i.test(stripped)) return stripped;
  return stripped.startsWith("/") ? stripped : `/${stripped}`;
}

function primaryCategory(post: PostEntry): { name: string; slug: string } {
  const cats = getCategories();
  for (const id of post.categories) {
    const hit = cats.find((c) => c.id === id);
    if (hit?.slug) return { name: hit.name, slug: hit.slug };
  }
  return { name: "Blog", slug: "blog" };
}

function excerptText(post: PostEntry): string {
  const raw = stripHtml(post.excerpt || post.content || "")
    .slice(0, 120)
    .trim();
  return raw ? `${raw}${raw.length >= 120 ? "…" : ""}` : "";
}

/** Elementor loop template 6910 card used by “The Latest Post” grids. */
export function renderLatestPostCardHtml(post: PostEntry, opts?: { hidden?: boolean }): string {
  const title = stripHtml(post.title);
  const href = post.path.endsWith("/") ? post.path : `${post.path}/`;
  const { name: catName, slug: catSlug } = primaryCategory(post);
  const img = resolveImageSrc(post.featuredImage || post.seo?.ogImage || "");
  const date = formatDate(post.date);
  const excerpt = excerptText(post);
  const hiddenAttr = opts?.hidden ? ' style="display:none"' : "";
  const thumbClass = img ? "has-post-thumbnail" : "";
  const imgHtml = img
    ? `<img loading="lazy" decoding="async" width="800" height="450" src="${escapeAttr(img)}" class="attachment-large size-large" alt="${escapeAttr(title)}">`
    : `<div style="aspect-ratio:16/9;background:#e8e8e8;border-radius:12px" aria-hidden="true"></div>`;

  return `<div data-elementor-type="loop-item" data-elementor-id="6910" data-sp-filter-extra="1"${hiddenAttr} class="elementor elementor-6910 e-loop-item e-loop-item-${post.id} post-${post.id} post type-post status-publish format-standard ${thumbClass} hentry category-${escapeAttr(catSlug)}" data-elementor-settings="{&quot;ha_cmc_init_switcher&quot;:&quot;no&quot;}" data-elementor-post-type="elementor_library" data-custom-edit-handle="1">
					<section class="elementor-section elementor-top-section elementor-element elementor-element-3f5d626 grid-blog elementor-section-boxed elementor-section-height-default elementor-section-height-default" data-id="3f5d626" data-element_type="section" data-e-type="section" data-settings="{&quot;_ha_eqh_enable&quot;:false}">
						<div class="elementor-container elementor-column-gap-default">
					<div data-ha-element-link="{&quot;url&quot;:&quot;${escapeAttr(href)}&quot;,&quot;is_external&quot;:&quot;&quot;,&quot;nofollow&quot;:&quot;&quot;}" style="cursor: pointer" class="elementor-column elementor-col-100 elementor-top-column elementor-element elementor-element-26f6ae2" data-id="26f6ae2" data-element_type="column" data-e-type="column">
			<div class="elementor-widget-wrap elementor-element-populated">
						<div class="elementor-element elementor-element-8cecc4d elementor-widget elementor-widget-theme-post-featured-image elementor-widget-image" data-id="8cecc4d" data-element_type="widget" data-e-type="widget" data-widget_type="theme-post-featured-image.default">
				<div class="elementor-widget-container">
															${imgHtml}															</div>
				</div>
				<div class="elementor-element elementor-element-030fde5 elementor-widget elementor-widget-post-info" data-id="030fde5" data-element_type="widget" data-e-type="widget" data-widget_type="post-info.default">
				<div class="elementor-widget-container">
							<ul class="elementor-inline-items elementor-icon-list-items elementor-post-info">
								<li class="elementor-icon-list-item elementor-repeater-item-6d60e97 elementor-inline-item" itemprop="about">
													<span class="elementor-icon-list-text elementor-post-info__item elementor-post-info__item--type-terms">
										<span class="elementor-post-info__terms-list">
				<span class="elementor-post-info__terms-list-item">${escapeAttr(catName)}</span>				</span>
					</span>
								</li>
				<li class="elementor-icon-list-item elementor-repeater-item-013bae6 elementor-inline-item" itemprop="datePublished">
													<span class="elementor-icon-list-text elementor-post-info__item elementor-post-info__item--type-date">
										<time>${escapeAttr(date)}</time>					</span>
								</li>
				</ul>
						</div>
				</div>
				<div class="elementor-element elementor-element-875d4be elementor-widget elementor-widget-theme-post-title elementor-page-title elementor-widget-heading" data-id="875d4be" data-element_type="widget" data-e-type="widget" data-widget_type="theme-post-title.default">
				<div class="elementor-widget-container">
					<h2 class="elementor-heading-title elementor-size-default"><a href="${escapeAttr(href)}">${escapeAttr(title)}</a></h2>				</div>
				</div>
				<div class="elementor-element elementor-element-6f78b83 elementor-widget elementor-widget-theme-post-excerpt" data-id="6f78b83" data-element_type="widget" data-e-type="widget" data-widget_type="theme-post-excerpt.default">
				<div class="elementor-widget-container">
					<p>${escapeAttr(excerpt)}</p></div>
				</div>
				<div class="elementor-element elementor-element-1c8d3ed elementor-widget elementor-widget-heading" data-id="1c8d3ed" data-element_type="widget" data-e-type="widget" data-widget_type="heading.default">
				<div class="elementor-widget-container">
					<div class="elementor-heading-title elementor-size-default"><a href="${escapeAttr(href)}">Read Article</a></div>				</div>
				</div>
					</div>
		</div>
					</div>
		</section>
				</div>`;
}

function postsForSlug(slug: string, excludeIds: Set<number>): PostEntry[] {
  const cats = getCategories();
  const cat = cats.find((c) => c.slug === slug);
  if (!cat) return [];
  return getPosts()
    .filter((p) => p.categories.includes(cat.id) && !excludeIds.has(p.id))
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
    .slice(0, MAX_PER_FILTER);
}

/** Find the character index of the `</div>` that closes the loop container. */
function findLoopContainerClose(html: string): number {
  const openTag = '<div class="elementor-loop-container elementor-grid" role="list">';
  const start = html.indexOf(openTag);
  if (start < 0) return -1;

  let i = start + openTag.length;
  let depth = 1;
  while (i < html.length && depth > 0) {
    const nextOpen = html.indexOf("<div", i);
    const nextClose = html.indexOf("</div>", i);
    if (nextClose < 0) return -1;
    if (nextOpen >= 0 && nextOpen < nextClose) {
      depth += 1;
      i = nextOpen + 4;
    } else {
      depth -= 1;
      if (depth === 0) return nextClose;
      i = nextClose + 6;
    }
  }
  return -1;
}

/**
 * Make “The Latest Post” taxonomy filter work without Elementor Pro AJAX:
 * - Label __all as Blog
 * - Tag baked-in loop cards as the Blog (default) set
 * - Inject up to 3 hidden cards per category filter for client-side filtering
 */
export function enhanceLatestPostFilterHtml(html: string): string {
  if (
    !html.includes("elementor-widget-taxonomy-filter") ||
    !html.includes("elementor-widget-loop-grid") ||
    !html.includes('data-elementor-id="6910"')
  ) {
    return html;
  }

  let out = html.replace(
    /(<button\s+class="e-filter-item"\s+data-filter="__all"[^>]*>)\s*All\s*(<\/button>)/i,
    "$1Blog$2",
  );

  out = out.replace(
    /<div(\s+data-elementor-type="loop-item"\s+data-elementor-id="6910")/g,
    '<div data-sp-blog-default="1"$1',
  );

  const defaultIds = new Set<number>();
  for (const m of out.matchAll(
    /data-sp-blog-default="1"[^>]*class="[^"]*\bpost-(\d+)\b/g,
  )) {
    defaultIds.add(Number(m[1]));
  }

  const extras: string[] = [];
  const seen = new Set(defaultIds);
  for (const slug of FILTER_SLUGS) {
    for (const post of postsForSlug(slug, seen)) {
      seen.add(post.id);
      extras.push(renderLatestPostCardHtml(post, { hidden: true }));
    }
  }

  if (!extras.length) return out;

  const closeAt = findLoopContainerClose(out);
  if (closeAt < 0) return out;

  const extraHtml = `\n${extras.join("\n")}\n`;
  return out.slice(0, closeAt) + extraHtml + out.slice(closeAt);
}
