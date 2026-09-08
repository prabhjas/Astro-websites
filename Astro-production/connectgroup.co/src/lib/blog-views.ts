/**
 * Persist blog post view counts for Insights "Featured" (most visited).
 * Runtime store: .data/blog-views.json (gitignored).
 * Optional seed: src/data/blog-views-seed.json (checked in).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const DATA_DIR = join(ROOT, '.data');
const STORE_PATH = join(DATA_DIR, 'blog-views.json');
const SEED_PATH = join(ROOT, 'src/data', 'blog-views-seed.json');

export type BlogViewMap = Record<string, number>;

function readJson(path: string): BlogViewMap {
  if (!existsSync(path)) return {};
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as unknown;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const out: BlogViewMap = {};
    for (const [slug, n] of Object.entries(raw as Record<string, unknown>)) {
      const v = typeof n === 'number' ? n : Number(n);
      if (slug && Number.isFinite(v) && v > 0) out[slug] = Math.floor(v);
    }
    return out;
  } catch {
    return {};
  }
}

function ensureStore(): BlogViewMap {
  if (existsSync(STORE_PATH)) return readJson(STORE_PATH);
  const seed = readJson(SEED_PATH);
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(STORE_PATH, `${JSON.stringify(seed, null, 2)}\n`, 'utf8');
  return { ...seed };
}

export function getViewCounts(): BlogViewMap {
  return ensureStore();
}

export function getViewCount(slug: string): number {
  return getViewCounts()[slug] || 0;
}

/** Increment once; returns new count. Unknown/empty slug → 0. */
export function incrementView(slug: string): number {
  const key = String(slug || '')
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .split('/')[0];
  if (!key || !/^[a-z0-9-]+$/i.test(key)) return 0;

  const counts = ensureStore();
  counts[key] = (counts[key] || 0) + 1;
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(STORE_PATH, `${JSON.stringify(counts, null, 2)}\n`, 'utf8');
  return counts[key];
}

/** Slugs sorted by views desc (then stable by slug). */
export function getTopViewedSlugs(limit = 4): string[] {
  const counts = getViewCounts();
  return Object.entries(counts)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, Math.max(0, limit))
    .map(([slug]) => slug);
}
