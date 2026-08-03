#!/usr/bin/env node
/**
 * Bulk migrate all blog posts from WordPress sitemaps.
 * Skips already-migrated JSON files and the 3 approved test posts (unless --force).
 *
 * Usage:
 *   node scripts/migrate-blog-all.mjs [--download] [--force] [--concurrency=4]
 *   node scripts/migrate-blog-all.mjs --backfill-author   # update author slugs on existing posts
 */
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { migratePost, parseAllSitemaps, ORIGIN, BLOG_DIR } from './migrate-blog-post.mjs';

const APPROVED_TEST = new Set([
  'hr-audit-uae-checklist',
  'peo-vs-eor-what-is-the-difference',
  'what-is-an-employer-of-record-eor',
]);

const args = process.argv.slice(2);
const shouldDownload = args.includes('--download');
const force = args.includes('--force');
const backfillAuthor = args.includes('--backfill-author');
const concurrencyArg = args.find((a) => a.startsWith('--concurrency='));
const CONCURRENCY = concurrencyArg ? parseInt(concurrencyArg.split('=')[1], 10) : 4;

function existingSlugs() {
  if (!existsSync(BLOG_DIR)) return new Set();
  return new Set(
    readdirSync(BLOG_DIR)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace(/\.json$/, '')),
  );
}

async function runPool(items, worker, limit) {
  const results = [];
  let index = 0;

  async function next() {
    while (index < items.length) {
      const i = index++;
      try {
        results[i] = { ok: true, value: await worker(items[i]) };
      } catch (err) {
        results[i] = { ok: false, error: err };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => next()));
  return results;
}

async function main() {
  const urls = await parseAllSitemaps();
  const existing = existingSlugs();

  if (backfillAuthor) {
    const toUpdate = [...APPROVED_TEST].filter((s) => existing.has(s));
    console.log(`Backfilling author slugs for ${toUpdate.length} approved test posts...`);
    for (const slug of toUpdate) {
      const url = `${ORIGIN}/${slug}/`;
      await migratePost(url, { download: false, quiet: false });
    }
    return;
  }

  const toMigrate = urls.filter((url) => {
    const slug = new URL(url).pathname.replace(/^\/|\/$/g, '');
    if (!force && existing.has(slug)) return false;
    if (!force && APPROVED_TEST.has(slug)) return false;
    return true;
  });

  console.log(`Sitemap posts: ${urls.length}`);
  console.log(`Already migrated: ${existing.size}`);
  console.log(`To migrate: ${toMigrate.length}`);
  console.log(`Download images: ${shouldDownload}`);
  console.log(`Concurrency: ${CONCURRENCY}`);

  const failures = [];
  let success = 0;

  const results = await runPool(
    toMigrate,
    async (url) => {
      const slug = new URL(url).pathname.replace(/^\/|\/$/g, '');
      try {
        await migratePost(url, { download: shouldDownload, quiet: true });
        success++;
        if (success % 10 === 0) console.log(`  Progress: ${success}/${toMigrate.length}`);
        return slug;
      } catch (err) {
        failures.push({ slug, url, error: String(err) });
        console.error(`  FAILED ${slug}: ${err.message || err}`);
        throw err;
      }
    },
    CONCURRENCY,
  );

  const failed = results.filter((r) => r && !r.ok);
  console.log(`\nDone. Success: ${success}, Failed: ${failed.length}`);

  if (failures.length) {
    const logPath = join(BLOG_DIR, '..', '..', 'docs', 'blog-migration-failures.json');
    const { writeFile, mkdir } = await import('node:fs/promises');
    await mkdir(join(BLOG_DIR, '..', '..', 'docs'), { recursive: true });
    await writeFile(logPath, JSON.stringify(failures, null, 2), 'utf8');
    console.log(`Failure log: ${logPath}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
