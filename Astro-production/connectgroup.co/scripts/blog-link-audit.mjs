#!/usr/bin/env node
/**
 * Generate link audit report from migrated blog JSON files.
 * Usage: node scripts/blog-link-audit.mjs
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BLOG_DIR = join(ROOT, 'src/content/blog');
const OUT = join(ROOT, 'docs/blog-migration-link-audit.md');

const files = readdirSync(BLOG_DIR).filter((f) => f.endsWith('.json'));
const lines = [
  '# Blog migration link audit',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  `Migrated posts: ${files.length}`,
  '',
];

for (const file of files) {
  const post = JSON.parse(readFileSync(join(BLOG_DIR, file), 'utf8'));
  lines.push(`## ${post.slug}`);
  lines.push('');
  lines.push(`- Source: ${post.sourceUrl}`);
  lines.push(`- Canonical: ${post.canonical}`);
  lines.push(`- TOC entries: ${post.toc?.length ?? 0}`);
  lines.push(`- Images: ${post.images?.length ?? 0}`);
  if (post.imageMigration?.failed?.length) {
    lines.push(`- Image failures: ${post.imageMigration.failed.length}`);
    for (const f of post.imageMigration.failed) {
      lines.push(`  - ${f.remote}: ${f.error}`);
    }
  }
  lines.push('');

  const audit = post.linkAudit || {};
  const sections = [
    ['Unresolved internal links', audit.unresolved],
    ['WordPress-specific links', audit.wordpressSpecific],
    ['External links', audit.external],
    ['Broken internal links', audit.brokenInternal],
  ];

  for (const [title, items] of sections) {
    if (!items?.length) continue;
    lines.push(`### ${title}`);
    lines.push('');
    for (const item of items) {
      lines.push(`- \`${item.href}\` — ${item.text || '(no text)'}`);
    }
    lines.push('');
  }
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, lines.join('\n'), 'utf8');
console.log('Wrote', OUT);
