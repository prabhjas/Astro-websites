/**
 * Front-routed Insights Load More (NOT under /api/).
 * Preferred by `public/scripts/blog-load-more.js`.
 * See also `/api/blog/load-more` (legacy alias - same handler).
 */
import type { APIRoute } from "astro";
import { GET as loadMoreGet } from "../../lib/blog-load-more-handler";

export const prerender = false;

export const GET: APIRoute = loadMoreGet;
