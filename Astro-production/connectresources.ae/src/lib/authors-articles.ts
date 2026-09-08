import * as cheerio from "cheerio";
import {
  renderAuthorGridCardsHtml,
  AUTHOR_ARTICLES_PER_PAGE,
} from "./blog-card-html";
import { getPostsByAuthor, normalizePath, paginate } from "./content";

/** WordPress user IDs for /authors/{slug}/ profile pages (from mirrored post author fields). */
const AUTHOR_SLUG_WP_IDS: Record<string, number> = {
  "liam-doherty": 115407,
  "kate-williams": 115408,
  "sahiba-maini": 115414,
  "timothy-partridge": 115419,
  "nakul-sachdeva": 115424,
  "david-walsh": 115455,
};

export function isAuthorProfilePath(pathname: string): boolean {
  const path = normalizePath(pathname);
  if (path === "/authors/") return false;
  return /^\/authors\/[^/]+\/$/.test(path);
}

export function authorSlugFromPath(pathname: string): string | null {
  const path = normalizePath(pathname);
  const m = path.match(/^\/authors\/([^/]+)\/$/);
  return m ? m[1] : null;
}

export function resolveAuthorWpId(slug: string): number | null {
  const id = AUTHOR_SLUG_WP_IDS[slug];
  return Number.isFinite(id) && id > 0 ? id : null;
}

function buildAuthorGridHtml(slug: string, authorWpId: number): string {
  const posts = getPostsByAuthor(authorWpId);
  const { items, total } = paginate(posts, 1, AUTHOR_ARTICLES_PER_PAGE);
  const cards = renderAuthorGridCardsHtml(items);
  const hasMore = total > items.length;
  const gridId = `us_grid_author_${slug.replace(/[^a-z0-9-]/gi, "-")}`;

  const loadMore = hasMore
    ? `<div class="g-loadmore"><a href="#" class="w-btn us-btn-style_1" role="button"><span class="w-btn-label">Load More</span></a></div>`
    : "";

  return `<div class="w-grid cr-author-articles type_grid layout_31725 cols_3 pagination_ajax" id="${gridId}" style="--columns:3;--gap:1.5rem;" data-author-id="${authorWpId}"><div class="w-grid-list">${cards}</div>${loadMore}</div>`;
}

/** Replace legacy sp-pcp / hidden ajax grid with featured-blog-style cards + Load More. */
export function rebuildAuthorArticlesHtml(html: string, pathname: string): string {
  const slug = authorSlugFromPath(pathname);
  if (!slug) return html;

  const authorWpId = resolveAuthorWpId(slug);
  if (!authorWpId) return html;

  const $ = cheerio.load(html, { xml: false, decodeEntities: false } as any);
  const $heading = $("span.w-text-value")
    .filter((_, el) => /^Articles by /i.test($(el).text().trim()))
    .first();
  if (!$heading.length) return html;

  const $wrapper = $heading.closest(".wpb_wrapper");
  if (!$wrapper.length) return html;

  $wrapper.find(".w-grid.hide_on_default").remove();
  $wrapper.find('[id^="pcp_wrapper-"]').closest(".wpb_text_column").remove();
  $wrapper.find(".sp-pcp-section").remove();
  $wrapper.append(buildAuthorGridHtml(slug, authorWpId));

  return $.html();
}

export { AUTHOR_ARTICLES_PER_PAGE };
