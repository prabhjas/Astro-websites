#!/usr/bin/env node
/**
 * One-shot ops audit helpers for emiratisationhub verification.
 * Usage: node scripts/_ops-audit.mjs <scan-legacy|strip-analytics|test-contact>
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const LEGACY = join(ROOT, 'src/legacy');

function walk(dir, acc = []) {
  for (const n of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, n.name);
    if (n.isDirectory()) walk(p, acc);
    else if (n.name.endsWith('.cleaned.html')) acc.push(p);
  }
  return acc;
}

function stripAnalytics(html) {
  let out = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (block) => {
    if (/googletagmanager\.com\/(?:gtm\.js|ns\.html|gtag\/js)/i.test(block)) return '';
    if (/['"]GTM-[A-Z0-9]+['"]/.test(block) && /dataLayer|gtm\.js|googletagmanager/i.test(block)) return '';
    if (/window\.dataLayer\s*=\s*window\.dataLayer\s*\|\|\s*\[\]/i.test(block) && /gtag\(\s*['"]config['"]/i.test(block)) {
      return '';
    }
    if (/function\s+gtag\s*\(/i.test(block) && /gtag\(\s*['"]config['"]/i.test(block)) return '';
    if (/G-7B6EW1N2SB/i.test(block) && /gtag|googletagmanager|dataLayer/i.test(block)) return '';
    return block;
  });

  out = out.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, (block) =>
    /googletagmanager/i.test(block) ? '' : block,
  );

  out = out
    .replace(/<iframe\b[^>]*googletagmanager\.com\/ns\.html[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<!--\s*Google Tag Manager\s*(?:\(noscript\))?\s*-->/gi, '')
    .replace(/<!--\s*End Google Tag Manager\s*(?:\(noscript\))?\s*-->/gi, '')
    .replace(/<!--\s*Google tag\s*\(gtag\.js\)\s*-->/gi, '')
    // WP Rocket lazy placeholders that still embed gtag URLs
    .replace(/data-rocket-src=["']https?:\/\/www\.googletagmanager\.com\/[^"']+["']/gi, '')
    .replace(/https?:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-[A-Z0-9]+/gi, '');

  return out;
}

function cmdScan() {
  const files = walk(LEGACY);
  const abs = new Map();
  const ext = new Map();
  let gtmFiles = 0;
  const reAbs = /https:\/\/emiratisationhub\.com\/(?:wp-content|wp-includes)\/[^"'\\\s>]+/gi;
  const reExt =
    /https?:\/\/(?!emiratisationhub\.com|www\.w3\.org|schemas\.|fonts\.|cdnjs\.|ajax\.googleapis)[^"'\\\s>]+\.(?:png|jpe?g|gif|webp|svg|ico)/gi;
  const reGtm = /googletagmanager|GTM-[A-Z0-9]+|G-7B6EW1N2SB/i;

  for (const f of files) {
    const h = readFileSync(f, 'utf8');
    let m;
    while ((m = reAbs.exec(h))) abs.set(m[0], (abs.get(m[0]) || 0) + 1);
    while ((m = reExt.exec(h))) ext.set(m[0], (ext.get(m[0]) || 0) + 1);
    if (reGtm.test(h)) gtmFiles += 1;
  }

  console.log(JSON.stringify({
    cleanedFiles: files.length,
    filesWithHardcodedAnalytics: gtmFiles,
    uniqueAbsWpUrls: abs.size,
    absSample: [...abs.keys()].slice(0, 40),
    uniqueExternalImgs: ext.size,
    extSample: [...ext.keys()].slice(0, 40),
  }, null, 2));
}

function cmdStrip() {
  const files = walk(LEGACY);
  let changed = 0;
  for (const f of files) {
    const before = readFileSync(f, 'utf8');
    const after = stripAnalytics(before);
    if (after !== before) {
      writeFileSync(f, after, 'utf8');
      changed += 1;
    }
  }
  console.log(`Stripped analytics in ${changed}/${files.length} cleaned HTML files`);
}

async function cmdTestContact() {
  const base = process.env.LOCAL_BASE || 'http://127.0.0.1:5107';
  const payload = {
    name: 'Ops Verify Test',
    email: 'ops-verify@example.com',
    phone: '+971501234567',
    message: 'Ops verification test — please ignore / delete.',
    formName: 'Emiratisation Hub Contact Form',
    formSource: 'ops-audit',
    pageUrl: `${base}/contact-us/`,
    submissionId: `ops-verify-${Date.now()}`,
    submittedAt: new Date().toISOString(),
  };

  const res = await fetch(`${base}/api/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  console.log(JSON.stringify({ status: res.status, body: text.slice(0, 800) }, null, 2));
}

const cmd = process.argv[2] || 'scan-legacy';
if (cmd === 'scan-legacy') cmdScan();
else if (cmd === 'strip-analytics') cmdStrip();
else if (cmd === 'test-contact') await cmdTestContact();
else {
  console.error('Unknown command');
  process.exit(1);
}
