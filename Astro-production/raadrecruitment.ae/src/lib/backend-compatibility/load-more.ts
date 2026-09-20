import type { APIRoute } from "astro";
import {
  BLOG_LOAD_MORE_PER_PAGE,
  renderBlogCardsHtml,
} from "../blog-card-html";
import {
  INSIGHTS_GRID_PER_PAGE,
  renderInsightsImprezaGridHtml,
} from "../insights-archive";
import { getPosts, paginate } from "../content";

function parseExclude(raw: string | null): Set<number> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0),
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

  const sorted = getPosts().sort((a, b) => +new Date(b.date) - +new Date(a.date));
  const exclude = parseExclude(url.searchParams.get("exclude"));

  let items: typeof sorted;
  let page: number;
  let totalPages: number;
  let hasMore: boolean;
  let nextPage: number | null;
  let nextOffset: number | null;
  const total = sorted.length;

  if (isImpreza) {
    const remaining = exclude.size
      ? sorted.filter((p) => !exclude.has(p.id))
      : sorted.slice(Math.max(0, Number(url.searchParams.get("offset") || "0") || 0));
    items = remaining.slice(0, perPage);
    hasMore = remaining.length > items.length;
    nextOffset = null;
    page = 1;
    totalPages = Math.max(1, Math.ceil(remaining.length / perPage));
    nextPage = hasMore ? 2 : null;
  } else {
    page = Math.max(1, Number(url.searchParams.get("page") || "1") || 1);
    const slice = paginate(sorted, page, perPage);
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
