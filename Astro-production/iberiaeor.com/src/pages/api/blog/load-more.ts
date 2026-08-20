import type { APIRoute } from "astro";
import {
  BLOG_LOAD_MORE_PER_PAGE,
  renderBlogCardsHtml,
} from "../../../lib/blog-card-html";
import { getPosts, paginate } from "../../../lib/content";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const page = Math.max(1, Number(url.searchParams.get("page") || "1") || 1);
  const perPage = Math.min(
    24,
    Math.max(1, Number(url.searchParams.get("perPage") || BLOG_LOAD_MORE_PER_PAGE) || BLOG_LOAD_MORE_PER_PAGE),
  );

  const sorted = getPosts().sort((a, b) => +new Date(b.date) - +new Date(a.date));
  const slice = paginate(sorted, page, perPage);
  const html = renderBlogCardsHtml(slice.items);

  return new Response(
    JSON.stringify({
      ok: true,
      page: slice.page,
      perPage: slice.perPage,
      total: slice.total,
      totalPages: slice.totalPages,
      hasMore: slice.hasNext,
      nextPage: slice.hasNext ? slice.page + 1 : null,
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
