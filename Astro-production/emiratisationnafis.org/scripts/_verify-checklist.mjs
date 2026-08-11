#!/usr/bin/env node
/**
 * One-shot verification: forms/Pipedrive, images, redirects, GTM/sitemap.
 */
import { readdirSync, readFileSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.QA_BASE || 'http://127.0.0.1:5108';
const DOMAIN = 'emiratisationnafis.org';
const publicRoot = join(ROOT, 'public');

const report = { base: BASE, at: new Date().toISOString(), checks: {}, fails: [] };

function fail(msg) {
  report.fails.push(msg);
}

// --- 1. Forms + Pipedrive ---
{
  const contactHtml = await (await fetch(`${BASE}/contact-us/`)).text();
  const homeHtml = await (await fetch(`${BASE}/`)).text();
  const hasForm = /wpcf7-form|contact-form-7/i.test(contactHtml);
  const hasHomeForm = /wpcf7-form|contact-form-7/i.test(homeHtml);
  const hasFixes = contactHtml.includes('astro-mirror-fixes.js');
  const payload = {
    name: 'Verify Checklist User',
    email: 'verify-checklist-gate@example.com',
    phone: '+971501112233',
    message: 'Verify Pipedrive connection checklist for Emiratisation Nafis',
    form_name: 'Emiratisation Nafis Contact Form',
    page_url: `${BASE}/contact-us/`,
  };
  const res = await fetch(`${BASE}/api/contact/`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json();

  let pipedrive = { stateFound: false };
  if (body.submissionId) {
    const statePath = join(ROOT, '.data/leads/state', `${body.submissionId}.json`);
    if (existsSync(statePath)) {
      const state = JSON.parse(readFileSync(statePath, 'utf8'));
      pipedrive = {
        stateFound: true,
        submissionStatus: state.submissionStatus || null,
        deliveryStatus: state.deliveryStatus || null,
        personId: state.pipedrivePersonId || null,
        leadId: state.pipedriveLeadId || null,
        summary: state.pipedriveResponseSummary || null,
      };
      if (state.deliveryStatus !== 'delivered' || !state.pipedriveLeadId) {
        fail(
          `PIPEDRIVE_NOT_DELIVERED delivery=${state.deliveryStatus} leadId=${state.pipedriveLeadId || 'none'}`,
        );
      }
    } else {
      fail(`PIPEDRIVE_STATE_FILE_MISSING ${body.submissionId}`);
    }
  }

  report.checks.forms = {
    contactPageOk: contactHtml.length > 1000,
    hasCf7Form: hasForm,
    hasHomeCf7Form: hasHomeForm,
    hasMirrorFixes: hasFixes,
    apiStatus: res.status,
    apiSuccess: !!body.success,
    submissionId: body.submissionId || null,
    pipedrive,
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
    if (!existsSync(dir)) return;
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, ent.name);
      if (ent.isDirectory()) walkRemote(p);
      else if (ent.name.endsWith('.cleaned.html') || ent.name.endsWith('.json')) {
        const s = readFileSync(p, 'utf8');
        for (const m of s.matchAll(
          new RegExp(
            `https?:\\/\\/(?!${DOMAIN.replace(/\./g, '\\.')})[^"']+\\.(?:png|jpe?g|webp|gif|svg)`,
            'gi',
          ),
        )) {
          // Ignore common CDNs that are intentional (gravatar already localized separately)
          if (/gravatar\.com|googleusercontent|gstatic|facebook\.com|doubleclick/i.test(m[0])) continue;
          remoteExternal.add(m[0]);
        }
        absSameDomain += (
          s.match(new RegExp(`https:\\/\\/${DOMAIN.replace(/\./g, '\\.')}\\/wp-content\\/uploads\\/`, 'g')) || []
        ).length;
      }
    }
  }
  walkRemote(join(ROOT, 'src/legacy'));
  walkRemote(join(ROOT, 'src/content/blog'));

  const home = await (await fetch(`${BASE}/`)).text();
  const homeImgs = [
    ...new Set([...home.matchAll(/src=["'](\/wp-content\/[^"']+)["']/g)].map((m) => m[1].split(' ')[0])),
  ];
  const httpMissing = [];
  for (const src of homeImgs.slice(0, 50)) {
    const r = await fetch(BASE + src);
    if (!r.ok) httpMissing.push({ src, status: r.status });
  }

  const inv = JSON.parse(readFileSync(join(ROOT, 'src/data/sitemap-inventory.json'), 'utf8'));
  const samplePost = inv.posts?.[0]?.slug;
  let postHttpMissing = [];
  let postImgCount = 0;
  if (samplePost) {
    const postHtml = await (await fetch(`${BASE}/${samplePost}/`)).text();
    const postImgs = [
      ...new Set([...postHtml.matchAll(/src=["'](\/wp-content\/[^"']+)["']/g)].map((m) => m[1].split(' ')[0])),
    ];
    postImgCount = postImgs.length;
    for (const src of postImgs.slice(0, 40)) {
      const r = await fetch(BASE + src);
      if (!r.ok) postHttpMissing.push({ src, status: r.status });
    }
  }

  // Sample a page (non-home)
  const samplePage = inv.pages?.find((p) => p.slug && p.slug !== 'homepage')?.slug || 'about-us';
  let pageHttpMissing = [];
  {
    const pageHtml = await (await fetch(`${BASE}/${samplePage}/`)).text();
    const pageImgs = [
      ...new Set([...pageHtml.matchAll(/src=["'](\/wp-content\/[^"']+)["']/g)].map((m) => m[1].split(' ')[0])),
    ];
    for (const src of pageImgs.slice(0, 40)) {
      const r = await fetch(BASE + src);
      if (!r.ok) pageHttpMissing.push({ src, status: r.status });
    }
  }

  // Absolute same-domain refs in source are OK if served HTML is root-relative
  // (SEO og:image / twitter:image may remain absolute by design).
  const servedAbsAll = [
    ...home.matchAll(
      new RegExp(`https:\\/\\/${DOMAIN.replace(/\./g, '\\.')}\\/wp-content\\/uploads\\/[^"'\\s>]+`, 'g'),
    ),
  ].map((m) => m[0]);
  const servedAbsNonSeo = servedAbsAll.filter(
    (u) => !/og:image|twitter:image|itemprop=["']image["']/i.test(home.slice(Math.max(0, home.indexOf(u) - 80), home.indexOf(u))),
  );

  report.checks.images = {
    uploadRefsInContent: refs.size,
    presentOnDisk: present,
    missingOnDisk: missing.length,
    missingSample: missing.slice(0, 20),
    externalRemoteCount: remoteExternal.size,
    externalRemoteSample: [...remoteExternal].slice(0, 10),
    absoluteSameDomainUploadRefsInSource: absSameDomain,
    servedAbsoluteUploadSample: servedAbsAll.slice(0, 5),
    servedAbsoluteNonSeoCount: servedAbsNonSeo.length,
    homepageImgChecked: Math.min(50, homeImgs.length),
    homepageHttpMissing: httpMissing,
    samplePost,
    postImgCount,
    postHttpMissing,
    samplePage,
    pageHttpMissing,
  };
  if (missing.length) fail(`IMAGES_MISSING_ON_DISK ${missing.length}`);
  if (httpMissing.length) fail(`IMAGES_HOME_HTTP_MISSING ${httpMissing.length}`);
  if (postHttpMissing.length) fail(`IMAGES_POST_HTTP_MISSING ${postHttpMissing.length}`);
  if (pageHttpMissing.length) fail(`IMAGES_PAGE_HTTP_MISSING ${pageHttpMissing.length}`);
}

// --- 3. Redirects ---
{
  const yml = readFileSync(join(ROOT, 'src/data/redirects.yml'), 'utf8');
  const froms = [...yml.matchAll(/from:\s*(\S+)/g)].map((m) => m[1]);
  const results = [];
  for (const from of froms) {
    const r = await fetch(BASE + from, { redirect: 'manual' });
    const loc = r.headers.get('location') || '';
    results.push({ from, status: r.status, location: loc });
    if (![301, 302, 307, 308].includes(r.status)) fail(`REDIR ${from} HTTP ${r.status}`);
  }
  report.checks.redirects = {
    configured: froms.length,
    ok: results.filter((r) => [301, 302, 307, 308].includes(r.status)).length,
    sample: results.slice(0, 8),
    all: results,
  };
}

// --- 4. GTM + sitemap ---
{
  const home = await (await fetch(`${BASE}/`)).text();
  const gtmJs = await (await fetch(`${BASE}/runtime-gtm.js`)).text();
  const hardGtm = /googletagmanager\.com\/gtm\.js\?id=GTM/i.test(home);
  const runtimeLoader = /data-runtime-gtm|runtime-gtm\.js/.test(home);
  const gtmIdInRuntime = /GTM-[A-Z0-9]+/.test(gtmJs) || /G-[A-Z0-9]{6,}/.test(gtmJs);

  const env = readFileSync(join(ROOT, '.env'), 'utf8');
  const publicGtm = env.match(/^PUBLIC_GTM_ID=
  const publicGa4 = env.match(/^PUBLIC_GA4_ID=(.*)$/m)?.[1]?.trim() || '';
  const gtmFile = join(ROOT, '.data/internal-admin/gtm.json');
  const hasGtmFile = existsSync(gtmFile);

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
    hasGtmJsonFile: hasGtmFile,
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
    robotsSnippet: robots.split('\n').slice(0, 8),
  };

  if (!publicGtm && !hasGtmFile && !gtmIdInRuntime) fail('GTM_ENV_MISSING PUBLIC_GTM_ID (and no gtm.json)');
  if ((await fetch(`${BASE}/runtime-gtm.js`)).status !== 200) fail('GTM_RUNTIME_JS_DOWN');
  if (!runtimeLoader) fail('GTM_HOMEPAGE_NO_RUNTIME_LOADER');
  if (hardGtm) fail('GTM_HOMEPAGE_HARDCODED');
  if (!gtmIdInRuntime) fail('GTM_RUNTIME_MISSING_CONTAINER_ID');
  if (indexLocs.length < 2) fail('SITEMAP_INDEX_THIN');
  if (pageLocs.length < 5) fail('SITEMAP_PAGES_THIN');
  if (postLocs.length < 20) fail('SITEMAP_POSTS_THIN');
  if (missingFromSitemap.length) fail(`SITEMAP_POSTS_MISSING ${missingFromSitemap.length}`);
  if (!/sitemap_index\.xml/i.test(robots)) fail('ROBOTS_NO_SITEMAP');
}

report.ok = report.fails.length === 0;
writeFileSync(join(ROOT, 'docs/11-verify-checklist.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, fails: report.fails, checks: report.checks }, null, 2));
process.exit(report.ok ? 0 : 1);
