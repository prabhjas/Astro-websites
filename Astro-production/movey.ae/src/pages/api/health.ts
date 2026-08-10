import type { APIRoute } from 'astro';

export const prerender = false;

/**
 * Liveness for Caddy / systemd / load balancers.
 * No secrets; safe to expose publicly.
 */
export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      ok: true,
      service: 'movey-ae-astro',
      ts: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    },
  );
};
