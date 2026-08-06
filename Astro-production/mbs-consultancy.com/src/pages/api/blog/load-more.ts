import type { APIRoute } from "astro";
import {
  BLOG_LOAD_MORE_PER_PAGE,
  renderBlogCardsHtml,
  renderImprezaGridCardsHtml,
} from "../../../lib/blog-card-html";
import { getPosts, paginate } from "../../../lib/content";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const page = Math.max(1, Number(url.searchParams.get("page") || "1") || 1);
  const perPage = Math.min(
    24,
    Math.max(1, Number(url.searchParams.get("perPage") || BLOG_LOAD_MORE_PER_PAGE) || BLOG_LOAD_MORE_PER_PAGE),
  );
  const format = (url.searchParams.get("format") || "elementor").toLowerCase();
  const exclude = new Set(
    String(url.searchParams.get("exclude") || "")
      .split(",")
      .map((v) => Number(v.trim()))
      .filter((n) => Number.isFinite(n) && n > 0),
  );

  let sorted = getPosts().sort((a, b) => +new Date(b.date) - +new Date(a.date));
  if (exclude.size) {
    sorted = sorted.filter((p) => !exclude.has(p.id));
  }

  // When excluding already-visible cards, always return the next page from the filtered list.
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
};
