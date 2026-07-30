import type { APIRoute } from 'astro';
import { getClientIp } from '../../utils/form/rate-limit';

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

function isPublicIp(ip: string): boolean {
  if (!ip || ip === 'unknown') return false;
  if (ip === '::1' || ip === '127.0.0.1') return false;
  if (ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('127.')) return false;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return false;
  if (ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80:')) return false;
  return true;
}

function parseCountryCode(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const data = payload as Record<string, unknown>;
  const raw =
    data.country_code ||
    data.countryCode ||
    data.country ||
    (data.data && typeof data.data === 'object'
      ? (data.data as Record<string, unknown>).country_code ||
        (data.data as Record<string, unknown>).country
      : '') ||
    '';
  if (typeof raw !== 'string') return '';
  let code = raw.trim().toLowerCase();
  if (code.length > 2 && typeof data.country_code === 'string') {
    code = data.country_code.trim().toLowerCase();
  }
  return /^[a-z]{2}$/.test(code) ? code : '';
}

async function lookupCountryForIp(ip: string): Promise<string> {
  const endpoints = [
    `https://ipwho.is/${encodeURIComponent(ip)}`,
    `https://ipapi.co/${encodeURIComponent(ip)}/json/`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) continue;
      const code = parseCountryCode(await res.json());
      if (code) return code;
    } catch {
      // try next provider
    }
  }
  return '';
}

export const GET: APIRoute = async ({ request }) => {
  // Prefer CDN/edge country when available (Cloudflare, etc.).
  const headerCandidates = [
    request.headers.get('cf-ipcountry'),
    request.headers.get('x-vercel-ip-country'),
    request.headers.get('cloudfront-viewer-country'),
  ];
  for (const value of headerCandidates) {
    if (value && /^[a-zA-Z]{2}$/.test(value) && value.toUpperCase() !== 'XX') {
      return json({ country: value.toLowerCase(), source: 'header' });
    }
  }

  const ip = getClientIp(request);
  if (isPublicIp(ip)) {
    const country = await lookupCountryForIp(ip);
    if (country) return json({ country, source: 'ip', ip });
  }

  return json({ country: null, source: 'unknown' });
};
