#!/usr/bin/env node
/**
 * Import WP pages missing from Rank Math page-sitemap (nav/footer links).
 *
 * Usage:
 *   node scripts/import-extra-pages.mjs
 *   node scripts/import-extra-pages.mjs --prepare --download
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const INVENTORY = join(ROOT, 'src/data/sitemap-inventory.json');

/** slug → fetch URL — only pages not already covered by page-sitemap if needed */
const EXTRA_PAGES = [
  // Rank Math page-sitemap already covers core pages; keep empty unless gaps appear.
];

const args = process.argv.slice(2);
const shouldPrepare = args.includes('--prepare');
const shouldDownload = args.includes('--download') || shouldPrepare;

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'snapsale-ae-astro-extra-pages/1.0',
      Accept: 'text/html,*/*',
    },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.text();
}

async function writeExport(entry, html) {
  const dir = join(ROOT, 'source/wordpress-exports', entry.slug);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'index-https.html'), html, 'utf8');
  const note = entry.note ? `\n| Note | ${entry.note} |\n` : '';
  await writeFile(
    join(dir, 'notes.md'),
    `# ${entry.slug} export notes

| Field | Value |
|-------|-------|
| Kind | page |
| Live URL | https://snapsale.ae/${entry.slug}/ |
| Fetched from | ${entry.url} |
| File | \`index-https.html\` |
| Added | ${new Date().toISOString().slice(0, 10)} |
${note}
\`\`\`bash
node scripts/prepare-page.mjs ${entry.slug} --download
\`\`\`
`,
    'utf8',
  );
}

function runPrepare(slug) {
  return new Promise((resolve) => {
    const childArgs = ['scripts/prepare-page.mjs', slug];
    if (shouldDownload) childArgs.push('--download');
    const child = spawn(process.execPath, childArgs, { cwd: ROOT, stdio: 'inherit' });
    child.on('exit', (code) => resolve(code === 0));
  });
}

async function mergeInventory(entries) {
  let inv = { generatedAt: null, origin: 'https://snapsale.ae', pages: [], posts: [] };
  if (existsSync(INVENTORY)) {
    inv = JSON.parse(await readFile(INVENTORY, 'utf8'));
  }
  const pageSlugs = new Set((inv.pages || []).map((p) => p.slug));
  for (const e of entries) {
    if (pageSlugs.has(e.slug)) continue;
    inv.pages = inv.pages || [];
    inv.pages.push({ slug: e.slug, url: `https://snapsale.ae/${e.slug}/`, kind: 'page' });
  }
  inv.generatedAt = new Date().toISOString();
  await mkdir(dirname(INVENTORY), { recursive: true });
  await writeFile(INVENTORY, JSON.stringify(inv, null, 2) + '\n', 'utf8');
}

async function main() {
  if (!EXTRA_PAGES.length) {
    console.log('No extra pages configured for snapsale.ae — nothing to import.');
    return;
  }
  const saved = [];
  for (const entry of EXTRA_PAGES) {
    console.log(`Fetching ${entry.slug} …`);
    const html = await fetchText(entry.url);
    await writeExport(entry, html);
    saved.push(entry);
    if (shouldPrepare) {
      const ok = await runPrepare(entry.slug);
      if (!ok) console.warn(`prepare failed for ${entry.slug}`);
    }
  }
  await mergeInventory(saved);
  console.log(`Imported ${saved.length} extra page(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
