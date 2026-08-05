#!/usr/bin/env node
/**
 * Final QA sweep for kpmpro.ae (local fleet :5097).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BASE = process.env.QA_BASE || 'http://127.0.0.1:5097';

const inv = JSON.parse(readFileSync(join(ROOT, 'src/data/sitemap-inventory.json'), 'utf8'));
const yml = readFileSync(join(ROOT, 'src/data/redirects.yml'), 'utf8');
const redirectFroms = [...yml.matchAll(/from:\s*(\S+)/g)].map((m) => m[1]);

async function head(path) {
  const res = await fetch(BASE + path, { redirect: 'manual' });
  return { path, status: res.status, location: res.headers.get('location') || '' };
}

async function get(path) {
  const res = await fetch(BASE + path);
  const text = await res.text();
  return { path, status: res.status, text, len: text.length };
}

const report = {
  base: BASE,
  generatedAt: new Date().toISOString(),
  pages: [],
  posts: [],
  redirects: [],
  seo: [],
  apis: [],
  content: [],
  fails: [],
};

const pagePaths = [
  '/',
  ...inv.pages.filter((p) => p.slug !== 'homepage').map((p) => `/${p.slug}/`),
];

for (const p of pagePaths) {
  const r = await get(p);
  const title = (r.text.match(/<title[^>]*>([^<]*)<\/title>/i) || [, ''])[1].trim();
  const hasHardGtm = /googletagmanager\.com\/(gtag|gtm)/i.test(r.text);
  const hasRuntimeGtm = /data-runtime-gtm/.test(r.text);
  report.pages.push({
    path: p,
    status: r.status,
    title: title.slice(0, 90),
    bytes: r.len,
    hasPhone: /wpcf7-phonetext|cg-phone-input/.test(r.text),
    hasHardGtm,
    hasRuntimeGtm,
    hasFixes: /astro-mirror-fixes\.js/.test(r.text),
  });
  if (r.status !== 200) report.fails.push(`PAGE ${p} HTTP ${r.status}`);
  if (hasHardGtm) report.fails.push(`HARD_GTM ${p}`);
  if (!hasRuntimeGtm && r.status === 200) report.fails.push(`NO_RUNTIME_GTM ${p}`);
}

for (const post of inv.posts) {
  const p = `/${post.slug}/`;
  const r = await get(p);
  const title = (r.text.match(/<title[^>]*>([^<]*)<\/title>/i) || [, ''])[1].trim().slice(0, 80);
  const hasHardGtm = /googletagmanager\.com\/(gtag|gtm)/i.test(r.text);
  report.posts.push({ path: p, status: r.status, title, bytes: r.len });
  if (r.status !== 200) report.fails.push(`POST ${p} HTTP ${r.status}`);
  if (hasHardGtm) report.fails.push(`HARD_GTM ${p}`);
}

for (const from of redirectFroms) {
  const r = await head(from);
  report.redirects.push(r);
  if (![301, 302, 307, 308].includes(r.status)) {
    report.fails.push(`REDIR ${from} HTTP ${r.status}`);
  }
}

for (const p of [
  '/robots.txt',
  '/sitemap_index.xml',
  '/page-sitemap.xml',
  '/post-sitemap.xml',
  '/llms.txt',
  '/llm.txt',
  '/runtime-gtm.js',
  '/api/health/',
  '/api/geo/country',
]) {
  const r = await head(p);
  report.seo.push(r);
  if (r.status !== 200) report.fails.push(`SEO ${p} HTTP ${r.status}`);
}

{
  const res = await fetch(`${BASE}/api/blog/listing`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ category: 'all', page: 1, posts_per_page: 9 }),
  });
  const j = await res.json();
  report.apis.push({ name: 'blog-all', status: res.status, posts: j.posts?.length, total: j.total });
  if (res.status !== 200 || !(j.posts?.length > 0)) report.fails.push('BLOG_LISTING');

  const vs = await fetch(`${BASE}/api/blog/listing`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ category: 'visa-cancellation-letter', page: 1, posts_per_page: 9 }),
  });
  const vsj = await vs.json();
  report.apis.push({
    name: 'blog-visa-cancel',
    status: vs.status,
    posts: vsj.posts?.length,
    total: vsj.total,
  });
}

{
  const res = await fetch(`${BASE}/api/contact/`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'Final Qa User',
      email: 'finalqa@example.com',
      phone: '+971500000111',
      message: 'final qa attribution check',
      gclid: 'final-qa-gclid',
      campaignId: '77',
      device: 'm',
    }),
  });
  const j = await res.json();
  report.apis.push({ name: 'contact', status: res.status, success: j.success });
  if (!j.success) report.fails.push(`CONTACT ${JSON.stringify(j)}`);
}

{
  const secret =
    readFileSync(join(ROOT, '.env'), 'utf8').match(/^INTERNAL_JOB_SECRET=(.*)$/m)?.[1]?.trim() || '';
  const auth = await fetch(`${BASE}/api/internal/leads`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const no = await fetch(`${BASE}/api/internal/leads`);
  const posts = await fetch(`${BASE}/api/internal/posts`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  report.apis.push({
    name: 'internal',
    auth: auth.status,
    deny: no.status,
    posts: posts.status,
  });
  if (auth.status !== 200) report.fails.push('INTERNAL_AUTH');
  if (![401, 403].includes(no.status)) report.fails.push(`INTERNAL_DENY ${no.status}`);
}

for (const p of ['/', '/contact-us/', '/blog/', '/golden-visa/', '/about-us/']) {
  const g = await get(p);
  const checks = {
    path: p,
    hasChrome: /id="masthead"|site-header|id="colophon"|site-footer/.test(g.text),
    royalVisaBrand: /KPM Pro/i.test(g.text),
    connectResourcesBrandLeak: /Connect Resources Dubai/i.test(g.text),
    hasHardGtm: /googletagmanager\.com\/(gtag|gtm)/i.test(g.text),
  };
  report.content.push(checks);
  if (checks.connectResourcesBrandLeak) report.fails.push(`BRAND_LEAK ${p}`);
}

report.summary = {
  pagesOk: report.pages.filter((p) => p.status === 200).length,
  pagesTotal: report.pages.length,
  postsOk: report.posts.filter((p) => p.status === 200).length,
  postsTotal: report.posts.length,
  redirectsOk: report.redirects.filter((r) => [301, 302, 307, 308].includes(r.status)).length,
  redirectsTotal: report.redirects.length,
  failCount: report.fails.length,
  fails: report.fails,
};

writeFileSync(join(ROOT, 'docs/10-final-qa-report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.summary, null, 2));
console.log('\nPAGES');
for (const p of report.pages) console.log(`${p.status} ${p.path} · ${p.title}`);
console.log('\nSEO');
for (const s of report.seo) console.log(`${s.status} ${s.path}`);
console.log('\nAPIS');
console.log(JSON.stringify(report.apis, null, 2));
if (report.fails.length) {
  console.log('\nFAILS');
  for (const f of report.fails) console.log(' -', f);
  process.exit(1);
}
console.log('\nALL CHECKS PASSED');
