/**
 * Verify /api/contact accepts leads + Pipedrive delivery for local fleet.
 */
import { readFileSync, readdirSync, statSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.BASE || 'http://127.0.0.1:5121';
const envTxt = readFileSync(join(ROOT, '.env'), 'utf8');
const env = (k) => (envTxt.match(new RegExp(`^${k}=(.*)$`, 'm'))?.[1] || '').trim();
const token = env('PIPEDRIVE_API_TOKEN');
const domain = env('PIPEDRIVE_COMPANY_DOMAIN') || 'connectgroup2';
const websiteId = env('WEBSITE_ID');
const pdBase = `https://${domain}.pipedrive.com/api/v1`;

const checks = [];
const add = (group, name, pass, detail = '') => {
  checks.push({ group, name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} [${group}] ${name}${detail ? ` — ${detail}` : ''}`);
};

function walk(d, acc = []) {
  if (!existsSync(d)) return acc;
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (n.endsWith('.json')) acc.push(p);
  }
  return acc;
}

async function pd(path, qs = {}) {
  const url = new URL(pdBase + path);
  url.searchParams.set('api_token', token);
  for (const [k, v] of Object.entries(qs)) url.searchParams.set(k, String(v));
  const r = await fetch(url);
  const j = await r.json().catch(() => ({}));
  return { status: r.status, j };
}

const stamp = Date.now();
const email = `izi-verify-${stamp}@example.com`;
const payload = {
  name: `IZI Verify ${stamp}`,
  first_name: 'IZI',
  last_name: 'Verify',
  email,
  phone: '+971501112233',
  message: `Verify form+Pipedrive delivery ${stamp}`,
  website: '',
  gclid: `izi-verify-${stamp}`,
  campaignid: '77',
  device: 'c',
};

// empty reject
{
  const r = await fetch(`${BASE}/api/contact/`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: BASE },
    body: '{}',
  });
  add('forms', 'empty rejected', r.status >= 400, `HTTP ${r.status}`);
}

await new Promise((r) => setTimeout(r, 400));

let apiBody = {};
{
  const r = await fetch(`${BASE}/api/contact/?gclid=${payload.gclid}&campaignid=77&device=c`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: BASE },
    body: JSON.stringify(payload),
  });
  apiBody = await r.json().catch(() => ({}));
  add(
    'forms',
    'API submit success',
    r.status === 200 && apiBody.success === true,
    `HTTP ${r.status} id=${apiBody.submissionId || '-'}`,
  );
}

await new Promise((r) => setTimeout(r, 1000));

const leads = walk(join(ROOT, '.data/leads')).sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
let lead = null;
let leadFile = null;
for (const f of leads.slice(0, 80)) {
  const t = readFileSync(f, 'utf8');
  if (t.includes(email) || t.includes(payload.gclid)) {
    leadFile = f;
    try {
      lead = JSON.parse(t);
    } catch {
      /* */
    }
    break;
  }
}
add('forms', 'lead stored', !!lead, leadFile ? leadFile.replace(ROOT, '') : 'not found');

const personId = lead?.pipedrivePersonId || lead?.pipedrive?.personId || null;
const leadId = lead?.pipedriveLeadId || lead?.pipedrive?.leadId || null;
if (lead) {
  const delivered =
    lead.deliveryStatus === 'delivered' ||
    lead?.pipedrive?.ok === true ||
    lead?.integrations?.pipedrive?.ok === true;
  add(
    'forms',
    'deliveryStatus delivered',
    delivered,
    `delivery=${lead.deliveryStatus} person=${personId || '-'} lead=${leadId || '-'}`,
  );
  const blob = JSON.stringify(lead);
  add('forms', 'websiteId correct', blob.includes(String(websiteId)), `expected ${websiteId}`);
}

// Pipedrive: search person by email
{
  const search = await pd('/persons/search', { term: email, fields: 'email', exact_match: 'true' });
  const items = search.j?.data?.items || [];
  const person = items[0]?.item;
  add(
    'pipedrive',
    'person found by email',
    !!person?.id,
    person ? `personId=${person.id}` : `HTTP ${search.status} err=${search.j?.error || 'none'}`,
  );
}

// Pipedrive: fetch lead by local id
if (leadId) {
  const one = await pd(`/leads/${leadId}`);
  add(
    'pipedrive',
    'lead exists in Pipedrive',
    !!one.j?.data?.id,
    one.j?.data ? `leadId=${one.j.data.id} title=${one.j.data.title}` : one.j?.error || 'missing',
  );
} else if (personId) {
  const one = await pd(`/persons/${personId}`);
  add(
    'pipedrive',
    'person exists in Pipedrive',
    !!one.j?.data?.id,
    one.j?.data ? `personId=${one.j.data.id}` : one.j?.error || 'missing',
  );
} else {
  add('pipedrive', 'lead exists in Pipedrive', false, 'no local pipedrive ids');
}

// Browser contact form
{
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const stamp2 = Date.now();
  const email2 = `izi-ui-${stamp2}@example.com`;
  await page.goto(`${BASE}/contact-us/`, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(2500);

  const filled = await page.evaluate((em) => {
    const form = document.querySelector('form.wpcf7-form') || document.querySelector('form');
    if (!form) return { ok: false, reason: 'no form' };
    const set = (sel, val) => {
      const el = form.querySelector(sel);
      if (!el) return false;
      el.focus();
      el.value = val;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    };
    return {
      ok: true,
      first: set('input[name="first-name"], input[name="first_name"], input[name*="first"]', 'Izzi'),
      last: set('input[name="last-name"], input[name="last_name"], input[name*="last"]', 'UIVerify'),
      name: set('input[name="your-name"]', 'Izzi UIVerify'),
      emailOk: set('input[type="email"], input[name*="email"]', em),
      phoneOk: set('input[type="tel"], input[name*="phone"], input[name*="tel"]', '+971501234567'),
      msgOk: set('textarea', `Browser UI Pipedrive verify ${Date.now()}`),
      action: form.getAttribute('action'),
    };
  }, email2);
  add('forms', 'contact page fields found', !!filled.ok && !!filled.emailOk, JSON.stringify(filled));

  const submitPromise = page
    .waitForResponse((r) => r.url().includes('/api/contact') && r.request().method() === 'POST', {
      timeout: 20000,
    })
    .catch(() => null);

  await page.evaluate(() => {
    const btn = document.querySelector(
      'form.wpcf7-form input[type="submit"], form.wpcf7-form button[type="submit"], .wpcf7-submit',
    );
    if (btn) btn.click();
    else {
      const form = document.querySelector('form.wpcf7-form') || document.querySelector('form');
      if (form) {
        if (form.requestSubmit) form.requestSubmit();
        else form.submit();
      }
    }
  });

  const resp = await submitPromise;
  if (resp) {
    const j = await resp.json().catch(() => ({}));
    add(
      'forms',
      'browser form API response',
      resp.status() === 200 && j.success === true,
      `HTTP ${resp.status()} id=${j.submissionId || '-'}`,
    );
  } else {
    await page.waitForTimeout(2000);
    const ui = await page.evaluate(() => ({
      text: (document.querySelector('.wpcf7-response-output')?.textContent || '').trim().slice(0, 160),
    }));
    add('forms', 'browser form API response', false, `no /api/contact request; ui=${JSON.stringify(ui)}`);
  }
  await browser.close();
}

mkdirSync(join(ROOT, '.tmp-qa'), { recursive: true });
const report = { base: BASE, websiteId, checks };
writeFileSync(join(ROOT, '.tmp-qa/verify-forms-pipedrive.json'), JSON.stringify(report, null, 2));
const failed = checks.filter((c) => !c.pass).length;
console.log(`\nDONE forms+pipedrive pass=${checks.length - failed} fail=${failed}`);
if (failed) process.exitCode = 1;
