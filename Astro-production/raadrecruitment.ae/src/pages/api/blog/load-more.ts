import type { APIRoute } from "astro";
import {
  BLOG_LOAD_MORE_PER_PAGE,
  renderBlogCardsHtml,
} from "../../../lib/blog-card-html";
import {
  INSIGHTS_GRID_PER_PAGE,
  renderInsightsImprezaGridHtml,
} from "../../../lib/insights-archive";
import {
  getAuthorBySlug,
  getPosts,
  getPostsByAuthor,
  normalizePath,
  paginate,
} from "../../../lib/content";

export const prerender = false;

function parseExcludeIds(raw: string | null): Set<number> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0),
  );
}

function parseExcludePaths(raw: string | null): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((s) => normalizePath(s.trim()))
      .filter(Boolean),
  );
}

export const GET: APIRoute = async ({ url }) => {
  const format = (url.searchParams.get("format") || "elementor").toLowerCase();
  const isImpreza = format === "impreza" || format === "impreza-grid";
  const perPageDefault = isImpreza ? INSIGHTS_GRID_PER_PAGE : BLOG_LOAD_MORE_PER_PAGE;
  const perPage = Math.min(
    24,
    Math.max(1, Number(url.searchParams.get("perPage") || perPageDefault) || perPageDefault),
  );

  const authorSlug = (url.searchParams.get("authorSlug") || url.searchParams.get("author") || "")
    .trim()
    .toLowerCase();

  let sorted = getPosts().sort((a, b) => +new Date(b.date) - +new Date(a.date));

  if (authorSlug) {
    const author = getAuthorBySlug(authorSlug);
    if (!author) {
      return new Response(JSON.stringify({ ok: false, error: "author_not_found" }), {
        status: 404,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }
    sorted = getPostsByAuthor(author.id);
  }

  const excludeIds = parseExcludeIds(url.searchParams.get("exclude"));
  const excludePaths = parseExcludePaths(url.searchParams.get("excludePaths"));
  const useExclude = excludeIds.size > 0 || excludePaths.size > 0;

  let pool = sorted;
  if (excludeIds.size) {
    pool = pool.filter((p) => !excludeIds.has(p.id));
  }
  if (excludePaths.size) {
    pool = pool.filter((p) => !excludePaths.has(normalizePath(p.path)));
  }

  let items: typeof sorted;
  let page: number;
  let totalPages: number;
  let hasMore: boolean;
  let nextPage: number | null;
  let nextOffset: number | null;
  const total = sorted.length;

  if (useExclude) {
    // Append-next-batch mode (blog + author Load More)
    items = pool.slice(0, perPage);
    hasMore = pool.length > items.length;
    nextOffset = null;
    page = 1;
    totalPages = Math.max(1, Math.ceil(pool.length / perPage));
    nextPage = hasMore ? 2 : null;
  } else if (isImpreza) {
    const offset = Math.max(0, Number(url.searchParams.get("offset") || "0") || 0);
    const remaining = pool.slice(offset);
    items = remaining.slice(0, perPage);
    hasMore = remaining.length > items.length;
    nextOffset = hasMore ? offset + items.length : null;
    page = 1;
    totalPages = Math.max(1, Math.ceil(remaining.length / perPage));
    nextPage = hasMore ? 2 : null;
  } else {
    page = Math.max(1, Number(url.searchParams.get("page") || "1") || 1);
    const slice = paginate(pool, page, perPage);
    items = slice.items;
    totalPages = slice.totalPages;
    hasMore = slice.hasNext;
    nextPage = slice.hasNext ? slice.page + 1 : null;
    nextOffset = hasMore ? page * perPage : null;
  }

  const html = isImpreza
    ? renderInsightsImprezaGridHtml(items)
    : renderBlogCardsHtml(items);

  return new Response(
    JSON.stringify({
      ok: true,
      page,
      perPage,
      total,
      totalPages,
      hasMore,
      nextPage,
      nextOffset,
      authorSlug: authorSlug || null,
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
};
