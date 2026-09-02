const START = 'http://127.0.0.1:4332/';
const ORIGIN = 'https://emiratisationhub.com';
const MAX_PAGES = 250;

const queue = [START];
const seen = new Set();
const htmlPages = [];

function normalizeLocal(url) {
  try {
    const u = new URL(url);
    u.hash = '';
    return u.toString();
  } catch {
    return '';
  }
}

function extractCanonical(html) {
  const m = html.match(/<link\b[^>]*rel=["']canonical["'][^>]*>/i);
  if (!m) return '';
  const h = m[0].match(/\bhref=["']([^"']+)["']/i);
  return h ? h[1].trim() : '';
}

function toExpectedCanonical(localUrl) {
  const u = new URL(localUrl);
  let path = u.pathname || '/';
  if (!path.endsWith('/')) path += '/';
  return `${ORIGIN}${path}`;
}

while (queue.length && seen.size < MAX_PAGES) {
  const current = normalizeLocal(queue.shift());
  if (!current || seen.has(current)) continue;
  seen.add(current);

  let res;
  try {
    res = await fetch(current, { redirect: 'follow' });
  } catch {
    continue;
  }
  const ct = (res.headers.get('content-type') || '').toLowerCase();
  if (!ct.includes('text/html')) continue;
  const html = await res.text();
  htmlPages.push({ url: current, status: res.status, html });

  const hrefs = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)].map((m) => m[1]);
  for (const href of hrefs) {
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;
    let next;
    try {
      next = new URL(href, current);
    } catch {
      continue;
    }
    if (next.origin !== new URL(START).origin) continue;
    if (/\.(?:png|jpe?g|webp|gif|svg|pdf|xml|txt|json|zip)$/i.test(next.pathname)) continue;
    queue.push(next.toString());
  }
}

const problems = [];
for (const p of htmlPages) {
  const canon = extractCanonical(p.html);
  const expected = toExpectedCanonical(p.url);
  const isAbsolute = /^https?:\/\//i.test(canon);
  if (!canon) {
    problems.push({ url: p.url, issue: 'missing', canonical: '', expected });
    continue;
  }
  if (!isAbsolute) {
    problems.push({ url: p.url, issue: 'relative', canonical: canon, expected });
    continue;
  }
  if (canon !== expected) {
    problems.push({ url: p.url, issue: 'mismatch', canonical: canon, expected });
  }
}

console.log(JSON.stringify({ crawled: htmlPages.length, problems }, null, 2));
