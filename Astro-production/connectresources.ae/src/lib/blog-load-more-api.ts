import {
  BLOG_LOAD_MORE_PER_PAGE,
  INSIGHTS_MAIN_GRID_CATEGORY_SLUGS,
  renderBlogCardsHtml,
  renderImprezaGridCardsHtml,
} from "./blog-card-html";
import { getCategories, getPosts, paginate, type PostEntry } from "./content";

/** Category slugs used by the main ajax grid on /insights/ (us_grid_3). */
function filterInsightsGridPosts(posts: PostEntry[]): PostEntry[] {
  const cats = getCategories();
  const slugSet = new Set(INSIGHTS_MAIN_GRID_CATEGORY_SLUGS);
  const allowedCatIds = new Set(
    cats.filter((c) => slugSet.has(c.slug)).map((c) => c.id),
  );
  if (!allowedCatIds.size) return posts;
  return posts.filter((p) => p.categories.some((id) => allowedCatIds.has(id)));
}

export async function handleBlogLoadMoreGet(url: URL): Promise<Response> {
  const page = Math.max(1, Number(url.searchParams.get("page") || "1") || 1);
  const perPage = Math.min(
    24,
    Math.max(
      1,
      Number(url.searchParams.get("perPage") || BLOG_LOAD_MORE_PER_PAGE) ||
        BLOG_LOAD_MORE_PER_PAGE,
    ),
  );
  const format = (url.searchParams.get("format") || "elementor").toLowerCase();
  const grid = (url.searchParams.get("grid") || "").toLowerCase();
  const exclude = new Set(
    String(url.searchParams.get("exclude") || "")
      .split(",")
      .map((v) => Number(v.trim()))
      .filter((n) => Number.isFinite(n) && n > 0),
  );

  let sorted = getPosts().sort((a, b) => +new Date(b.date) - +new Date(a.date));
  if (format === "impreza" && grid === "insights") {
    sorted = filterInsightsGridPosts(sorted);
  }
  if (exclude.size) {
    sorted = sorted.filter((p) => !exclude.has(p.id));
  }

  const slice = exclude.size
    ? {
        items: sorted.slice(0, perPage),
        page: 1,
        perPage,
        total: sorted.length,
        totalPages: Math.max(1, Math.ceil(sorted.length / perPage)),
        hasNext: sorted.length > perPage,
        hasPrev: false,
      }
    : paginate(sorted, page, perPage);

  const html =
    format === "impreza"
      ? renderImprezaGridCardsHtml(slice.items)
      : renderBlogCardsHtml(slice.items);

  const remaining = exclude.size ? Math.max(0, sorted.length - slice.items.length) : null;

  return new Response(
    JSON.stringify({
      ok: true,
      page: exclude.size ? page : slice.page,
      perPage: slice.perPage,
      total: slice.total,
      totalPages: slice.totalPages,
      hasMore: exclude.size ? remaining! > 0 : slice.hasNext,
      nextPage: exclude.size
        ? remaining! > 0
          ? page + 1
          : null
        : slice.hasNext
          ? slice.page + 1
          : null,
      html,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=60",
      },
    },
  );
}
