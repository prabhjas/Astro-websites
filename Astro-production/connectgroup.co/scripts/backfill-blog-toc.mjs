#!/usr/bin/env node
/**
 * Rebuild TOC/headings for all migrated blog posts, skipping image-only headings.
 *
 * Usage: node scripts/backfill-blog-toc.mjs
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BLOG_DIR = join(ROOT, 'src/content/blog');

function slugifyHeading(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function extractHeadingText($el) {
  const $clone = $el.clone();
  $clone.find('script, style, noscript, img, svg, picture, video, iframe, source').remove();
  const text = $clone.text().replace(/\s+/g, ' ').trim();
  if (!text || /<[a-z][\s\S]*>/i.test(text)) return '';
  return text;
}

function processContentHeadings(html) {
  const $ = cheerio.load(`<div id="root">${html}</div>`, { decodeEntities: false }, false);
  const toc = [];
  const headings = [];
  const usedIds = new Set();

  $('#root').find('h2, h3').each((_, el) => {
    const $el = $(el);
    const tag = (el.tagName || 'h2').toLowerCase();
    const level = tag === 'h3' ? 3 : 2;
    const text = extractHeadingText($el);
    if (!text) return;

    let id = $el.attr('id') || '';
    if (!id || id.startsWith('img-') || id.length > 120) {
      id = slugifyHeading(text);
    }
    const baseId = id || slugifyHeading(text);
    let n = 2;
    while (!id || usedIds.has(id)) {
      id = n === 2 && !usedIds.has(baseId) ? baseId : `${slugifyHeading(text)}-${n}`;
      n += 1;
    }
    usedIds.add(id);
    $el.attr('id', id);

    toc.push({ id, text, level });
    headings.push({ level: tag, text, id });
  });

  return { html: $('#root').html() || '', toc, headings };
}

let updated = 0;
let removed = 0;

for (const name of readdirSync(BLOG_DIR).filter((f) => f.endsWith('.json'))) {
  const path = join(BLOG_DIR, name);
  const post = JSON.parse(readFileSync(path, 'utf8'));
  if (!post.contentHtml) continue;

  const before = post.toc?.length || 0;
  const processed = processContentHeadings(post.contentHtml);
  const after = processed.toc.length;
  const dropped = before - after;

  post.contentHtml = processed.html;
  post.toc = processed.toc;
  post.headings = processed.headings;

  writeFileSync(path, `${JSON.stringify(post, null, 2)}\n`);
  updated += 1;
  if (dropped > 0) removed += dropped;
}

console.log(`Updated ${updated} posts. Removed ${removed} image/markup TOC entries.`);
