import type { APIRoute } from "astro";

export const prerender = false;

/** Local stub for Cloudflare Insights beacon (`/cdn-cgi/rum/`) — CF edge is absent on fleet-local. */
export const ALL: APIRoute = async () =>
  new Response(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
