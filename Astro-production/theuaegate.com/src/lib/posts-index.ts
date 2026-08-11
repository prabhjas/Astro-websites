/**
 * Mirror-backed posts/law index for listing APIs (replaces empty JSON blog store).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const INDEX_PATH = join(ROOT, 'src/data/posts-index.json');

export interface IndexedCategory {
  id: number;
  name: string;
  slug: string;
}

export interface IndexedPost {
  slug: string;
  kind: 'post' | 'law';
  title: string;
  description: string;
  image: string;
  publishedAt: string;
  modifiedAt: string;
  categories: IndexedCategory[];
  url: string;
  author?: string;
}

interface PostsIndexFile {
  generatedAt?: string;
  categories?: IndexedCategory[];
  posts: IndexedPost[];
  law: IndexedPost[];
  counts?: { posts: number; law: number; missing: number };
}

let cached: PostsIndexFile | null = null;

export function loadPostsIndex(): PostsIndexFile {
  if (cached) return cached;
  if (!existsSync(INDEX_PATH)) {
    cached = { posts: [], law: [], categories: [] };
    return cached;
  }
  cached = JSON.parse(readFileSync(INDEX_PATH, 'utf8')) as PostsIndexFile;
  return cached;
}

export function getIndexedPosts(): IndexedPost[] {
  return loadPostsIndex().posts || [];
}

export function getIndexedLaw(): IndexedPost[] {
  return loadPostsIndex().law || [];
}

export function escapeHtml(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** CAF meta date: "13, Oct 2025" */
export function formatCafDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(+d)) return '';
  const day = d.getUTCDate();
  const mon = d.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' });
  const year = d.getUTCFullYear();
  return `${day}, ${mon} ${year}`;
}

/** Law ECS card date: "November 8, 2023" */
export function formatLawDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(+d)) return '';
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function tpClass(catName: string): string {
  return `tp_${String(catName || 'Uncategorized').replace(/\s+/g, '_')}`;
}

export function buildLawCardHtml(post: IndexedPost): string {
  const url = escapeHtml(post.url);
  const title = escapeHtml(post.title);
  const img = escapeHtml(post.image || '');
  const alt = escapeHtml(post.title);
  const date = escapeHtml(formatLawDate(post.publishedAt || post.modifiedAt));
  const excerpt = escapeHtml((post.description || '').slice(0, 80));
  const author = escapeHtml(post.author || 'The UAE Gate');
  const id = `post-${post.slug.replace(/[^a-z0-9_-]+/gi, '-')}`;

  return `<article id="${id}" class="elementor-post elementor-grid-item ecs-post-loop ${id} law type-law status-publish has-post-thumbnail hentry">
				<div data-elementor-type="loop" data-elementor-id="31769" class="elementor elementor-31769 ${id} law type-law status-publish has-post-thumbnail hentry" data-elementor-post-type="elementor_library">
					<section class="elementor-section elementor-top-section elementor-element elementor-element-510eaf1 elementor-section-boxed elementor-section-height-default elementor-section-height-default" data-id="510eaf1" data-element_type="section" data-e-type="section">
						<div class="elementor-container elementor-column-gap-default">
					<div class="elementor-column elementor-col-100 elementor-top-column elementor-element elementor-element-2452a68" data-id="2452a68" data-element_type="column" data-e-type="column">
			<div class="elementor-widget-wrap elementor-element-populated">
						<div class="elementor-element elementor-element-166eee4 elementor-widget elementor-widget-theme-post-featured-image elementor-widget-image" data-id="166eee4" data-element_type="widget" data-e-type="widget" data-widget_type="theme-post-featured-image.default">
				<div class="elementor-widget-container">
																<a href="${url}">
							${img ? `<img decoding="async" loading="lazy" width="800" height="450" src="${img}" class="attachment-large size-large" alt="${alt}" />` : ''}								</a>
															</div>
				</div>
				<div class="elementor-element elementor-element-c18161c elementor-align-left elementor-widget elementor-widget-post-info" data-id="c18161c" data-element_type="widget" data-e-type="widget" data-widget_type="post-info.default">
				<div class="elementor-widget-container">
							<ul class="elementor-icon-list-items elementor-post-info">
								<li class="elementor-icon-list-item elementor-repeater-item-a2abe74" itemprop="author">
										<span class="elementor-icon-list-icon">
								<i aria-hidden="true" class="fas fa-user-circle"></i>							</span>
									<span class="elementor-icon-list-text elementor-post-info__item elementor-post-info__item--type-author">
										${author}					</span>
								</li>
				</ul>
						</div>
				</div>
				<div class="elementor-element elementor-element-30acc95 elementor-align-left elementor-widget elementor-widget-post-info" data-id="30acc95" data-element_type="widget" data-e-type="widget" data-widget_type="post-info.default">
				<div class="elementor-widget-container">
							<ul class="elementor-icon-list-items elementor-post-info">
								<li class="elementor-icon-list-item elementor-repeater-item-5ce9847" itemprop="datePublished">
													<span class="elementor-icon-list-text elementor-post-info__item elementor-post-info__item--type-date">
										<time>${date}</time>					</span>
								</li>
				</ul>
						</div>
				</div>
				<div class="elementor-element elementor-element-55ed0cd textafter elementor-widget elementor-widget-theme-post-title elementor-page-title elementor-widget-heading" data-id="55ed0cd" data-element_type="widget" data-e-type="widget" data-widget_type="theme-post-title.default">
				<div class="elementor-widget-container">
					<h2 class="elementor-heading-title elementor-size-default"><a href="${url}">${title}</a></h2>				</div>
				</div>
				<div class="elementor-element elementor-element-7bca0bd elementor-widget__width-initial elementor-widget elementor-widget-theme-post-excerpt" data-id="7bca0bd" data-element_type="widget" data-e-type="widget" data-widget_type="theme-post-excerpt.default">
				<div class="elementor-widget-container">
					<p>${excerpt}</div>
				</div>
					</div>
		</div>
					</div>
		</section>
				</div>
				</article>`;
}

