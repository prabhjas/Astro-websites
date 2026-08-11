import * as cheerio from 'cheerio';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const LOCAL = 'http://127.0.0.1:5108';
const LIVE = 'https://emiratisationnafis.org';
const ROOT = 'd:/Astro-websites/Astro-production/emiratisationnafis.org';

async function get(url) {
  const res = await fetch(url, { redirect: 'manual' });
  const text = await res.text().catch(() => '');
  return { status: res.status, headers: res.headers, text, loc: res.headers.get('location') || '' };
}

console.log('\n=== 1) Author Load More ===');
{
  const { text } = await get(LOCAL + '/author/binju-t-r/');
  const $ = cheerio.load(text);
  const nav = $('[data-cs-blog-load-more]').first();
  const articles = $('article').length;
  console.log({
    articles,
    dataCs: nav.length,
    author: nav.attr('data-author'),
    per: nav.attr('data-per-page'),
    offset: nav.attr('data-offset'),
    ecsAjax: /src="[^"]*ecs_ajax_pagination\.js/.test(text),
    blogLoadMore: /blog-load-more\.js\?v=20260806-author1/.test(text),
    nbcpfAfter: /nbcpf-countryFlag-script-js-after/.test(text) && !/nbcpf intlTelInput init removed/.test(text),
  });
  const api = await (
    await fetch(
      LOCAL +
        `/api/blog/load-more/?page=2&perPage=${nav.attr('data-per-page') || 9}&offset=${nav.attr('data-offset') || 9}&author=binju-t-r`,
    )
  ).json();
  console.log({
    apiOk: api.ok,
    cards: (api.html.match(/<article/g) || []).length,
    hasMore: api.hasMore,
    author: api.author,
  });
}

console.log('\n=== 2/4/5) CTA + form images ===');
for (const rel of [
  '/wp-content/uploads/2023/11/CTA-1.png',
  '/wp-content/uploads/2023/11/form.png',
  '/wp-content/uploads/2023/11/Contact-home.jpg',
]) {
  const localPath = join(ROOT, 'public', rel.slice(1));
  const distPath = join(ROOT, 'dist/client', rel.slice(1));
  const [l, v] = await Promise.all([get(LOCAL + rel), get(LIVE + rel)]);
  const buf = existsSync(localPath) ? readFileSync(localPath) : null;
  const iend = buf && rel.endsWith('.png') ? buf.includes(Buffer.from('IEND')) : null;
  console.log({
    rel,
    localHttp: l.status,
    liveHttp: v.status,
    disk: buf?.length,
    dist: existsSync(distPath) ? statSync(distPath).length : 0,
    iend,
  });
}

console.log('\n=== 3) Phone init / double flag ===');
{
  for (const path of ['/', '/minimum-wage-in-uae/', '/contact-us/']) {
    const { text } = await get(LOCAL + path);
    console.log({
      path,
      nbcpfAfterLive: /id=["']nbcpf-countryFlag-script-js-after["']/.test(text),
      nbcpfRemoved: /nbcpf intlTelInput init removed/.test(text),
      mirror: (text.match(/astro-mirror-fixes\.js\?v=[^"']+/) || [])[0],
      flagsAsset: (await get(LOCAL + '/js/phone-flags/flags.png')).status,
    });
  }
}

console.log('\n=== Homepage CTA markup present ===');
{
  const { text } = await get(LOCAL + '/');
  console.log({
    helping: /Helping Emirati Candidates/.test(text),
    ctaCss: /CTA-1\.png/.test(text) || /70c2316/.test(text),
    formSection: /Let's Talk About/.test(text) || /Lets Talk About/.test(text) || /Your Business/.test(text),
    gtmHardcoded: /GTM-[A-Z0-9]+/.test(text) && !/runtime-gtm/.test(text),
    runtimeGtm: /runtime-gtm\.js/.test(text),
    googletagmanager: /googletagmanager\.com\/gtm\.js/.test(text),
  });
}

console.log('\n=== Step2: sitemap ===');
{
  const idx = await get(LOCAL + '/sitemap_index.xml');
  const liveIdx = await get(LIVE + '/sitemap_index.xml');
  console.log({ local: idx.status, live: liveIdx.status, localHasUrlset: /sitemap/i.test(idx.text), sample: idx.text.slice(0, 300) });
  const locs = [...idx.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  console.log('child sitemaps', locs.length, locs.slice(0, 8));
  for (const loc of locs.slice(0, 4)) {
    const path = loc.replace(LIVE, '').replace('https://emiratisationnafis.org', '') || loc;
    const url = path.startsWith('http') ? path.replace(LIVE, LOCAL) : LOCAL + path;
    const r = await get(url);
    console.log('  child', r.status, url.replace(LOCAL, ''), 'urls', (r.text.match(/<url>/g) || []).length);
  }
}

console.log('\n=== Step2: redirects sample ===');
for (const [from, expect] of [
  ['/emiratisation/', '/emiratisation-recruitment/'],
  ['/nafis-benefits/', '/nafis-benefits-program/'],
  ['/staff-outsourcing-solutions-in-uae/', '/staff-outsourcing/'],
  ['/about/', '/about-us/'],
  ['/talent-program/', '/mazaya-program-for-emiratis/'],
]) {
  const r = await get(LOCAL + from);
  const ok = r.status === 301 && r.loc.includes(expect);
  console.log(ok ? 'PASS' : 'FAIL', from, r.status, r.loc);
}

console.log('\n=== Step2: robots.txt ===');
{
  const [l, v] = await Promise.all([get(LOCAL + '/robots.txt'), get(LIVE + '/robots.txt')]);
  console.log({
    local: l.status,
    live: v.status,
    localSample: l.text.slice(0, 400),
    hasSitemap: /sitemap/i.test(l.text),
    hasUserAgent: /user-agent/i.test(l.text),
  });
}

console.log('\n=== Step2: external image deps (homepage+post+recruitment) ===');
const absHosts = new Set();
for (const path of ['/', '/emiratisation-recruitment/', '/minimum-wage-in-uae/', '/author/binju-t-r/']) {
  const { text } = await get(LOCAL + path);
  const $ = cheerio.load(text);
  $('img[src], source[srcset], [style*="background"]').each((_, el) => {
    const src = $(el).attr('src') || '';
    const srcset = $(el).attr('srcset') || '';
    const style = $(el).attr('style') || '';
    for (const u of [src, ...srcset.split(',').map((s) => s.trim().split(/\s+/)[0]), ...(style.match(/url\(([^)]+)\)/g) || []).map((m) => m.slice(4, -1).replace(/['"]/g, ''))]) {
      if (/^https?:\/\//i.test(u) && !/emiratisationnafis\.org/i.test(u) && !/fonts\.g|gstatic|googletagmanager|google-analytics|facebook|doubleclick/i.test(u)) {
        absHosts.add(u.split('?')[0]);
      }
    }
  });
  // CSS background urls in linked post CSS are local /wp-content
}
console.log('external imgs', [...absHosts].slice(0, 30), 'count', absHosts.size);

console.log('\n=== Step2: GTM ===');
{
  const { text } = await get(LOCAL + '/');
  const runtime = await get(LOCAL + '/runtime-gtm.js');
  console.log({
    runtimeStatus: runtime.status,
    runtimeMentionsEnv: /PUBLIC_GTM|gtm\.js|dataLayer/.test(runtime.text),
    pageHasHardGtmContainer: /googletagmanager\.com\/gtm\.js\?id=GTM-/.test(text),
    pageHasRuntimeLoader: /runtime-gtm\.js/.test(text),
  });
}
