#!/usr/bin/env node
/**
 * Bulk-import missing marketing pages linked from the homepage.
 *
 * Usage:
 *   node scripts/import-missing-pages.mjs
 *   node scripts/import-missing-pages.mjs iberiaeor pro-services hr-services
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://connectgroup.co';
const SKIP = new Set(['comments', 'feed', 'comments/feed', 'xmlrpc.php', 'wp-login.php', 'wp-admin']);

const args = process.argv.slice(2).filter((a) => a !== '--' && !a.startsWith('--'));

function pageExists(slug) {
  return existsSync(join(ROOT, 'src/pages', `${slug}.astro`));
}

function exportExists(slug) {
  return existsSync(join(ROOT, 'source/wordpress-exports', slug, 'index-https.html'));
}

function cleanedExists(slug) {
  return existsSync(join(ROOT, 'src/legacy', `${slug}.cleaned.html`));
}

function extractHomepageSlugs() {
  const html = readFileSync(join(ROOT, 'src/legacy/homepage.cleaned.html'), 'utf8');
  const found = new Set();
  for (const m of html.matchAll(/href=["'](\/[^"'?#]+)/g)) {
    const path = m[1].replace(/\/$/, '');
    if (!path || path === '/') continue;
    if (path.startsWith('/wp-') || path.startsWith('/cdn-cgi') || path.startsWith('/feed')) continue;
    if (/\.(css|js|mjs|map|png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|eot|pdf|mp4|webm)$/i.test(path)) {
      continue;
    }
    const slug = path.replace(/^\//, '');
    if (SKIP.has(slug) || slug.includes('/')) continue;
    found.add(slug);
  }
  return [...found];
}

async function fetchLiveHtml(slug) {
  const url = `${ORIGIN}/${slug}/`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'ConnectGroup-Astro-Migrator/0.1',
      Accept: 'text/html',
    },
    redirect: 'follow',
  });
  if (!res.ok) return { ok: false, status: res.status };
  const html = await res.text();
  if (!/<html/i.test(html) || html.length < 5000) {
    return { ok: false, status: res.status, reason: 'thin-or-invalid' };
  }
  return { ok: true, status: res.status, html };
}

async function writeExport(slug, html) {
  const dir = join(ROOT, 'source/wordpress-exports', slug);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'index-https.html'), html, 'utf8');
  await writeFile(
    join(dir, 'notes.md'),
    `# ${slug} export notes

| Field | Value |
|-------|-------|
| Live URL | ${ORIGIN}/${slug}/ |
| File | \`index-https.html\` |
| Source | Live fetch via import-missing-pages.mjs |
| Added | ${new Date().toISOString().slice(0, 10)} |
| Astro route | \`/${slug}/\` |

## Prepare

\`\`\`bash
npm run prepare:page -- ${slug} --download
\`\`\`
`,
    'utf8',
  );
}

async function writePage(slug) {
  const dest = join(ROOT, 'src/pages', `${slug}.astro`);
  if (existsSync(dest)) return false;
  await writeFile(
    dest,
    `---
/**
 * Phase 1: static mirror of WordPress page.
 * Live URL: ${ORIGIN}/${slug}/
 * Source: source/wordpress-exports/${slug}/index-https.html
 */
import { serveLegacyPage } from '../lib/legacy-page.js';

return serveLegacyPage('${slug}');
---
`,
    'utf8',
  );
  return true;
}

function runPrepare(slug) {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [join(ROOT, 'scripts/prepare-page.mjs'), slug, '--download'],
      { cwd: ROOT, stdio: 'inherit' },
    );
    child.on('exit', (code) => resolve(code ?? 1));
  });
}

async function main() {
  let slugs = args.length ? args : extractHomepageSlugs();
  for (const must of ['iberiaeor', 'pro-services', 'hr-services']) {
    if (!slugs.includes(must)) slugs.push(must);
  }
  slugs = [...new Set(slugs)].filter((s) => !SKIP.has(s));

  console.log(`Candidates: ${slugs.length}`);
  const toPrepare = [];

  for (const slug of slugs) {
    if (pageExists(slug) && cleanedExists(slug)) {
      console.log(`SKIP (already mirrored): ${slug}`);
      continue;
    }

    if (!exportExists(slug)) {
      console.log(`FETCH ${slug}…`);
      try {
        const result = await fetchLiveHtml(slug);
        if (!result.ok) {
          console.warn(`  skip ${slug}: status=${result.status} ${result.reason || ''}`);
          continue;
        }
        await writeExport(slug, result.html);
        console.log(`  saved export (${result.html.length} bytes)`);
      } catch (err) {
        console.warn(`  fetch failed ${slug}: ${err}`);
        continue;
      }
    }

    if (!exportExists(slug)) {
      console.warn(`SKIP (no export): ${slug}`);
      continue;
    }

    const created = await writePage(slug);
    console.log(created ? `  created page: ${slug}.astro` : `  page exists: ${slug}.astro`);
    toPrepare.push(slug);
  }

  console.log(`\nPreparing ${toPrepare.length} pages…`);
  let failed = 0;
  for (const slug of toPrepare) {
    console.log(`\n===== prepare ${slug} =====`);
    const code = await runPrepare(slug);
    if (code !== 0) {
      failed++;
      console.warn(`prepare failed for ${slug} (exit ${code})`);
    }
  }

  console.log(`\nDone. prepared=${toPrepare.length} failed=${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
