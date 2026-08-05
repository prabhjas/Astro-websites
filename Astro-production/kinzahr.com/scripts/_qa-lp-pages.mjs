/**
 * Deep QA: live kinzahr.com LP pages vs local :5093
 * Compares titles, fonts, colors, headings, forms, images, layout metrics.
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, '.tmp-qa-lp');
mkdirSync(OUT, { recursive: true });

const LOCAL = 'http://127.0.0.1:5093';
const LIVE = 'https://kinzahr.com';
const PATHS = ['/best-recruitment-lp/', '/headhunter-lp/', '/recruitment-agency-lp/'];

async function snapshot(page, url) {
  const failed = [];
  const badStatus = [];
  page.removeAllListeners('requestfailed');
  page.removeAllListeners('response');
  page.on('requestfailed', (req) => {
    const u = req.url();
    if (/google|facebook|hotjar|doubleclick|mouseflow|analytics|gtm|clarity|linkedin|tiktok|pixel/i.test(u))
      return;
    failed.push({ url: u, err: req.failure()?.errorText });
  });
  page.on('response', (res) => {
    const u = res.url();
    const st = res.status();
    if (st < 400) return;
    if (/google|facebook|hotjar|doubleclick|mouseflow|analytics|gtm|clarity|linkedin|tiktok|pixel/i.test(u))
      return;
    if (!u.includes('127.0.0.1') && !u.includes('kinzahr')) return;
    badStatus.push({ url: u, status: st });
  });

  const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(2000);
  // dismiss overlays that may block
  await page.mouse.click(5, 5).catch(() => {});

  const data = await page.evaluate(() => {
    const pick = (el) => {
      if (!el) return null;
      const cs = getComputedStyle(el);
      return {
        tag: el.tagName.toLowerCase(),
        text: (el.innerText || '').trim().slice(0, 120),
        fontFamily: cs.fontFamily,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        color: cs.color,
        lineHeight: cs.lineHeight,
        letterSpacing: cs.letterSpacing,
        textTransform: cs.textTransform,
      };
    };

    const headings = [...document.querySelectorAll('h1, h2, h3')]
      .filter((el) => el.offsetParent !== null || getComputedStyle(el).display !== 'none')
      .slice(0, 20)
      .map(pick);

    const body = document.body;
    const bodyCs = getComputedStyle(body);

    const forms = [...document.querySelectorAll('form.wpcf7-form')].map((f) => {
      const inputs = [...f.querySelectorAll('input, textarea, select')].map((i) => ({
        type: i.type || i.tagName.toLowerCase(),
        name: i.name || '',
        placeholder: i.placeholder || '',
        required: i.required || i.getAttribute('aria-required') === 'true',
      }));
      const cs = getComputedStyle(f);
      const submit = f.querySelector('input[type=submit], button[type=submit], .wpcf7-submit');
      return {
        action: f.getAttribute('action') || '',
        inputCount: inputs.length,
        inputs,
        display: cs.display,
        submitText: submit ? (submit.value || submit.innerText || '').trim() : null,
        submitBg: submit ? getComputedStyle(submit).backgroundColor : null,
        submitColor: submit ? getComputedStyle(submit).color : null,
        submitRadius: submit ? getComputedStyle(submit).borderRadius : null,
      };
    });

    const imgs = [...document.querySelectorAll('img')]
      .filter((img) => img.offsetWidth > 20 && img.offsetHeight > 20)
      .slice(0, 40)
      .map((img) => {
        const r = img.getBoundingClientRect();
        return {
          src: (img.currentSrc || img.src || '').replace(/^https?:\/\/[^/]+/, ''),
          w: Math.round(r.width),
          h: Math.round(r.height),
          naturalW: img.naturalWidth,
          naturalH: img.naturalHeight,
          broken: img.naturalWidth === 0,
          alt: (img.alt || '').slice(0, 60),
        };
      });

    const hero = document.querySelector('.elementor-section, .elementor-top-section, main, #content');
    const heroBox = hero ? hero.getBoundingClientRect() : null;

    // sample key brand colors from visible buttons / accents
    const buttons = [...document.querySelectorAll('a.elementor-button, .elementor-button, button')]
      .filter((el) => el.offsetWidth > 0)
      .slice(0, 8)
      .map((el) => {
        const cs = getComputedStyle(el);
        return {
          text: (el.innerText || el.value || '').trim().slice(0, 40),
          bg: cs.backgroundColor,
          color: cs.color,
          borderRadius: cs.borderRadius,
          fontSize: cs.fontSize,
          fontFamily: cs.fontFamily,
          padding: `${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`,
        };
      });

    const sections = [...document.querySelectorAll('.elementor-top-section, .elementor-section.elementor-top-section')]
      .slice(0, 15)
      .map((s) => {
        const r = s.getBoundingClientRect();
        const cs = getComputedStyle(s);
        return {
          id: s.id || s.dataset.id || '',
          h: Math.round(r.height),
          bg: cs.backgroundColor,
          bgImage: cs.backgroundImage?.slice(0, 80) || 'none',
        };
      });

    return {
      title: document.title,
      bodyFont: bodyCs.fontFamily,
      bodyColor: bodyCs.color,
      bodyBg: bodyCs.backgroundColor,
      scrollHeight: document.documentElement.scrollHeight,
      headings,
      forms,
      imgs,
      buttons,
      sections,
      heroW: heroBox ? Math.round(heroBox.width) : 0,
      hasHeader: !!document.querySelector('[data-elementor-type="header"], .elementor-location-header, header'),
      hasFooter: !!document.querySelector('[data-elementor-type="footer"], .elementor-location-footer, footer'),
      cf7Count: document.querySelectorAll('form.wpcf7-form').length,
      intlTel: !!document.querySelector('.intl-tel-input, .wpcf7-phonetext, input[type=tel]'),
    };
  });

  const slug = new URL(url).pathname.replace(/\//g, '-').replace(/^-|-$/g, '') || 'home';
  const host = url.includes('127.0.0.1') ? 'local' : 'live';
  await page.screenshot({ path: join(OUT, `${host}-${slug}-top.png`), fullPage: false });
  await page.screenshot({ path: join(OUT, `${host}-${slug}-full.png`), fullPage: true });

  return {
    status: resp?.status() || 0,
    failed: failed.slice(0, 30),
    badStatus: badStatus.slice(0, 30),
    ...data,
  };
}

function diffHeadings(live, local) {
  const issues = [];
  const n = Math.max(live.length, local.length);
  if (live.length !== local.length) {
    issues.push(`heading count live=${live.length} local=${local.length}`);
  }
  for (let i = 0; i < Math.min(n, 20); i++) {
    const a = live[i];
    const b = local[i];
    if (!a || !b) continue;
    if (a.text !== b.text) issues.push(`h[${i}] text: live="${a.text}" local="${b.text}"`);
    if (a.fontFamily !== b.fontFamily) issues.push(`h[${i}] fontFamily: "${a.fontFamily}" vs "${b.fontFamily}"`);
    if (a.fontSize !== b.fontSize) issues.push(`h[${i}] fontSize: ${a.fontSize} vs ${b.fontSize}`);
    if (a.fontWeight !== b.fontWeight) issues.push(`h[${i}] fontWeight: ${a.fontWeight} vs ${b.fontWeight}`);
    if (a.color !== b.color) issues.push(`h[${i}] color: ${a.color} vs ${b.color}`);
  }
  return issues;
}

function diffForms(live, local) {
  const issues = [];
  if (live.length !== local.length) issues.push(`form count live=${live.length} local=${local.length}`);
  for (let i = 0; i < Math.min(live.length, local.length); i++) {
    const a = live[i];
    const b = local[i];
    if (a.inputCount !== b.inputCount) issues.push(`form[${i}] inputs ${a.inputCount} vs ${b.inputCount}`);
    if (a.submitText !== b.submitText) issues.push(`form[${i}] submit "${a.submitText}" vs "${b.submitText}"`);
    if (a.submitBg !== b.submitBg) issues.push(`form[${i}] submitBg ${a.submitBg} vs ${b.submitBg}`);
    if (a.submitColor !== b.submitColor) issues.push(`form[${i}] submitColor ${a.submitColor} vs ${b.submitColor}`);
    const an = a.inputs.map((x) => x.name).filter(Boolean).sort().join(',');
    const bn = b.inputs.map((x) => x.name).filter(Boolean).sort().join(',');
    if (an !== bn) issues.push(`form[${i}] field names differ`);
  }
  return issues;
}

function diffImgs(live, local) {
  const issues = [];
  const broken = local.filter((i) => i.broken);
  if (broken.length) issues.push(`broken images local: ${broken.length} e.g. ${broken[0].src}`);
  const liveSrcs = new Set(live.map((i) => i.src));
  const localSrcs = new Set(local.map((i) => i.src));
  const missingOnLocal = [...liveSrcs].filter((s) => !localSrcs.has(s)).slice(0, 10);
  if (missingOnLocal.length) issues.push(`img srcs on live not on local (sample): ${missingOnLocal.join(' | ')}`);
  if (Math.abs(live.length - local.length) > 2) {
    issues.push(`visible img count live=${live.length} local=${local.length}`);
  }
  // size check for matching srcs
  for (const li of live.slice(0, 15)) {
    const lo = local.find((x) => x.src === li.src);
    if (!lo) continue;
    if (Math.abs(li.w - lo.w) > 8 || Math.abs(li.h - lo.h) > 8) {
      issues.push(`img size ${li.src}: live ${li.w}x${li.h} local ${lo.w}x${lo.h}`);
    }
  }
  return issues;
}

function diffButtons(live, local) {
  const issues = [];
  for (let i = 0; i < Math.min(live.length, local.length); i++) {
    const a = live[i];
    const b = local[i];
    if (a.bg !== b.bg) issues.push(`btn[${i}] bg ${a.bg} vs ${b.bg} ("${a.text}")`);
    if (a.color !== b.color) issues.push(`btn[${i}] color ${a.color} vs ${b.color}`);
    if (a.fontSize !== b.fontSize) issues.push(`btn[${i}] fontSize ${a.fontSize} vs ${b.fontSize}`);
    if (a.fontFamily !== b.fontFamily) issues.push(`btn[${i}] font ${a.fontFamily} vs ${b.fontFamily}`);
  }
  return issues;
}

function diffLayout(live, local) {
  const issues = [];
  const hDiff = Math.abs(live.scrollHeight - local.scrollHeight);
  if (hDiff > 80) issues.push(`scrollHeight live=${live.scrollHeight} local=${local.scrollHeight} Δ=${hDiff}`);
  if (live.hasHeader !== local.hasHeader) issues.push(`header presence live=${live.hasHeader} local=${local.hasHeader}`);
  if (live.hasFooter !== local.hasFooter) issues.push(`footer presence live=${live.hasFooter} local=${local.hasFooter}`);
  if (live.cf7Count !== local.cf7Count) issues.push(`cf7 count live=${live.cf7Count} local=${local.cf7Count}`);
  if (live.bodyFont !== local.bodyFont) issues.push(`body font "${live.bodyFont}" vs "${local.bodyFont}"`);
  if (live.bodyColor !== local.bodyColor) issues.push(`body color ${live.bodyColor} vs ${local.bodyColor}`);
  for (let i = 0; i < Math.min(live.sections.length, local.sections.length); i++) {
    const a = live.sections[i];
    const b = local.sections[i];
    if (Math.abs(a.h - b.h) > 40) issues.push(`section[${i}] height ${a.h} vs ${b.h}`);
    if (a.bg !== b.bg) issues.push(`section[${i}] bg ${a.bg} vs ${b.bg}`);
  }
  return issues;
}

const browser = await chromium.launch({ headless: true });
const report = [];

for (const path of PATHS) {
  console.log(`\n=== ${path} ===`);
  const livePage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const localPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  let live;
  let local;
  try {
    live = await snapshot(livePage, LIVE + path);
  } catch (e) {
    live = { error: String(e) };
  }
  try {
    local = await snapshot(localPage, LOCAL + path);
  } catch (e) {
    local = { error: String(e) };
  }
  await livePage.close();
  await localPage.close();

  if (live.error || local.error) {
    report.push({ path, error: { live: live.error, local: local.error } });
    console.log('ERROR', live.error || local.error);
    continue;
  }

  const issues = [
    ...diffLayout(live, local),
    ...diffHeadings(live.headings, local.headings),
    ...diffForms(live.forms, local.forms),
    ...diffImgs(live.imgs, local.imgs),
    ...diffButtons(live.buttons, local.buttons),
  ];

  if (live.title !== local.title) issues.unshift(`title: "${live.title}" vs "${local.title}"`);
  if (local.status !== 200) issues.unshift(`local status ${local.status}`);
  if (local.failed.length) issues.push(`requestfailed: ${local.failed.length}`);
  if (local.badStatus.length) {
    issues.push(
      `bad asset status: ${local.badStatus
        .slice(0, 8)
        .map((x) => `${x.status} ${x.url.replace(LOCAL, '')}`)
        .join(', ')}`,
    );
  }

  const entry = {
    path,
    liveStatus: live.status,
    localStatus: local.status,
    titleLive: live.title,
    titleLocal: local.title,
    scrollLive: live.scrollHeight,
    scrollLocal: local.scrollHeight,
    formsLive: live.cf7Count,
    formsLocal: local.cf7Count,
    imgsLive: live.imgs.length,
    imgsLocal: local.imgs.length,
    brokenLocal: local.imgs.filter((i) => i.broken).length,
    failedAssets: local.failed.slice(0, 15),
    badStatus: local.badStatus.slice(0, 15),
    issueCount: issues.length,
    issues: issues.slice(0, 60),
  };
  report.push(entry);
  console.log(
    `status L${live.status}/loc${local.status} issues=${issues.length} forms=${local.cf7Count} imgs=${local.imgs.length} broken=${entry.brokenLocal}`,
  );
  for (const iss of issues.slice(0, 25)) console.log('  -', iss);
}

await browser.close();
writeFileSync(join(OUT, 'lp-qa-report.json'), JSON.stringify(report, null, 2));
console.log('\nWrote', join(OUT, 'lp-qa-report.json'));
const totalIssues = report.reduce((n, r) => n + (r.issueCount || 0), 0);
process.exit(totalIssues > 0 ? 1 : 0);
