import type { APIRoute } from "astro";
import {
  BLOG_LOAD_MORE_PER_PAGE,
  renderBlogCardsHtml,
} from "../../../lib/blog-card-html";
import { getPosts, getPostsByCategory } from "../../../lib/content";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const page = Math.max(1, Number(url.searchParams.get("page") || "1") || 1);
  const perPage = Math.min(
    24,
    Math.max(1, Number(url.searchParams.get("perPage") || BLOG_LOAD_MORE_PER_PAGE) || BLOG_LOAD_MORE_PER_PAGE),
  );
  const offsetParam = url.searchParams.get("offset");
  const offset =
    offsetParam != null && offsetParam !== ""
      ? Math.max(0, Number(offsetParam) || 0)
      : (page - 1) * perPage;
  const categoryId = Number(url.searchParams.get("categoryId") || "0") || 0;

  const sorted = (
    categoryId > 0 ? getPostsByCategory(categoryId) : getPosts()
  ).sort((a, b) => +new Date(b.date) - +new Date(a.date));
  const items = sorted.slice(offset, offset + perPage);
  const total = sorted.length;
  const nextOffset = offset + items.length;
  const hasMore = nextOffset < total;
  const html = renderBlogCardsHtml(items);

  return new Response(
    JSON.stringify({
      ok: true,
      page,
      perPage,
      offset,
      nextOffset,
      total,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
      hasMore,
      nextPage: hasMore ? page + 1 : null,
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
