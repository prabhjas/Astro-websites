import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { SitemapChangeFreq } from './sitemap-config.ts';
import { normaliseCanonicalPath } from './sitemap-utils.ts';

export const SITEMAP_CHANGEFREQ_VALUES = [
  'always',
  'hourly',
  'daily',
  'weekly',
  'monthly',
  'yearly',
  'never',
] as const satisfies readonly SitemapChangeFreq[];

export type SitemapOverride = {
  priority?: number;
  changefreq?: SitemapChangeFreq;
};

export type SitemapOverridesFile = {
  updatedAt: string;
  updatedBy: string;
  entries: Record<string, SitemapOverride>;
};

function configPath(rootDir: string): string {
  return join(rootDir, 'sitemap-overrides.json');
}

function emptyFile(): SitemapOverridesFile {
  return { updatedAt: '', updatedBy: '', entries: {} };
}

function sanitizePriority(value: unknown): number | undefined {
  if (value === '' || value == null) return undefined;
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(n)) return undefined;
  const clamped = Math.min(1, Math.max(0, Math.round(n * 10) / 10));
  return clamped;
}

function sanitizeChangefreq(value: unknown): SitemapChangeFreq | undefined {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return undefined;
  return (SITEMAP_CHANGEFREQ_VALUES as readonly string[]).includes(raw)
    ? (raw as SitemapChangeFreq)
    : undefined;
}

export function normalizeOverridePath(input: string): string | null {
  return normaliseCanonicalPath(input);
}

export function sanitizeOverride(input: {
  priority?: unknown;
  changefreq?: unknown;
}): SitemapOverride | null {
  const priority = sanitizePriority(input.priority);
  const changefreq = sanitizeChangefreq(input.changefreq);
  if (priority == null && changefreq == null) return null;
  const out: SitemapOverride = {};
  if (priority != null) out.priority = priority;
  if (changefreq) out.changefreq = changefreq;
  return out;
}

function parseFile(raw: string): SitemapOverridesFile {
  const parsed = JSON.parse(raw) as SitemapOverridesFile;
  const entries: Record<string, SitemapOverride> = {};
  for (const [key, value] of Object.entries(parsed.entries || {})) {
    const path = normalizeOverridePath(key);
    if (!path) continue;
    const clean = sanitizeOverride(value || {});
    if (!clean) continue;
    entries[path] = clean;
  }
  return {
    updatedAt: parsed.updatedAt || '',
    updatedBy: parsed.updatedBy || '',
    entries,
  };
}

export async function readSitemapOverrides(rootDir: string): Promise<SitemapOverridesFile> {
  try {
    const raw = await readFile(configPath(rootDir), 'utf8');
    return parseFile(raw);
  } catch {
    return emptyFile();
  }
}

/** Sync read for sitemap collectors / request path. */
export function readSitemapOverridesSync(rootDir: string): SitemapOverridesFile {
  const path = configPath(rootDir);
  if (!existsSync(path)) return emptyFile();
  try {
    return parseFile(readFileSync(path, 'utf8'));
  } catch {
    return emptyFile();
  }
}

export async function writeSitemapOverrides(
  rootDir: string,
  value: {
    entries: Record<string, SitemapOverride>;
    updatedBy: string;
    updatedAt?: string;
  },
): Promise<SitemapOverridesFile> {
  const entries: Record<string, SitemapOverride> = {};
  for (const [key, override] of Object.entries(value.entries)) {
    const path = normalizeOverridePath(key);
    if (!path) continue;
    const clean = sanitizeOverride(override);
    if (!clean) continue;
    entries[path] = clean;
  }

  const next: SitemapOverridesFile = {
    updatedAt: value.updatedAt || new Date().toISOString(),
    updatedBy: value.updatedBy,
    entries,
  };
  const path = configPath(rootDir);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  return next;
}

export async function upsertSitemapOverride(
  rootDir: string,
  pathInput: string,
  override: { priority?: unknown; changefreq?: unknown },
  updatedBy: string,
): Promise<SitemapOverridesFile> {
  const path = normalizeOverridePath(pathInput);
  if (!path) throw new Error('Invalid sitemap path');
  const clean = sanitizeOverride(override);
  if (!clean) throw new Error('Provide a priority (0–1) and/or changefreq');

  const current = await readSitemapOverrides(rootDir);
  return writeSitemapOverrides(rootDir, {
    updatedBy,
    entries: { ...current.entries, [path]: clean },
  });
}

export async function deleteSitemapOverride(
  rootDir: string,
  pathInput: string,
  updatedBy: string,
): Promise<SitemapOverridesFile> {
  const path = normalizeOverridePath(pathInput);
  if (!path) throw new Error('Invalid sitemap path');
  const current = await readSitemapOverrides(rootDir);
  const rest = { ...current.entries };
  delete rest[path];
  return writeSitemapOverrides(rootDir, {
    updatedBy,
    entries: rest,
  });
}

export function pathFromSitemapUrl(url: string, siteOrigin: string): string | null {
  try {
    const pathname = new URL(url).pathname;
    return normalizeOverridePath(pathname);
  } catch {
    return normalizeOverridePath(url.replace(siteOrigin.replace(/\/$/, ''), '') || '/');
  }
}
