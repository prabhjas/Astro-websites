/**
 * Legacy Load More alias under `/api/blog/`.
 * Live Caddy may still route `/api/blog/*` here; frontend uses `/insights/load-more/`.
 * Same handler + Elementor loop 213 HTML as insights route - do not diverge.
 */
import type { APIRoute } from "astro";
import { GET as loadMoreGet } from "../../../lib/blog-load-more-handler";

export const prerender = false;

export const GET: APIRoute = loadMoreGet;
