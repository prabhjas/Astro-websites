#!/usr/bin/env node
const BASE = process.env.LOCAL_BASE || 'http://127.0.0.1:5107';

async function get(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    redirect: 'manual',
    ...opts,
    headers: { ...(opts.headers || {}), Accept: opts.accept || '*/*' },
  });
  const text = await res.text();
  return { status: res.status, location: res.headers.get('location'), text, len: text.length };
}

function locs(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

const out = {};

const smIndex = await get('/sitemap_index.xml');
const smPages = await get('/page-sitemap.xml');
const smPosts = await get('/post-sitemap.xml');
out.sitemaps = {
  index: { status: smIndex.status, locs: locs(smIndex.text) },
  pages: { status: smPages.status, count: locs(smPages.text).length, urls: locs(smPages.text) },
  posts: { status: smPosts.status, count: locs(smPosts.text).length },
};

const robots = await get('/robots.txt');
out.robots = { status: robots.status, hasSitemap: /sitemap_index\.xml/.test(robots.text), sample: robots.text.slice(0, 220) };

const gtm = await get('/runtime-gtm.js');
out.runtimeGtm = {
  status: gtm.status,
  hasGa4: /G-7B6EW1N2SB/.test(gtm.text),
  hasGtmContainer: /GTM-[A-Z0-9]+/.test(gtm.text),
  sourceHint: /googletagmanager\.com\/gtag\/js\?id=G-7B6EW1N2SB/.test(gtm.text) ? 'ga4-from-env' : 'check',
  emptySnippets: /const headScript = ""/.test(gtm.text),
};

const home = await get('/');
out.homepage = {
  status: home.status,
  runtimeLoader: /runtime-gtm\.js/.test(home.text),
  hardcodedGtm: /GTM-[A-Z0-9]+/.test(home.text),
  googletagmanager: /googletagmanager/.test(home.text),
  hardcodedGa4: /G-7B6EW1N2SB/.test(home.text),
  absWp: [...home.text.matchAll(/https:\/\/emiratisationhub\.com\/(?:wp-content|wp-includes)/g)].length,
  externalImgHosts: [...home.text.matchAll(/https?:\/\/(?!emiratisationhub\.com|127\.|localhost)[^"'\\\s>]+\.(?:png|jpe?g|webp|gif|svg)/gi)].length,
};

const post = await get('/emiratisation-in-private-sector/');
out.postImages = {
  status: post.status,
  absWp: [...post.text.matchAll(/https:\/\/emiratisationhub\.com\/(?:wp-content|wp-includes)/g)].length,
  externalImgHosts: [...post.text.matchAll(/https?:\/\/(?!emiratisationhub\.com|127\.|localhost)[^"'\\\s>]+\.(?:png|jpe?g|webp|gif|svg)/gi)].length,
  connectgroup: /connectgroup\.co/.test(post.text),
  nafis: /emiratisationnafis\.org/.test(post.text),
};

const redirectSamples = [
  '/home/',
  '/about/',
  '/contact/',
  '/services/',
  '/index.php',
  '/sample-page/',
  '/sitemap.xml',
];
out.redirects = {};
for (const p of redirectSamples) {
  const r = await get(p);
  out.redirects[p] = { status: r.status, location: r.location };
}

const contactPayload = {
  name: 'Ops Verify Test',
  email: 'ops-verify@example.com',
  phone: '+971501234567',
  message: 'Ops verification test — please ignore / delete.',
  formName: 'Emiratisation Hub Contact Form',
  formSource: '270',
  pageUrl: `${BASE}/contact-us/`,
  submissionId: `ops-verify-${Date.now()}`,
  submittedAt: new Date().toISOString(),
};
const contact = await get('/api/contact/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(contactPayload),
  accept: 'application/json',
});
out.contact = { status: contact.status, body: contact.text.slice(0, 500) };

console.log(JSON.stringify(out, null, 2));
