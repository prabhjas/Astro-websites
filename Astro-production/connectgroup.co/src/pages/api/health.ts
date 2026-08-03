import type { APIRoute } from 'astro';

export const prerender = false;

/** Liveness for Caddy / systemd / fleet-local smoke. */
export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      ok: true,
      service: 'connectgroup-astro',
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
