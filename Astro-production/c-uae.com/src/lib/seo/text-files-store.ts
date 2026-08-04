import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { ROBOTS_DISALLOW_PATHS } from './sitemap-config.ts';
import { renderRobotsTxt } from './sitemap-xml.ts';

export type ManagedTextFile = {
  content: string;
  updatedAt: string;
  updatedBy: string;
};

export type ManagedTextKind = 'robots' | 'llm';

function filePath(rootDir: string, kind: ManagedTextKind): string {
  return join(rootDir, kind === 'robots' ? 'robots.json' : 'llm.json');
}

export function defaultRobotsContent(siteOrigin: string): string {
  return renderRobotsTxt(siteOrigin.replace(/\/$/, ''), ROBOTS_DISALLOW_PATHS);
}

export function defaultLlmContent(): string {
  return [
    '# Connect UAE LLM guidance',
    '# Edit this file from the internal SEO dashboard.',
    '# Describe the site, preferred citations, and any crawl constraints for AI systems.',
    '',
    'Site: https://c-uae.com',
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
