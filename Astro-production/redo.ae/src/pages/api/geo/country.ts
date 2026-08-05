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

function clientIp(request: Request, clientAddress?: string): string {
  const forwarded = request.headers.get('x-forwarded-for') || '';
  const first = forwarded.split(',')[0]?.trim();
  if (first && first !== '127.0.0.1' && first !== '::1') return first;
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp && realIp !== '127.0.0.1' && realIp !== '::1') return realIp;
  if (clientAddress && clientAddress !== '127.0.0.1' && clientAddress !== '::1') {
    return clientAddress;
  }
  return '';
}

async function lookupExternal(ip: string): Promise<string> {
  const endpoints = ip
    ? [`https://ipwho.is/${encodeURIComponent(ip)}`, `https://ipapi.co/${encodeURIComponent(ip)}/country/`]
    : ['https://ipwho.is/', 'https://get.geojs.io/v1/ip/country.json'];

  for (const url of endpoints) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(url, {
        headers: { Accept: 'application/json, text/plain' },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) continue;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json') || url.includes('geojs') || url.includes('ipwho')) {
        const data = await res.json();
        const code =
          normaliseCountry(data.country_code) ||
          normaliseCountry(data.countryCode) ||
          normaliseCountry(data.country) ||
          normaliseCountry(typeof data === 'string' ? data : '');
        if (code) return code;
      } else {
        const text = (await res.text()).trim();
        const code = normaliseCountry(text);
        if (code) return code;
      }
    } catch {
      // try next endpoint
    }
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

  const ip = clientIp(request, clientAddress);
  const fromLookup = await lookupExternal(ip);
  if (fromLookup) {
    return Response.json(
      { country: fromLookup, source: ip ? 'ip-lookup' : 'egress-lookup' },
      { headers: { 'Cache-Control': 'private, max-age=300' } },
    );
  }

  return Response.json(
    { country: '', source: 'none' },
    { status: 200, headers: { 'Cache-Control': 'private, max-age=60' } },
  );
};
