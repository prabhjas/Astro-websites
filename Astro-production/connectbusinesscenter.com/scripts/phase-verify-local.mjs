#!/usr/bin/env node
/**
 * Local Phase 06/07/10 verify for connectbusinesscenter.com (:5116)
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.CBC_BASE || 'http://127.0.0.1:5116';

function readLocalSecret() {
  if (process.env.INTERNAL_JOB_SECRET) return process.env.INTERNAL_JOB_SECRET.trim();
  const envPath = join(ROOT, '.env');
  if (!existsSync(envPath)) return '';
  const m = readFileSync(envPath, 'utf8').match(/^INTERNAL_JOB_SECRET=(.*)$/m);
  return m ? m[1].trim() : '';
}

const secret = readLocalSecret();

async function head(path) {
  const res = await fetch(BASE + path, { method: 'GET', redirect: 'manual' });
  return { path, status: res.status, location: res.headers.get('location') || '', type: res.headers.get('content-type') || '' };
}

async function get(path) {
  const res = await fetch(BASE + path, { redirect: 'manual' });
  const text = await res.text();
  return { path, status: res.status, location: res.headers.get('location') || '', type: res.headers.get('content-type') || '', text, headers: res.headers };
}

function pass(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  return ok;
}

async function main() {
  let fails = 0;
  const check = (name, ok, detail) => {
    if (!pass(name, ok, detail)) fails++;
  };

  {
    const r = await get('/api/health/');
    check('G3 health', r.status === 200 && r.text.includes('connectbusinesscenter'), `${r.status}`);
  }

  {
    const r = await head('/about-us');
    check('trailing slash redirect', r.status === 301 && (r.location || '').includes('/about-us/'), `${r.status} ${r.location}`);
  }
  {
    const r = await get('/about-us/');
    check('about-us 200', r.status === 200, `${r.status}`);
  }

  {
    const r = await get('/');
    check('homepage 200', r.status === 200, `${r.status}`);
    check(
      'absolute canonical',
      /rel=["']canonical["'][^>]*https:\/\/connectbusinesscenter\.com/i.test(r.text) ||
        /href=["']https:\/\/connectbusinesscenter\.com\/["']/i.test(r.text),
      'canonical grep',
    );
    check(
      'Organization JSON-LD',
      /application\/ld\+json/i.test(r.text) &&
        (/"@type"\s*:\s*"Organization"/i.test(r.text) ||
          /"@type"\s*:\s*\[[^\]]*"Organization"/i.test(r.text)),
      '',
    );
    check('runtime GTM loader or marker', /data-runtime-gtm="1"|runtime-gtm\.js|sp-gtm-ssr/i.test(r.text), '');
    check('mirror fixes script', /astro-mirror-fixes\.js/i.test(r.text), '');
  }

  for (const p of ['/robots.txt', '/sitemap_index.xml', '/page-sitemap.xml', '/post-sitemap.xml', '/llms.txt', '/llm.txt', '/runtime-gtm.js']) {
    const r = await get(p);
    check(`${p}`, r.status === 200, `${r.status} ${r.type}`);
  }

  {
    const r = await get('/sitemap_index.xml');
    check('sitemap_index host', r.text.includes('connectbusinesscenter.com'), '');
    check('sitemap_index lists page', r.text.includes('page-sitemap.xml'), '');
    check('sitemap_index lists post', r.text.includes('post-sitemap.xml'), '');
    check('sitemap_index omits empty law', !r.text.includes('law-sitemap.xml'), '');
  }

  {
    const r = await get('/runtime-gtm.js');
    check('runtime-gtm recreateScript', r.text.includes('recreateScript'), '');
    check('runtime-gtm no-store', (r.headers.get('cache-control') || '').includes('no-store'), r.headers.get('cache-control') || '');
  }

  {
    const r = await get('/this-page-does-not-exist-cbc-xyz/');
    check('G1 real 404', r.status === 404, `${r.status}`);
  }

  {
    const bare = await head('/internal/operations');
    const slashed = await get('/internal/operations/');
    check(
      'G5 no CMS UI',
      (bare.status === 301 || bare.status === 404) && slashed.status === 404,
      `bare=${bare.status} slash=${slashed.status}`,
    );
  }

  {
    const r = await get('/api/internal/gtm/');
    check('G6 internal without secret', r.status === 401 || r.status === 403, `${r.status}`);
  }
  if (secret) {
    const res = await fetch(BASE + '/api/internal/gtm/', {
      headers: { Authorization: `Bearer ${secret}` },
    });
    check('G6 internal with bearer', res.status === 200, `${res.status}`);
  } else {
    check('G6 internal with bearer', false, 'INTERNAL_JOB_SECRET not set in env');
  }

  {
    const res = await fetch(BASE + '/api/contact/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://127.0.0.1:5116' },
      body: JSON.stringify({}),
    });
    check('G2 empty contact 422', res.status === 422, `${res.status}`);
  }
  {
    const res = await fetch(BASE + '/api/contact/?gclid=test123&campaignid=99&device=m', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://127.0.0.1:5116' },
      body: JSON.stringify({
        'your-name': 'Phase Verify',
        'your-email': 'verify@example.com',
        'phonetext-257': '501234567',
        'phonetext-257-country-code': '+971',
        'your-message': 'Phase 04/10 local verify',
        gclid: 'test123',
        campaignid: '99',
        device: 'm',
      }),
    });
    const body = await res.json().catch(() => ({}));
    check(
      'G2/G13 valid contact (+ attribution fields)',
      res.status === 200 && body.success === true,
      `${res.status} ${(body.message || '').slice(0, 80)}`,
    );
  }

  {
    const r = await get('/insights/');
    check('insights listing 200', r.status === 200, `${r.status}`);
  }
  {
    const r = await get('/contact-us/');
    check('contact-us 200', r.status === 200, `${r.status}`);
  }
  {
    const r = await get('/home/');
    check('redirect /home/ → /', r.status === 301 && ((r.location || '').endsWith('/') || (r.location || '').includes('://')), `${r.status} ${r.location}`);
  }

  console.log(`\n${fails === 0 ? 'ALL CHECKS PASSED' : `FAILED=${fails}`}  base=${BASE}`);
  process.exit(fails === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
