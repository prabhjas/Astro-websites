import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { ROBOTS_DISALLOW_PATHS } from './sitemap-config.ts';

export type ManagedTextFile = {
  content: string;
  updatedAt: string;
  updatedBy: string;
};

export type ManagedTextKind = 'robots' | 'llm';

const LIVE_ROBOTS_PATH = join(process.cwd(), 'src/data/robots-live-default.txt');

function filePath(rootDir: string, kind: ManagedTextKind): string {
  return join(rootDir, kind === 'robots' ? 'robots.json' : 'llm.json');
}

export function defaultRobotsContent(siteOrigin: string): string {
  const origin = siteOrigin.replace(/\/$/, '');
  // Prefer Rank Math–style export mirrored from live when present.
  if (existsSync(LIVE_ROBOTS_PATH)) {
    return readFileSync(LIVE_ROBOTS_PATH, 'utf8')
      .replace(/https?:\/\/[^/\s]+/g, origin)
      .replace(/\r\n/g, '\n');
  }
  const disallow = ROBOTS_DISALLOW_PATHS.map((p) => `Disallow: ${p}`);
  return [
    '# KPM Pro robots.txt (fleet default; FLOW can override)',
    '',
    `Sitemap: ${origin}/sitemap_index.xml`,
    '',
    'User-agent: *',
    ...disallow,
    'Allow: /wp-admin/admin-ajax.php',
    '',
    'User-agent: Googlebot',
    'Allow: /',
    '',
    'User-agent: Bingbot',
    'Allow: /',
    'Crawl-delay: 10',
    '',
  ].join('\n');
}

export function defaultLlmContent(): string {
  return [
    '# KPM Pro LLM guidance',
    '# Edit this file from the internal SEO dashboard.',
    '# Describe the site, preferred citations, and any crawl constraints for AI systems.',
    '',
    'Site: https://kpmpro.ae',
    '',
  ].join('\n');
}

export async function readManagedTextFile(
  rootDir: string,
  kind: ManagedTextKind,
): Promise<ManagedTextFile | null> {
  try {
    const raw = await readFile(filePath(rootDir, kind), 'utf8');
    const parsed = JSON.parse(raw) as ManagedTextFile;
    if (typeof parsed?.content !== 'string') return null;
    return {
      content: parsed.content,
      updatedAt: parsed.updatedAt || '',
      updatedBy: parsed.updatedBy || '',
    };
  } catch {
    return null;
  }
}

export async function writeManagedTextFile(
  rootDir: string,
  kind: ManagedTextKind,
  value: { content: string; updatedBy: string; updatedAt?: string },
): Promise<ManagedTextFile> {
  const next: ManagedTextFile = {
    content: value.content.replace(/\r\n/g, '\n'),
    updatedBy: value.updatedBy,
    updatedAt: value.updatedAt || new Date().toISOString(),
  };
  const path = filePath(rootDir, kind);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  return next;
}

export async function resolveManagedTextContent(
  rootDir: string,
  kind: ManagedTextKind,
  fallback: string,
): Promise<string> {
  const stored = await readManagedTextFile(rootDir, kind);
  if (stored && stored.content.trim()) return stored.content;
  return fallback;
}
