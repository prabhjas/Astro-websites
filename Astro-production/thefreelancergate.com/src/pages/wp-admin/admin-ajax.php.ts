/**
 * Fallback route for WP admin-ajax (primary handler is middleware — avoids CSRF 403).
 */
import type { APIRoute } from "astro";
import { handleAdminAjaxRequest } from "../../lib/wp-admin/admin-ajax";

export const prerender = false;

export const ALL: APIRoute = async ({ request }) => {
  const res = await handleAdminAjaxRequest(request);
  return res || new Response("0", { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
