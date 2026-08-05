import type { APIRoute } from "astro";
import { handleBlogLoadMoreGet } from "../../../lib/blog-load-more-api";

/** Mirror of /api/blog/load-more/ — used when older fleet builds omit the blog API route. */
export const prerender = false;

export const GET: APIRoute = async ({ url }) => handleBlogLoadMoreGet(url);
