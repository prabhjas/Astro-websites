import type { APIRoute } from "astro";
import {
  BLOG_LOAD_MORE_PER_PAGE,
  renderBlogCardsHtml,
} from "../../../lib/blog-card-html";
import {
  AUTHOR_ARCHIVE_PER_PAGE,
  renderAuthorArchiveCardsHtml,
} from "../../../lib/author-archive-html";
import { getPosts, getPostsByAuthor, getPostsByCategory } from "../../../lib/content";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const page = Math.max(1, Number(url.searchParams.get("page") || "1") || 1);
  const authorId = Number(url.searchParams.get("authorId") || "0") || 0;
  const defaultPerPage = authorId > 0 ? AUTHOR_ARCHIVE_PER_PAGE : BLOG_LOAD_MORE_PER_PAGE;
  const perPage = Math.min(
    24,
    Math.max(1, Number(url.searchParams.get("perPage") || defaultPerPage) || defaultPerPage),
  );
  const offsetParam = url.searchParams.get("offset");
  const offset =
    offsetParam != null && offsetParam !== ""
      ? Math.max(0, Number(offsetParam) || 0)
      : (page - 1) * perPage;
  const categoryId = Number(url.searchParams.get("categoryId") || "0") || 0;

  const sorted = (
    authorId > 0
      ? getPostsByAuthor(authorId)
      : categoryId > 0
        ? getPostsByCategory(categoryId)
        : getPosts()
  ).sort((a, b) => +new Date(b.date) - +new Date(a.date));
  const items = sorted.slice(offset, offset + perPage);
  const total = sorted.length;
  const nextOffset = offset + items.length;
  const hasMore = nextOffset < total;
  const html =
    authorId > 0 ? renderAuthorArchiveCardsHtml(items) : renderBlogCardsHtml(items);

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