export function buildCafCardHtml(post: IndexedPost): string {
  const url = escapeHtml(post.url);
  const title = escapeHtml(post.title);
  const img = escapeHtml(post.image || '');
  const author = escapeHtml(post.author || 'The UAE Gate');
  const date = escapeHtml(formatCafDate(post.publishedAt || post.modifiedAt));
  const excerptRaw = (post.description || '').replace(/\s+/g, ' ').trim();
  const excerpt =
    excerptRaw.length > 140 ? `${escapeHtml(excerptRaw.slice(0, 140))}&hellip;` : escapeHtml(excerptRaw);
  const cat = post.categories?.[0];
  const cls = tpClass(cat?.name || 'Uncategorized');

  return `<article id="caf-post-layout1" class="caf-post-layout1 caf-col-md-6 caf-col-md-tablet12 caf-col-md-mobile12 caf-mb-5  animate-off ${cls}" data-post-id="${escapeHtml(post.slug)}"><div class="manage-layout1"><a href="${url}" target="_parent" class=""><div class="caf-featured-img-box " style="background:url(${img}                    )"></div></a><div id="manage-post-area"><div class="caf-post-title"><h2><a href="${url}" target="_parent">${title}</a></h2></div><div class="caf-meta-content"><span class="author caf-col-md-4 caf-pl-0"><i class="fa fa-user" aria-hidden="true"></i> ${author}</span><span class="date caf-col-md-6 caf-pl-0"><i class="fa fa-calendar" aria-hidden="true"></i> ${date}</span><span class="comment caf-col-md-3 caf-pl-0"><i class="fa fa-comment" aria-hidden="true"></i> 0</span></div><div class="caf-content">${excerpt}</div><div class="caf-content-read-more"><a class="caf-read-more" href="${url}" target="_parent">Read More</a></div></div></div></article>`;
}

/** Compact WP-style page list with dots. */
export function buildCafPaginationHtml(page: number, totalPages: number): string {
  if (totalPages <= 1) return '';
  const items: string[] = [];
  const pushNum = (n: number) => {
    if (n === page) {
      items.push(
        `<li><span aria-current="page" class="page-numbers current">${n}</span></li>`,
      );
    } else {
      items.push(
        `<li><a class="page-numbers" href="#page=${n}">${n}</a></li>`,
      );
    }
  };

  const window = new Set<number>([1, totalPages, page, page - 1, page + 1]);
  const sorted = [...window].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  let prev = 0;
  for (const n of sorted) {
    if (prev && n - prev > 1) {
      items.push(`<li><span class="page-numbers dots">&hellip;</span></li>`);
    }
    pushNum(n);
    prev = n;
  }
  if (page < totalPages) {
    items.push(`<li><a class="next page-numbers" href="#page=${page + 1}">Next</a></li>`);
  }
  return `<ul id="caf-layout-pagination" class="caf-pagination post-layout1">${items.join('')}</ul>`;
}

export function filterPostsByTermIds(posts: IndexedPost[], termRaw: string): IndexedPost[] {
  const ids = String(termRaw || '')
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (!ids.length) return posts;
  // "All" on blogs page lists every selected category id — treat as no filter when >1 id
  if (ids.length > 1) return posts;
  const want = ids[0];
  return posts.filter((p) => (p.categories || []).some((c) => c.id === want));
}
