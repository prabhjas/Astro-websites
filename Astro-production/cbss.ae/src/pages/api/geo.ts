import type { APIRoute } from 'astro';

export const prerender = false;

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'private, max-age=300',
    },
  });
}

export const GET: APIRoute = async ({ request }) => {
  // Prefer CDN/edge country (Cloudflare cf-ipcountry, etc.). No third-party geo lookup (FQ-02).
  const headerCandidates = [
    request.headers.get('cf-ipcountry'),
    request.headers.get('x-vercel-ip-country'),
    request.headers.get('cloudfront-viewer-country'),
  ];
  for (const value of headerCandidates) {
    const up = (value || '').trim().toUpperCase();
    if (/^[A-Z]{2}$/.test(up) && up !== 'XX' && up !== 'T1') {
      return json({ country: up.toLowerCase(), source: 'header' });
    }
  }
  // No usable edge header (local/dev, XX, T1) -> AE fallback.
  return json({ country: 'ae', source: 'fallback' });
};
