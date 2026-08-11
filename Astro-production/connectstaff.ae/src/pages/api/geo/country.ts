import type { APIRoute } from 'astro';

export const prerender = false;

const ISO2_RE = /^[a-z]{2}$/i;

function normaliseCountry(value: unknown): string {
  if (typeof value !== 'string') return '';
  const code = value.trim().toLowerCase();
  if (!ISO2_RE.test(code)) return '';
  if (code === 'xx' || code === 't1') return '';
  return code;
}

function countryFromHeaders(request: Request): string {
  const headers = [
    'cf-ipcountry',
    'x-vercel-ip-country',
    'cloudfront-viewer-country',
    'x-country-code',
    'x-geo-country',
  ];
  for (const name of headers) {
    const code = normaliseCountry(request.headers.get(name));
    if (code) return code;
  }
  return '';
}



export const GET: APIRoute = async ({ request, clientAddress }) => {
  const fromHeader = countryFromHeaders(request);
  if (fromHeader) {
    return Response.json(
      { country: fromHeader, source: 'header' },
      { headers: { 'Cache-Control': 'private, max-age=300' } },
    );
  }

  // No CF/edge country header (local/dev, XX, T1) -> AE fallback. No third-party geo lookup (FQ-02).
  return Response.json(
    { country: 'ae', source: 'fallback' },
    { status: 200, headers: { 'Cache-Control': 'private, max-age=60' } },
  );
};
