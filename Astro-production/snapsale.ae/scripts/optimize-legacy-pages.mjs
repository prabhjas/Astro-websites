#!/usr/bin/env node
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  optimizeLegacyPerformanceHtml,
  summarizeLegacyPerformanceHtml,
} from './lib/legacy-performance-optimizer.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const LEGACY_DIR = join(ROOT, 'src/legacy');
const PUBLIC_ROOT = join(ROOT, 'public');

function addSummary(total, summary, prefix) {
  for (const [key, value] of Object.entries(summary)) {
    total[`${prefix}${key}`] = (total[`${prefix}${key}`] || 0) + value;
  }
}

function slugFromFile(file) {
  return file.replace(/\.cleaned\.html$/i, '');
}

const files = (await readdir(LEGACY_DIR))
  .filter((file) => file.endsWith('.cleaned.html'))
  .sort((a, b) => a.localeCompare(b));

const totals = {};
let changed = 0;

for (const file of files) {
  const slug = slugFromFile(file);
  const filePath = join(LEGACY_DIR, file);
  const before = await readFile(filePath, 'utf8');
  const beforeSummary = summarizeLegacyPerformanceHtml(before);
  const after = optimizeLegacyPerformanceHtml(before, { slug, publicRoot: PUBLIC_ROOT });
  const afterSummary = summarizeLegacyPerformanceHtml(after);

  addSummary(totals, beforeSummary, 'before.');
  addSummary(totals, afterSummary, 'after.');

  if (after !== before) {
    await writeFile(filePath, after, 'utf8');
    changed += 1;
  }

  console.log(
    [
      file,
      `bytes ${beforeSummary.bytes}->${afterSummary.bytes}`,
      `rocket ${beforeSummary.rocketMarkers}->${afterSummary.rocketMarkers}`,
      `srcset ${beforeSummary.responsiveImages}->${afterSummary.responsiveImages}`,
      `noscript-img ${beforeSummary.noscriptImages}->${afterSummary.noscriptImages}`,
      `lazy-iframe ${beforeSummary.lazyEmbeds}->${afterSummary.lazyEmbeds}`,
      `preload-img ${beforeSummary.preloadImages}->${afterSummary.preloadImages}`,
      `priority ${beforeSummary.highPriorityImages}/${beforeSummary.lowPriorityImages}->${afterSummary.highPriorityImages}/${afterSummary.lowPriorityImages}`,
    ].join(' | '),
  );
}

console.log(
  JSON.stringify(
    {
      scanned: files.length,
      changed,
      before: {
        bytes: totals['before.bytes'] || 0,
        rocketMarkers: totals['before.rocketMarkers'] || 0,
        responsiveImages: totals['before.responsiveImages'] || 0,
        noscriptImages: totals['before.noscriptImages'] || 0,
        lazyEmbeds: totals['before.lazyEmbeds'] || 0,
        preloadImages: totals['before.preloadImages'] || 0,
        highPriorityImages: totals['before.highPriorityImages'] || 0,
        lowPriorityImages: totals['before.lowPriorityImages'] || 0,
        integrationMarkers: totals['before.integrationMarkers'] || 0,
      },
      after: {
        bytes: totals['after.bytes'] || 0,
        rocketMarkers: totals['after.rocketMarkers'] || 0,
        responsiveImages: totals['after.responsiveImages'] || 0,
        noscriptImages: totals['after.noscriptImages'] || 0,
        lazyEmbeds: totals['after.lazyEmbeds'] || 0,
        preloadImages: totals['after.preloadImages'] || 0,
        highPriorityImages: totals['after.highPriorityImages'] || 0,
        lowPriorityImages: totals['after.lowPriorityImages'] || 0,
        integrationMarkers: totals['after.integrationMarkers'] || 0,
      },
    },
    null,
    2,
  ),
);
