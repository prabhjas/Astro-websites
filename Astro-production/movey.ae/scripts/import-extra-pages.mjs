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

/** slug → fetch URL (live or Wayback id_ for clean HTML) */
const EXTRA_PAGES = [
  { slug: 'about-us', url: 'https://movey.ae/about-us/', kind: 'page' },
  { slug: 'contact-us', url: 'https://movey.ae/contact-us/', kind: 'page' },
  {
    slug: 'movey-faqs',
    url: 'https://web.archive.org/web/20250124192927id_/https://movey.ae/movey-faqs/',
    kind: 'page',
    note: 'Live /movey-faqs/ redirects to homepage; restored from Wayback Jan 2025',
  },
];

const args = process.argv.slice(2);
const shouldPrepare = args.includes('--prepare');
const shouldDownload = args.includes('--download') || shouldPrepare;

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'movey-ae-astro-extra-pages/1.0',
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
| Live URL | https://movey.ae/${entry.slug}/ |
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
  const inv = JSON.parse(await readFile(INVENTORY, 'utf8'));
  const pages = [...(inv.pages || [])];
  const bySlug = new Map(pages.map((p) => [p.slug, p]));
  for (const e of entries) {
    bySlug.set(e.slug, { slug: e.slug, url: `https://movey.ae/${e.slug}/` });
  }
  inv.pages = [...bySlug.values()].sort((a, b) => a.slug.localeCompare(b.slug));
  inv.extraPagesImportedAt = new Date().toISOString();
  await writeFile(INVENTORY, JSON.stringify(inv, null, 2), 'utf8');
  console.log(`Inventory pages: ${inv.pages.length}`);
}

async function main() {
  const ok = [];
  for (const entry of EXTRA_PAGES) {
    const exportPath = join(ROOT, 'source/wordpress-exports', entry.slug, 'index-https.html');
    console.log(`FETCH ${entry.slug} ← ${entry.url}`);
    try {
      const html = await fetchText(entry.url);
      if (!/<html/i.test(html) || html.length < 5000) {
        console.warn(`  thin/failed ${entry.slug} (${html.length} bytes)`);
        continue;
      }
      await writeExport(entry, html);
      ok.push(entry);
      console.log(`  saved ${html.length} bytes`);
    } catch (err) {
      console.warn(`  FAIL ${entry.slug}:`, err.message || err);
    }
  }

  if (ok.length) await mergeInventory(ok);

  if (shouldPrepare) {
    for (const entry of ok) {
      if (!existsSync(join(ROOT, 'source/wordpress-exports', entry.slug, 'index-https.html'))) continue;
      console.log(`PREPARE ${entry.slug}`);
      const passed = await runPrepare(entry.slug);
      if (!passed) console.warn(`  prepare failed: ${entry.slug}`);
    }
  }

  // FAQ Elementor CSS is gone on live (301→home); prepare saves homepage HTML as .css.
  if (ok.some((e) => e.slug === 'movey-faqs') && existsSync(join(ROOT, 'scripts/rebuild-faq-page.mjs'))) {
    console.log('REBUILD movey-faqs (about-us shell + /css/movey-faqs.css)');
    await new Promise((resolve) => {
      const child = spawn(process.execPath, ['scripts/rebuild-faq-page.mjs'], {
        cwd: ROOT,
        stdio: 'inherit',
      });
      child.on('exit', () => resolve());
    });
  }

  console.log('\nDone. Rebuild + restart fleet-local to serve new routes.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
