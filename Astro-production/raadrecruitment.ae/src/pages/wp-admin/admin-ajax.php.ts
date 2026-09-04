/**
 * Fallback route for WP admin-ajax (Astro has no WP admin).
 * Returns WP's empty success body so legacy scripts stop 404ing.
 */
import type { APIRoute } from "astro";

export const prerender = false;

export const ALL: APIRoute = async () => {
  return new Response("0", {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
