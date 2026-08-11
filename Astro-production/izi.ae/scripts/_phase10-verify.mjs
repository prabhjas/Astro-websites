#!/usr/bin/env node
/**
 * Phase 10 loopback verify for izi.ae (port 5121).
 */
const BASE = process.env.IZI_BASE || 'http://127.0.0.1:5121';
const rows = [];

function add(name, pass, detail) {
  rows.push({ name, pass: !!pass, detail: String(detail).slice(0, 200) });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name.padEnd(24)} ${detail}`);
}

async function fetchRaw(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, { redirect: 'manual', ...init });
  const body = await res.text();
  return { status: res.status, body, headers: res.headers, location: res.headers.get('location') || '' };
}

async function main() {
  // 1 trailing slash
  {
    const r = await fetchRaw('/about-us');
    add('slash-bare', r.status === 301 && /\/about-us\/?$/.test(r.location), `HTTP ${r.status} Location=${r.location}`);
  }
  {
    const r = await fetchRaw('/about-us/');
    add('slash-ok', r.status === 200, `HTTP ${r.status}`);
  }
  {
    const r = await fetchRaw('/runtime-gtm.js');
    add('slash-asset', r.status === 200 && !r.location, `HTTP ${r.status}`);
  }

  // 2 SEO
  const home = await fetchRaw('/');
  const canon = home.body.match(/rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)
    || home.body.match(/href=["']([^"']+)["'][^>]*rel=["']canonical["']/i);
  const canonUrl = canon?.[1] || '';
  add('canonical', /^https:\/\/izi\.ae\/?$/.test(canonUrl), `canonical=${canonUrl}`);
  add('org-jsonld', /Organization/.test(home.body), 'Organization in homepage');
  add('gtm-loader', /data-runtime-gtm="1"|sp-gtm-ssr/.test(home.body), 'loader marker');

  for (const p of [
    '/robots.txt',
    '/sitemap_index.xml',
    '/page-sitemap.xml',
    '/post-sitemap.xml',
    '/car-sitemap.xml',
    '/llms.txt',
    '/llm.txt',
  ]) {
    const r = await fetchRaw(p);
    add(`seo${p}`, r.status === 200, `HTTP ${r.status}`);
  }
  {
    const robots = await fetchRaw('/robots.txt');
    add(
      'robots-domain',
      /izi\.ae/.test(robots.body) && !/pittant|lladesigners/i.test(robots.body),
      robots.body.slice(0, 120).replace(/\s+/g, ' '),
    );
  }

  // 3 GTM
  {
    const rt = await fetchRaw('/runtime-gtm.js');
    add('gtm-recreate', /recreateScript/.test(rt.body), 'recreateScript');
    const ids = [...rt.body.matchAll(/\b(G-[A-Z0-9]+|GTM-[A-Z0-9]+)\b/g)].map((m) => m[1]);
    const uniq = [...new Set(ids)];
    add(
      'gtm-ids',
      uniq.includes('G-6FB28YLPSD') && !uniq.includes('GTM-AAAA') && !uniq.includes('GTM-TXNVDFBM'),
      `ids=${uniq.join(',') || '(none)'}`,
    );
  }

  // 4 forms (space submits — rate limit is 5/min per IP)
  {
    const r = await fetchRaw('/api/contact/', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: BASE },
      body: JSON.stringify({}),
    });
    add('contact-empty', r.status >= 400, `HTTP ${r.status}`);
  }
  await new Promise((r) => setTimeout(r, 250));
  {
    const stamp = Date.now();
    const r = await fetchRaw(`/api/contact/?gclid=test-gclid&campaignid=1&device=m`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: BASE },
      body: JSON.stringify({
        name: 'Attr Smoke',
        email: `attr-${stamp}@example.com`,
        phone: '+971500000001',
        message: 'gclid test',
        website: '',
        gclid: 'test-gclid',
        campaignid: '1',
        device: 'm',
      }),
    });
    let ok = false;
    try {
      ok = r.status === 200 && JSON.parse(r.body).success === true;
    } catch {
      /* */
    }
    add('contact-attr', ok, `HTTP ${r.status} ${r.body.slice(0, 80)}`);
  }

  // G13 lead store (file store nests under .data/leads/state/)
  {
    const { readdirSync, readFileSync, existsSync, statSync } = await import('node:fs');
    const { join } = await import('node:path');
    const dir = join(process.cwd(), 'Astro-production/izi.ae/.data/leads');
    /** @param {string} d */
    function walk(d) {
      /** @type {string[]} */
      const out = [];
      if (!existsSync(d)) return out;
      for (const name of readdirSync(d)) {
        const p = join(d, name);
        if (statSync(p).isDirectory()) out.push(...walk(p));
        else if (name.endsWith('.json')) out.push(p);
      }
      return out;
    }
    let hit = false;
    for (const f of walk(dir)) {
      if (readFileSync(f, 'utf8').includes('test-gclid')) {
        hit = true;
        break;
      }
    }
    add('attr-g13', hit, 'gclid on lead JSON');
  }

  {
    const r = await fetchRaw('/api/internal/posts/');
    add('internal-deny', r.status === 401 || r.status === 403, `HTTP ${r.status}`);
  }

  // 404 brand
  {
    const r = await fetchRaw('/this-page-does-not-exist-izi/');
    add('404-status', r.status === 404, `HTTP ${r.status}`);
    add(
      '404-brand',
      /IZI Rent a Car/.test(r.body) && /logo-izi\.png/.test(r.body) && !/Pittant|LLA Designers/i.test(r.body),
      'brand+logo',
    );
  }

  // sample pages
  for (const p of ['/', '/contact-us/', '/blog/', '/car/toyota-yaris-2024/', '/vehicles/toyota/', '/faqs/']) {
    const r = await fetchRaw(p);
    add(`page:${p}`, r.status === 200, `HTTP ${r.status}`);
  }

  // redirects: bare /contact → slash, then /contact/ → /contact-us/
  {
    const bare = await fetchRaw('/contact');
    add('redir-contact-slash', bare.status === 301 && /\/contact\/$/.test(bare.location), `HTTP ${bare.status} ${bare.location}`);
    const slashed = await fetchRaw('/contact/');
    add(
      'redir-contact-alias',
      [301, 302, 308].includes(slashed.status) && /contact-us/.test(slashed.location),
      `HTTP ${slashed.status} ${slashed.location}`,
    );
  }

  const failed = rows.filter((r) => !r.pass).length;
  const passed = rows.filter((r) => r.pass).length;
  console.log(`\nSUMMARY: ${passed} PASS / ${failed} FAIL / ${rows.length} total`);
  const { writeFileSync, mkdirSync } = await import('node:fs');
  const { join } = await import('node:path');
  const outDir = join(process.cwd(), 'Astro-production/izi.ae/docs');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    join(outDir, '10-go-live-verify-loopback.json'),
    JSON.stringify({ base: BASE, at: new Date().toISOString(), passed, failed, rows }, null, 2),
  );
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
