import type { APIRoute } from "astro";
import {
  BLOG_LOAD_MORE_PER_PAGE,
  renderBlogCardsHtml,
} from "../../../lib/blog-card-html";
import { getPosts } from "../../../lib/content";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const perPage = Math.min(
    24,
    Math.max(1, Number(url.searchParams.get("perPage") || BLOG_LOAD_MORE_PER_PAGE) || BLOG_LOAD_MORE_PER_PAGE),
  );
  const offsetParam = url.searchParams.get("offset");
  const pageParam = url.searchParams.get("page");

  const sorted = [...getPosts()].sort((a, b) => +new Date(b.date) - +new Date(a.date));
  const total = sorted.length;

  let offset = 0;
  if (offsetParam != null && offsetParam !== "") {
    offset = Math.max(0, Number(offsetParam) || 0);
  } else {
    const page = Math.max(1, Number(pageParam || "1") || 1);
    offset = (page - 1) * perPage;
  }

  const items = sorted.slice(offset, offset + perPage);
  const nextOffset = offset + items.length;
  const hasMore = nextOffset < total;
  const html = renderBlogCardsHtml(items);

  return new Response(
    JSON.stringify({
      ok: true,
      offset,
      perPage,
      total,
      hasMore,
      nextOffset: hasMore ? nextOffset : null,
      nextPage: hasMore ? Math.floor(nextOffset / perPage) + 1 : null,
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
