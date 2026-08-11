#!/usr/bin/env node
import { chromium } from 'playwright';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// 1) Find JS files mentioning Rent that fail Function parse when loaded as whole file
function walk(dir, out = []) {
  for (const n of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, n.name);
    if (n.isDirectory()) walk(p, out);
    else if (n.name.endsWith('.js')) out.push(p);
  }
  return out;
}

const files = walk('public/wp-content').filter((f) => {
  try {
    const st = statSync(f);
    if (st.size > 2_000_000) return false;
    const t = readFileSync(f, 'utf8');
    return /Rent/.test(t);
  } catch {
    return false;
  }
});
console.log('js files with Rent:', files.length);
for (const f of files.slice(0, 40)) {
  const t = readFileSync(f, 'utf8');
  try {
    // eslint-disable-next-line no-new-func
    new Function(t);
  } catch (e) {
    console.log('BAD FILE', f, e.message);
  }
}

// 2) Capture exact script URL from CDP exception
const browser = await chromium.launch();
const page = await browser.newPage();
const client = await page.context().newCDPSession(page);
await client.send('Runtime.enable');
client.on('Runtime.exceptionThrown', (params) => {
  const d = params.exceptionDetails;
  console.log('CDP exception:', d.text || d.exception?.description);
  console.log(' URL:', d.url, 'line', d.lineNumber, 'col', d.columnNumber);
  if (d.stackTrace?.callFrames?.[0]) console.log(' frame', d.stackTrace.callFrames[0]);
});
await page.goto('http://127.0.0.1:5121/', { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {});
await page.waitForTimeout(2000);
await browser.close();
