#!/usr/bin/env node
/**
 * Full Phase 10 go-live verify for alburaq.ae on loopback :5120
 */
import { existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'http://127.0.0.1:5120';
const LIVE = '';
const rows = [];

function envSecret() {
  const env = readFileSync(join(ROOT, '.env'), 'utf8');
  const m = env.match(/^INTERNAL_JOB_SECRET=(.+)$/m);
  return m ? m[1].trim() : '';
}

async function req(path, opts = {}) {
  const url = path.startsWith('http') ? path : BASE + path;
  const res = await fetch(url, { redirect: 'manual', ...opts });
  const text = await res.text().catch(() => '');
  return { status: res.status, headers: res.headers, text, location: res.headers.get('location') || '' };
}

function pass(name, ok, detail = '') {
  rows.push({ name, ok: !!ok, detail: String(detail).slice(0, 200) });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + String(detail).slice(0, 120) : ''}`);
}

async function main() {
  const secret = envSecret();

  // 1 Trailing slash
  const bare = await req('/about-us');
  pass('1 trailing bare→slash', bare.status === 301 && /\/about-us\/?$/.test(bare.location), `${bare.status} ${bare.location}`);
  const slashed = await req('/about-us/');
  pass('1 trailing slashed 200', slashed.status === 200, String(slashed.status));
  const asset = await req('/runtime-gtm.js');
  pass('1 asset no slash redirect', asset.status === 200, String(asset.status));

  // 2 Canonical / SEO
  const home = await req('/');
  const canon = (home.text.match(/rel=["']canonical["'][^>]*href=["']([^"']+)/i) || home.text.match(/href=["']([^"']+)["'][^>]*rel=["']canonical["']/i) || [,''])[1];
  pass('2 absolute canonical', /^https:\/\/alburaq\.ae\/?$/.test(canon), canon);
  for (const p of ['/robots.txt', '/sitemap_index.xml', '/page-sitemap.xml', '/post-sitemap.xml', '/llms.txt', '/llm.txt']) {
    const r = await req(p);
    pass(`2 ${p}`, r.status === 200, String(r.status));
  }

  // 3 GTM
  const gtm = await req('/runtime-gtm.js');
  pass('3 runtime-gtm.js', gtm.status === 200 && /recreateScript|G-9WMEJS3R07|gtag|dataLayer/i.test(gtm.text), `len=${gtm.text.length}`);
  pass('3 page loads runtime-gtm', /runtime-gtm\.js/.test(home.text));
  pass('3 no hardcoded gtm.js in home', !/googletagmanager\.com\/gtm\.js/.test(home.text));

  // 4 Forms
  const health = await req('/api/health/');
  pass('4 health', health.status === 200 && /"ok"\s*:\s*true/.test(health.text), health.text.slice(0, 80));
  const empty = await req('/api/contact/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: BASE },
    body: JSON.stringify({ name: '', email: '', phone: '', message: '', website: '' }),
  });
  pass('4 empty contact rejects', empty.status === 422, String(empty.status));
  const contact = await req('/api/contact/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: BASE },
    body: JSON.stringify({
      name: 'Verify User',
      email: 'verify@example.com',
      phone: '+971500000000',
      message: 'go-live check',
      website: '',
      gclid: 'test-gclid-phase10',
      utm_source: 'verify',
      campaignId: '1',
      device: 'm',
      pageUrl: '/?gclid=test-gclid-phase10&campaignid=1&device=m',
    }),
  });
  let contactOk = false;
  let submissionId = '';
  try {
    const j = JSON.parse(contact.text);
    contactOk = contact.status === 200 && j.success === true;
    submissionId = j.submissionId || '';
  } catch {}
  pass('4 contact success', contactOk, contact.text.slice(0, 120));

  // Attribution via internal API
  const leads = await req('/api/internal/leads/?limit=5', {
    headers: { Authorization: `Bearer ${secret}` },
  });
  let attrOk = false;
  try {
    const j = JSON.parse(leads.text);
    const list = j.leads || [];
    attrOk = list.some((l) => (l.payload?.gclid || '') === 'test-gclid-phase10' && l.payload?.campaignId === '1' && l.payload?.device === 'm');
  } catch {}
  pass('4 attribution gclid/UTM on lead', attrOk, `submissionId=${submissionId}`);
  pass('4 no FORM_NOTIFICATION required', !/FORM_NOTIFICATION_EMAILS=\S+/.test(readFileSync(join(ROOT, '.env.example'), 'utf8').split('\n').filter((l) => !l.startsWith('#')).join('\n')));

  // 5 Internal APIs
  const deny = await req('/api/internal/leads/');
  pass('5 internal deny', deny.status === 401 || deny.status === 403, String(deny.status));
  pass('5 internal auth', leads.status === 200, String(leads.status));
  for (const p of ['/api/internal/gtm/', '/api/internal/redirects/', '/api/internal/posts/']) {
    const r = await req(p, { headers: { Authorization: `Bearer ${secret}` } });
    pass(`5 ${p}`, r.status === 200, String(r.status));
  }

  // 6 Redirects store loads (empty OK)
  pass('6 redirects.yml loads', existsSync(join(ROOT, 'src/data/redirects.yml')));

  // 7 Process
  pass('7 entry.mjs', existsSync(join(ROOT, 'dist/server/entry.mjs')));
  pass('7 deploy templates', existsSync(join(ROOT, 'deploy/alburaq.service')) && existsSync(join(ROOT, 'deploy/alburaq.ae.caddy')));

  // 8 Cleanup
  const php = [];
  function walk(dir) {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, name.name);
      if (name.isDirectory()) {
        if (['node_modules', 'dist', '.data'].includes(name.name)) continue;
        walk(p);
      } else if (/\.(php|phtml|phar)$/i.test(name.name)) php.push(p);
    }
  }
  walk(join(ROOT, 'public'));
  pass('8 no PHP in public', php.length === 0, `php=${php.length}`);
  pass('8 no quarantine junk', !existsSync(join(ROOT, '_quarantine-html-masquerade')) && !existsSync(join(ROOT, '_crawl')));

  // 9 404 brand
  const notFound = await req('/___404-brand-check___/');
  pass('9 404 status', notFound.status === 404, String(notFound.status));
  pass('9 404 Al Buraq brand', /Al Buraq/i.test(notFound.text) && !/Pittant|S&P Heavy|royalvisa/i.test(notFound.text));
  const logoPath = '/wp-content/uploads/2024/12/LOGO-AL-BURAQ-GROUP-color.svg';
  const logo = await req(logoPath);
  pass('9 404 logo file 200', logo.status === 200, String(logo.status));
  pass('9 404 logo on disk', existsSync(join(ROOT, 'public', logoPath.replace(/^\//, ''))));

  // 10 Content parity vs live sitemap
  const inv = JSON.parse(readFileSync(join(ROOT, 'src/data/sitemap-inventory.json'), 'utf8'));
  let bad = 0;
  const samples = [];
  for (const item of [...inv.pages, ...inv.posts]) {
    const path = item.slug === 'homepage' ? '/' : `/${item.slug}/`;
    const r = await req(path);
    if (r.status !== 200) {
      bad++;
      if (samples.length < 8) samples.push(`${path}:${r.status}`);
    }
  }
  pass('10 all sitemap paths 200', bad === 0, `checked=${inv.pages.length + inv.posts.length} bad=${bad} ${samples.join(',')}`);

  // Live sitemap counts
  const livePostsXml = await (await fetch(`${LIVE}/post-sitemap.xml`)).text();
  const livePagesXml = await (await fetch(`${LIVE}/page-sitemap.xml`)).text();
  const livePosts = (livePostsXml.match(/<loc>/g) || []).length;
  const livePages = (livePagesXml.match(/<loc>/g) || []).length;
  pass('10 post count vs live', inv.posts.length === livePosts, `local=${inv.posts.length} live=${livePosts}`);
  pass('10 page count vs live', inv.pages.length === livePages, `local=${inv.pages.length} live=${livePages}`);

  // Blog images sample
  const blog = await req('/blog/');
  const imgs = [...new Set([...(blog.text.matchAll(/\/wp-content\/uploads\/[^"'?\s]+/g) || [])].map((m) => m[0]))].slice(0, 15);
  let miss = 0;
  for (const img of imgs) {
    const r = await req(img);
    if (r.status >= 400) miss++;
  }
  pass('10 blog card images 200', miss === 0, `checked=${imgs.length} missing=${miss}`);

  // Fleet smoke parity extras
  pass('mirror-fixes.js', (await req('/js/astro-mirror-fixes.js')).status === 200);
  pass('cms FEATURES_FULL_CMS', /FEATURES_FULL_CMS/.test(readFileSync(join(ROOT, 'src/cms.ts'), 'utf8')));

  const failed = rows.filter((r) => !r.ok);
  const report = {
    domain: 'alburaq.ae',
    port: 5120,
    at: new Date().toISOString(),
    pass: failed.length === 0,
    passed: rows.filter((r) => r.ok).length,
    failed: failed.length,
    rows,
  };
  mkdirSync(join(ROOT, 'docs'), { recursive: true });
  writeFileSync(join(ROOT, 'docs/10-go-live-verify-report.json'), JSON.stringify(report, null, 2));
  console.log(`\n${failed.length === 0 ? 'ALL PASS' : 'FAILURES: ' + failed.length} — wrote docs/10-go-live-verify-report.json`);
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
