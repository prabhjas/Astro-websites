#!/usr/bin/env node
/**
 * One-shot verification: forms/Pipedrive, images, redirects, GTM/sitemap.
 */
import { readdirSync, readFileSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.QA_BASE || 'http://127.0.0.1:5106';
const publicRoot = join(ROOT, 'public');

const report = { base: BASE, at: new Date().toISOString(), checks: {}, fails: [] };

function fail(msg) {
  report.fails.push(msg);
}

// --- 1. Forms + Pipedrive ---
{
  const contactHtml = await (await fetch(`${BASE}/contact-us/`)).text();
  const hasForm = /wpcf7-form|contact-form-7/i.test(contactHtml);
  const hasFixes = contactHtml.includes('astro-mirror-fixes.js');
  const payload = {
    name: 'Verify Checklist User',
    email: 'verify-checklist@example.com',
    phone: '+971501112233',
    message: 'Verify Pipedrive connection checklist',
    form_name: 'Emiratisation Gateway Contact Form',
    page_url: `${BASE}/contact-us/`,
  };
  const res = await fetch(`${BASE}/api/contact/`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  report.checks.forms = {
    contactPageOk: contactHtml.length > 1000,
    hasCf7Form: hasForm,
    hasMirrorFixes: hasFixes,
    apiStatus: res.status,
    apiSuccess: !!body.success,
    submissionId: body.submissionId || null,
  };
  if (!hasForm) fail('CONTACT_PAGE missing CF7 form markup');
  if (!hasFixes) fail('CONTACT_PAGE missing astro-mirror-fixes.js');
  if (!body.success) fail(`CONTACT_API ${JSON.stringify(body)}`);
}

// --- 2. Images local ---
{
  const refs = new Set();
  const imgPathRe = /\/(wp-content\/uploads\/[^"'\\s),?]+\.(?:png|jpe?g|webp|gif|svg))/gi;

  function scan(file) {
    const s = readFileSync(file, 'utf8');
    let m;
    const re = new RegExp(imgPathRe);
    while ((m = re.exec(s))) refs.add('/' + m[1]);
  }
  function walk(dir) {
    if (!existsSync(dir)) return;
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (/\.(cleaned\.html|html|json)$/i.test(ent.name)) scan(p);
    }
  }
  walk(join(ROOT, 'src/legacy'));
  walk(join(ROOT, 'src/content/blog'));
  walk(join(ROOT, 'src/content/authors'));

  const missing = [];
  let present = 0;
  for (const ref of refs) {
    const local = join(publicRoot, ref.replace(/^\//, '').split('?')[0]);
    if (existsSync(local) && statSync(local).size > 0) present++;
    else missing.push(ref);
  }

  const remoteExternal = new Set();
  let absSameDomain = 0;
  function walkRemote(dir) {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, ent.name);
      if (ent.isDirectory()) walkRemote(p);
      else if (ent.name.endsWith('.cleaned.html')) {
        const s = readFileSync(p, 'utf8');
        for (const m of s.matchAll(
          /https?:\/\/(?!emiratisationgateway\.com)[^"']+\.(?:png|jpe?g|webp|gif|svg)/gi,
        )) {
          remoteExternal.add(m[0]);
        }
        absSameDomain += (s.match(/https:\/\/emiratisationgateway\.com\/wp-content\/uploads\//g) || [])
          .length;
      }
    }
  }
  walkRemote(join(ROOT, 'src/legacy'));

  // Spot-check homepage image URLs over HTTP
  const home = await (await fetch(`${BASE}/`)).text();
  const homeImgs = [...new Set([...home.matchAll(/src=["'](\/wp-content\/[^"']+)["']/g)].map((m) => m[1].split(' ')[0]))];
  const httpMissing = [];
  for (const src of homeImgs.slice(0, 50)) {
    const r = await fetch(BASE + src);
    if (!r.ok) httpMissing.push({ src, status: r.status });
  }

  // Sample a blog post
  const inv = JSON.parse(readFileSync(join(ROOT, 'src/data/sitemap-inventory.json'), 'utf8'));
  const samplePost = inv.posts?.[0]?.slug;
  let postHttpMissing = [];
  if (samplePost) {
    const postHtml = await (await fetch(`${BASE}/${samplePost}/`)).text();
    const postImgs = [
      ...new Set([...postHtml.matchAll(/src=["'](\/wp-content\/[^"']+)["']/g)].map((m) => m[1].split(' ')[0])),
    ];
    for (const src of postImgs.slice(0, 40)) {
      const r = await fetch(BASE + src);
      if (!r.ok) postHttpMissing.push({ src, status: r.status });
    }
  }

  report.checks.images = {
    uploadRefsInContent: refs.size,
    presentOnDisk: present,
    missingOnDisk: missing.length,
    missingSample: missing.slice(0, 20),
    externalRemoteCount: remoteExternal.size,
    externalRemoteSample: [...remoteExternal].slice(0, 10),
    absoluteSameDomainUploadRefs: absSameDomain,
    homepageImgChecked: Math.min(50, homeImgs.length),
    homepageHttpMissing: httpMissing,
    samplePost,
    postHttpMissing,
  };
  if (missing.length) fail(`IMAGES_MISSING_ON_DISK ${missing.length}`);
  if (remoteExternal.size) fail(`IMAGES_EXTERNAL_REMOTE ${remoteExternal.size}`);
  if (httpMissing.length) fail(`IMAGES_HOME_HTTP_MISSING ${httpMissing.length}`);
  if (postHttpMissing.length) fail(`IMAGES_POST_HTTP_MISSING ${postHttpMissing.length}`);
}

// --- 3. Redirects ---
{
  const yml = readFileSync(join(ROOT, 'src/data/redirects.yml'), 'utf8');
  const froms = [...yml.matchAll(/from:\s*(\S+)/g)].map((m) => m[1]);
  const results = [];
  for (const from of froms) {
    const r = await fetch(BASE + from, { redirect: 'manual' });
    results.push({ from, status: r.status, location: r.headers.get('location') || '' });
    if (![301, 302, 307, 308].includes(r.status)) fail(`REDIR ${from} HTTP ${r.status}`);
  }
  report.checks.redirects = {
    configured: froms.length,
    ok: results.filter((r) => [301, 302, 307, 308].includes(r.status)).length,
    sample: results.slice(0, 8),
  };
}

// --- 4. GTM + sitemap ---
{
  const home = await (await fetch(`${BASE}/`)).text();
  const gtmJs = await (await fetch(`${BASE}/runtime-gtm.js`)).text();
  const hardGtm = /googletagmanager\.com\/gtm\.js\?id=GTM/i.test(home);
  const runtimeLoader = /data-runtime-gtm|runtime-gtm\.js/.test(home);
  const gtmIdInRuntime = /GTM-5T7TC5MF/.test(gtmJs) || /GTM-[A-Z0-9]+/.test(gtmJs);

  const env = readFileSync(join(ROOT, '.env'), 'utf8');
  const publicGtm = env.match(/^PUBLIC_GTM_ID=(.*)$/m)?.[1]?.trim() || '';
  const publicGa4 = env.match(/^PUBLIC_GA4_ID=(.*)$/m)?.[1]?.trim() || '';

  function locs(xml) {
    return [...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)].map((m) => m[1].trim());
  }
  const indexXml = await (await fetch(`${BASE}/sitemap_index.xml`)).text();
  const pageXml = await (await fetch(`${BASE}/page-sitemap.xml`)).text();
  const postXml = await (await fetch(`${BASE}/post-sitemap.xml`)).text();
  const robots = await (await fetch(`${BASE}/robots.txt`)).text();
  const pageLocs = locs(pageXml);
  const postLocs = locs(postXml);
  const indexLocs = locs(indexXml);

  const blogSlugs = readdirSync(join(ROOT, 'src/content/blog'))
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''));
  const missingFromSitemap = blogSlugs.filter(
    (s) => !postLocs.some((u) => u.endsWith(`/${s}/`) || u.endsWith(`/${s}`)),
  );

  report.checks.gtm = {
    publicGtmId: publicGtm,
    publicGa4Id: publicGa4,
    runtimeGtmHttp: (await fetch(`${BASE}/runtime-gtm.js`)).status,
    runtimeJsBytes: gtmJs.length,
    runtimeContainsContainerId: gtmIdInRuntime,
    homepageHasRuntimeLoader: runtimeLoader,
    homepageHasHardcodedGtm: hardGtm,
    runtimeSnippet: gtmJs.slice(0, 280),
  };
  report.checks.sitemap = {
    indexLocs: indexLocs.length,
    indexSample: indexLocs,
    pageLocs: pageLocs.length,
    pageSample: pageLocs.slice(0, 5),
    postLocs: postLocs.length,
    blogJsonCount: blogSlugs.length,
    postsMissingFromSitemap: missingFromSitemap.length,
    postsMissingSample: missingFromSitemap.slice(0, 10),
    robotsHasSitemap: /sitemap_index\.xml/i.test(robots),
  };

  if (!publicGtm) fail('GTM_ENV_MISSING PUBLIC_GTM_ID');
  if ((await fetch(`${BASE}/runtime-gtm.js`)).status !== 200) fail('GTM_RUNTIME_JS_DOWN');
  if (!runtimeLoader) fail('GTM_HOMEPAGE_NO_RUNTIME_LOADER');
  if (hardGtm) fail('GTM_HOMEPAGE_HARDCODED');
  if (!gtmIdInRuntime) fail('GTM_RUNTIME_MISSING_CONTAINER_ID');
  if (indexLocs.length < 2) fail('SITEMAP_INDEX_THIN');
  if (pageLocs.length < 5) fail('SITEMAP_PAGES_THIN');
  if (postLocs.length < 50) fail('SITEMAP_POSTS_THIN');
  if (missingFromSitemap.length) fail(`SITEMAP_POSTS_MISSING ${missingFromSitemap.length}`);
  if (!/sitemap_index\.xml/i.test(robots)) fail('ROBOTS_NO_SITEMAP');
}

report.ok = report.fails.length === 0;
writeFileSync(join(ROOT, 'docs/11-verify-checklist.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, fails: report.fails, checks: report.checks }, null, 2));
process.exit(report.ok ? 0 : 1);
