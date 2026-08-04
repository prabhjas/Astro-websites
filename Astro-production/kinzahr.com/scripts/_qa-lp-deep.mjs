/**
 * Desktop + mobile LP parity QA + form submit smoke.
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = '.tmp-qa-lp';
mkdirSync(OUT, { recursive: true });
const LOCAL = 'http://127.0.0.1:5093';
const LIVE = 'https://kinzahr.com';
const PATHS = ['/best-recruitment-lp/', '/headhunter-lp/', '/recruitment-agency-lp/'];
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

const browser = await chromium.launch({ headless: true });
const report = [];

async function measure(page, url, vpName, slug) {
  const failed = [];
  page.on('requestfailed', (req) => {
    const u = req.url();
    if (/google|facebook|hotjar|analytics|gtm|clarity|linkedin|tiktok|pixel|doubleclick|mouseflow/i.test(u))
      return;
    failed.push(u);
  });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(1800);
  await page.mouse.click(5, 5).catch(() => {});
  const m = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    const hs = [...document.querySelectorAll('h1,h2,h3')]
      .filter((el) => el.offsetParent !== null)
      .map((el) => {
        const cs = getComputedStyle(el);
        return {
          t: el.innerText.trim().slice(0, 80),
          f: cs.fontFamily,
          s: cs.fontSize,
          c: cs.color,
          w: cs.fontWeight,
        };
      });
    const form = document.querySelector('form.wpcf7-form');
    const submit = form?.querySelector('.wpcf7-submit, input[type=submit]');
    return {
      title: document.title,
      scrollH: document.documentElement.scrollHeight,
      h1: h1
        ? {
            text: h1.innerText.trim(),
            font: getComputedStyle(h1).fontFamily,
            size: getComputedStyle(h1).fontSize,
            color: getComputedStyle(h1).color,
          }
        : null,
      headings: hs.slice(0, 12),
      formOk: !!form,
      visibleFields: form
        ? [...form.querySelectorAll('input:not([type=hidden]),textarea,select')]
            .filter((i) => i.offsetParent !== null || i.type === 'submit')
            .map((i) => i.name || i.type)
        : [],
      submit: submit
        ? {
            text: submit.value || submit.innerText,
            bg: getComputedStyle(submit).backgroundColor,
            color: getComputedStyle(submit).color,
            font: getComputedStyle(submit).fontFamily,
            size: getComputedStyle(submit).fontSize,
          }
        : null,
      bodyFont: getComputedStyle(document.body).fontFamily,
    };
  });
  const host = url.includes('127.0.0.1') ? 'local' : 'live';
  const shot = join(OUT, `${vpName}-${host}-${slug}.png`);
  await page.screenshot({ path: shot, fullPage: false });
  await page.evaluate(() => window.scrollTo(0, Math.min(1400, document.documentElement.scrollHeight / 3)));
  await page.waitForTimeout(400);
  await page.screenshot({ path: shot.replace('.png', '-mid.png'), fullPage: false });
  return { ...m, failed: failed.slice(0, 10) };
}

for (const path of PATHS) {
  for (const vp of VIEWPORTS) {
    const livePage = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    const localPage = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    const slug = path.replace(/\//g, '-').replace(/^-|-$/g, '');

    const live = await measure(livePage, LIVE + path, vp.name, slug);
    const local = await measure(localPage, LOCAL + path, vp.name, slug);
    await livePage.close();
    await localPage.close();

    const issues = [];
    if (live.title !== local.title) issues.push(`title "${live.title}" vs "${local.title}"`);
    if (live.h1?.font !== local.h1?.font) issues.push('h1 font');
    if (live.h1?.size !== local.h1?.size) issues.push(`h1 size ${live.h1?.size} vs ${local.h1?.size}`);
    if (live.h1?.color !== local.h1?.color) issues.push('h1 color');
    if (live.h1?.text !== local.h1?.text) issues.push('h1 text');
    if (JSON.stringify(live.visibleFields) !== JSON.stringify(local.visibleFields)) {
      issues.push(`visible fields live=${live.visibleFields} local=${local.visibleFields}`);
    }
    if (live.submit?.bg !== local.submit?.bg) issues.push(`submit bg ${live.submit?.bg} vs ${local.submit?.bg}`);
    if (live.submit?.text !== local.submit?.text) issues.push('submit text');
    if (live.submit?.font !== local.submit?.font) issues.push('submit font');
    if (Math.abs(live.scrollH - local.scrollH) > 120) {
      issues.push(`scrollH ${live.scrollH} vs ${local.scrollH}`);
    }
    for (let i = 0; i < Math.min(live.headings.length, local.headings.length); i++) {
      const a = live.headings[i];
      const b = local.headings[i];
      if (a.t !== b.t) issues.push(`heading[${i}] text`);
      if (a.f !== b.f || a.s !== b.s || a.c !== b.c) {
        issues.push(`heading[${i}] style live=${a.f}/${a.s}/${a.c} local=${b.f}/${b.s}/${b.c}`);
      }
    }
    if (local.failed.length) issues.push(`failed ${local.failed.join(', ')}`);

    report.push({
      path,
      vp: vp.name,
      issues,
      scrollLive: live.scrollH,
      scrollLocal: local.scrollH,
      h1: local.h1,
      submit: local.submit,
    });
    console.log(`${vp.name} ${path} issues=${issues.length}`, issues.slice(0, 6).join(' | ') || 'OK');
  }
}

const page = await browser.newPage();
await page.goto(`${LOCAL}/best-recruitment-lp/`, { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(1000);
await page.fill('input[name="f-name"]', 'QA Test User');
await page.fill('input[name="your-email"]', 'qa-lp-test@example.com');
await page.fill('input[name="your-phone"]', '501234567');
await page.fill('input[name="company-name"]', 'QA Co');
await page.fill('textarea[name="your-message"]', 'Automated LP QA submission — please ignore');
const [resp] = await Promise.all([
  page
    .waitForResponse((r) => r.url().includes('/api/contact') && r.request().method() === 'POST', {
      timeout: 20000,
    })
    .catch(() => null),
  page.click('.wpcf7-submit, input[type=submit]'),
]);
let formResult = { status: resp?.status() ?? 0, body: null };
if (resp) {
  try {
    formResult.body = await resp.json();
  } catch {
    formResult.body = await resp.text();
  }
}
console.log('FORM SUBMIT', JSON.stringify(formResult).slice(0, 400));
report.push({ formSubmit: formResult });

await browser.close();
writeFileSync(join(OUT, 'deep-lp-report.json'), JSON.stringify(report, null, 2));
const hard = report.filter((r) => r.issues?.length).length;
process.exit(hard ? 1 : 0);
