import type { APIRoute } from "astro";
import { handleBlogLoadMoreGet } from "../../../lib/blog-load-more-api";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => handleBlogLoadMoreGet(url);
