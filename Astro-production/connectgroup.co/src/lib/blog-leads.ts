/**
 * Rank Insights Featured by contact leads per blog URL.
 * Live counts come from the lead store; optional seed provides a baseline until real submits exist.
 * A lead counts when it was submitted (or landed) on a published blog slug.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getServerEnv } from '../env/server';
import { getAllBlogSlugs } from './blog.ts';
import { FileLeadStore } from './leads/file-store';

export type BlogLeadMap = Record<string, number>;

const ROOT = process.cwd();
const SEED_PATH = join(ROOT, 'src/data', 'blog-leads-seed.json');

function readSeed(): BlogLeadMap {
  if (!existsSync(SEED_PATH)) return {};
  try {
    const raw = JSON.parse(readFileSync(SEED_PATH, 'utf8')) as unknown;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const out: BlogLeadMap = {};
    for (const [slug, n] of Object.entries(raw as Record<string, unknown>)) {
      const v = typeof n === 'number' ? n : Number(n);
      if (slug && Number.isFinite(v) && v > 0) out[slug] = Math.floor(v);
    }
    return out;
  } catch {
    return {};
  }
}

/** First path segment of a site URL, or null if it is not a single-segment page. */
export function blogSlugFromPageUrl(raw: string): string | null {
  const value = String(raw || '').trim();
  if (!value) return null;
  try {
    const url = new URL(value, 'https://connectgroup.co');
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length !== 1) return null;
    const slug = parts[0].toLowerCase();
    if (!/^[a-z0-9-]+$/i.test(slug)) return null;
    return slug;
  } catch {
    return null;
  }
}

function urlsForLead(record: {
  submissionPageUrl?: string;
  landingPageUrl?: string;
  payload?: { pageUrl?: string };
}): string[] {
  return [record.submissionPageUrl, record.payload?.pageUrl, record.landingPageUrl].filter(
    (u): u is string => Boolean(u && String(u).trim()),
  );
}

async function getLiveBlogLeadCounts(published: Set<string>): Promise<BlogLeadMap> {
  const counts: BlogLeadMap = {};
  try {
    const env = getServerEnv();
    const store = new FileLeadStore({
      rootDir: env.leadStoreDir,
      maxFileBytes: env.leadStoreMaxFileBytes,
    });
    const records = await store.listSubmissions();
    for (const rec of records) {
      if (rec.submissionStatus === 'spam' || rec.submissionStatus === 'rejected') continue;
      let slug: string | null = null;
      for (const url of urlsForLead(rec)) {
        const candidate = blogSlugFromPageUrl(url);
        if (candidate && published.has(candidate)) {
          slug = candidate;
          break;
        }
      }
      if (!slug) continue;
      counts[slug] = (counts[slug] || 0) + 1;
    }
  } catch {
    return {};
  }
  return counts;
}

/** Seed baseline + live form submits for each published blog slug. */
export async function getBlogLeadCounts(): Promise<BlogLeadMap> {
  const published = new Set(getAllBlogSlugs());
  const seed = readSeed();
  const live = await getLiveBlogLeadCounts(published);
  const counts: BlogLeadMap = {};

  for (const slug of published) {
    const total = (seed[slug] || 0) + (live[slug] || 0);
    if (total > 0) counts[slug] = total;
  }
  return counts;
}

export async function getTopLeadSlugs(limit = 4): Promise<string[]> {
  const counts = await getBlogLeadCounts();
  return Object.entries(counts)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, Math.max(0, limit))
    .map(([slug]) => slug);
}
