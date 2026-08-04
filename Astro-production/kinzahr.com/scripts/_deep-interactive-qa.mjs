/**
 * Deep interactive QA: accordions, tabs, carousels, status, chunk errors.
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, '.tmp-qa');
mkdirSync(OUT, { recursive: true });
const LOCAL = 'http://127.0.0.1:5085';

const inv = JSON.parse(readFileSync(join(ROOT, 'src/data/sitemap-inventory.json'), 'utf8'));
const paths = [];
for (const p of inv.pages || []) {
  const raw = typeof p === 'string' ? p : p.path || p.url || p.slug;
  if (!raw) continue;
  try {
    paths.push(String(raw).startsWith('http') ? new URL(raw).pathname : raw.startsWith('/') ? raw : `/${raw}/`);
  } catch {
    /* ignore */
  }
}
const uniq = [...new Set(paths.map((p) => (p.endsWith('/') ? p : `${p}/`)))];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const results = [];

for (const path of uniq) {
  const fails = [];
  const errs = [];
  page.removeAllListeners('requestfailed');
  page.removeAllListeners('pageerror');
  page.removeAllListeners('console');
  page.on('requestfailed', (req) => {
    const u = req.url();
    if (/google|facebook|hotjar|doubleclick|mouseflow|analytics|fonts\.g/i.test(u)) return;
    if (/\.(js|css)(\?|$)/i.test(u) && u.includes('127.0.0.1')) {
      fails.push(u.replace(LOCAL, ''));
    }
  });
  page.on('pageerror', (e) => {
    const m = String(e.message || e);
    if (/ChunkLoadError|is not a function|Cannot read/i.test(m)) errs.push(m.slice(0, 140));
  });
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const t = msg.text();
    if (/\$ is not a function|ChunkLoadError|404/i.test(t)) errs.push(t.slice(0, 140));
  });

  const res = await page.goto(LOCAL + path, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => null);
  await page.waitForTimeout(2800);

  const interactive = await page.evaluate(async () => {
    const out = {
      nestedAcc: 0,
      nestedAccOk: 0,
      nestedAccFail: [],
      nestedTabs: 0,
      nestedTabsOk: 0,
      classicTabs: 0,
      classicTabsOk: 0,
      classicAcc: 0,
      classicAccOk: 0,
      swipers: document.querySelectorAll('.swiper').length,
      swipersInit: document.querySelectorAll('.swiper-initialized').length,
    };

    // Nested accordion: click a closed item and expect it to open
    for (const root of document.querySelectorAll('.elementor-widget-n-accordion .e-n-accordion')) {
      out.nestedAcc += 1;
      const items = [...root.querySelectorAll('details.e-n-accordion-item')];
      if (!items.length) {
        out.nestedAccFail.push('no-items');
        continue;
      }
      const target = items.find((d) => !d.open) || items[0];
      const wasOpen = target.open;
      target.querySelector('summary')?.click();
      await new Promise((r) => setTimeout(r, 350));
      const panel = target.querySelector('[role="region"], :scope > .e-con');
      const h = panel ? panel.getBoundingClientRect().height : 0;
      const ok = wasOpen ? !target.open || items.filter((i) => i.open).length <= 1 : target.open && h > 10;
      if (ok) out.nestedAccOk += 1;
      else {
        out.nestedAccFail.push({
          title: target.querySelector('.e-n-accordion-item-title-text')?.textContent?.trim()?.slice(0, 40),
          open: target.open,
          h: Math.round(h),
        });
      }
    }

    // Nested tabs (skip header mega-menu tabs — height 0 when closed menu)
    for (const root of document.querySelectorAll('.elementor-widget-n-tabs .e-n-tabs')) {
      if (root.closest('[data-elementor-type="header"], header, .e-n-menu')) continue;
      out.nestedTabs += 1;
      const titles = [...root.querySelectorAll('.e-n-tab-title')];
      if (titles.length < 2) {
        out.nestedTabsOk += 1;
        continue;
      }
      const second = titles[1];
      second.click();
      await new Promise((r) => setTimeout(r, 300));
      const panelId = second.getAttribute('aria-controls');
      const panel = panelId ? document.getElementById(panelId) : null;
      const ok =
        second.getAttribute('aria-selected') === 'true' &&
        panel &&
        (panel.classList.contains('e-active') || getComputedStyle(panel).display !== 'none');
      if (ok) out.nestedTabsOk += 1;
    }

    // Classic tabs
    for (const root of document.querySelectorAll('.elementor-widget-tabs .elementor-tabs')) {
      out.classicTabs += 1;
      const titles = [...root.querySelectorAll('.elementor-tab-title')];
      if (titles.length < 2) {
        out.classicTabsOk += 1;
        continue;
      }
      const second = titles.find((t) => t.getAttribute('data-tab') === '2') || titles[1];
      second.click();
      await new Promise((r) => setTimeout(r, 250));
      if (second.classList.contains('elementor-active') || second.getAttribute('aria-selected') === 'true') {
        out.classicTabsOk += 1;
      }
    }

    // Classic accordion
    for (const root of document.querySelectorAll('.elementor-widget-accordion .elementor-accordion')) {
      out.classicAcc += 1;
      const titles = [...root.querySelectorAll('.elementor-tab-title')];
      const closed = titles.find((t) => !t.classList.contains('elementor-active')) || titles[0];
      if (!closed) {
        out.classicAccOk += 1;
        continue;
      }
      closed.click();
      await new Promise((r) => setTimeout(r, 350));
      if (closed.classList.contains('elementor-active')) out.classicAccOk += 1;
    }

    return out;
  });

  const row = {
    path,
    status: res?.status() || 0,
    assetFails: [...new Set(fails)].slice(0, 8),
    jsErrs: [...new Set(errs)].slice(0, 6),
    ...interactive,
  };
  results.push(row);
  const issues = [];
  if (row.status !== 200) issues.push('status');
  if (row.assetFails.length) issues.push('assets');
  if (row.jsErrs.length) issues.push('js');
  if (row.nestedAcc && row.nestedAccOk < row.nestedAcc) issues.push('n-acc');
  if (row.nestedTabs && row.nestedTabsOk < row.nestedTabs) issues.push('n-tabs');
  if (row.classicTabs && row.classicTabsOk < row.classicTabs) issues.push('tabs');
  if (row.classicAcc && row.classicAccOk < row.classicAcc) issues.push('acc');
  if (row.swipers && row.swipersInit < row.swipers) issues.push('swiper');
  console.log(
    `${issues.length ? 'ISSUE' : 'OK'} ${row.status} ${path} acc=${row.nestedAccOk}/${row.nestedAcc} tabs=${row.nestedTabsOk}/${row.nestedTabs} swiper=${row.swipersInit}/${row.swipers}${issues.length ? ' [' + issues.join(',') + ']' : ''}`,
  );
}

await browser.close();
const summary = {
  total: results.length,
  ok: results.filter(
    (r) =>
      r.status === 200 &&
      !r.assetFails.length &&
      !r.jsErrs.length &&
      r.nestedAccOk === r.nestedAcc &&
      r.nestedTabsOk === r.nestedTabs &&
      r.classicTabsOk === r.classicTabs &&
      r.classicAccOk === r.classicAcc,
  ).length,
  issues: results.filter(
    (r) =>
      r.status !== 200 ||
      r.assetFails.length ||
      r.jsErrs.length ||
      r.nestedAccOk < r.nestedAcc ||
      r.nestedTabsOk < r.nestedTabs ||
      r.classicTabsOk < r.classicTabs ||
      r.classicAccOk < r.classicAcc ||
      (r.swipers && r.swipersInit < r.swipers),
  ),
};
writeFileSync(join(OUT, 'deep-interactive-qa.json'), JSON.stringify({ summary, results }, null, 2));
console.log(JSON.stringify({ summary: { total: summary.total, ok: summary.ok, issueCount: summary.issues.length }, topIssues: summary.issues.slice(0, 20) }, null, 2));
