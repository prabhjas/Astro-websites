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
    if (/\.bundle\.min\.js|ChunkLoadError/i.test(u)) fails.push(u.replace(LOCAL, ''));
  });
  page.on('pageerror', (e) => {
    const m = String(e.message || e);
    if (/ChunkLoadError|Loading chunk|reading 'el'/i.test(m)) errs.push(m.slice(0, 160));
  });
  const res = await page.goto(LOCAL + path, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => null);
  await page.waitForTimeout(1800);
  const widgets = await page.evaluate(() => ({
    swipers: document.querySelectorAll('.swiper').length,
    swipersInit: document.querySelectorAll('.swiper-initialized').length,
    nfooter: !!document.querySelector('.n-footer'),
    kzformLeak: !!document.querySelector('.n-footer.kzform'),
  }));
  const row = {
    path,
    status: res?.status() || 0,
    chunkFails: [...new Set(fails)].slice(0, 6),
    jsErrs: [...new Set(errs)].slice(0, 4),
    ...widgets,
  };
  results.push(row);
  const ok = row.status === 200 && !row.chunkFails.length && !row.jsErrs.length;
  console.log(`${ok ? 'OK' : 'ISSUE'} ${row.status} ${path} swiper=${row.swipersInit}/${row.swipers}`);
}

await browser.close();
const summary = {
  total: results.length,
  ok: results.filter((r) => r.status === 200 && !r.chunkFails.length && !r.jsErrs.length).length,
  withIssues: results.filter((r) => r.status !== 200 || r.chunkFails.length || r.jsErrs.length),
  kzformLeaks: results.filter((r) => r.kzformLeak).map((r) => r.path),
};
writeFileSync(join(OUT, 'final-deep-qa.json'), JSON.stringify({ summary, results }, null, 2));
console.log(JSON.stringify(summary, null, 2));
