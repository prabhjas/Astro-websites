import type { APIRoute } from "astro";

export const prerender = false;

// Content compatibility only. The managed backend sets this exact nonsecret
// marker; the secretless presentation and offline build omit it.
const USE_BACKEND_COMPATIBILITY =
  process.env.INTERNAL_ADMIN_DIR === "/data/internal-admin";

/** Local stub for Cloudflare Insights beacon (`/cdn-cgi/rum/`) — CF edge is absent on fleet-local. */
export const ALL: APIRoute = async () =>
  USE_BACKEND_COMPATIBILITY
    ? new Response(null, { status: 404 })
    : new Response(null, {
        status: 204,
        headers: { "Cache-Control": "no-store" },
      });
