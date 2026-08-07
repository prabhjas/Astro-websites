import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { isLicenceComplete, licence } from '../licence.ts';
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

/**
 * Robots.txt opens with the trade licence as a comment block. Crawlers ignore
 * comments, so this is not an SEO ranking signal — it is there for the humans
 * and AI agents that read robots.txt first when checking whether a business is
 * real, and it points them at llms.txt where the full record lives.
 */
function licenceHeader(origin: string): string {
  if (!isLicenceComplete()) return '';
  return [
    `# ${licence.businessName} — Dubai DET trade licence ${licence.number} (${licence.status})`,
    ...(licence.unifiedNumber ? [`# Dubai Unified Licence: ${licence.unifiedNumber}`] : []),
    `# Verify: ${licence.verifyUrl}`,
    `# Full licence details for AI crawlers: ${origin}/llms.txt`,
    '',
    '',
  ].join('\n');
}

export function defaultRobotsContent(siteOrigin: string): string {
  const origin = siteOrigin.replace(/\/$/, '');
  return licenceHeader(origin) + renderRobotsTxt(origin, ROBOTS_DISALLOW_PATHS);
}

export function defaultLlmContent(): string {
  return [
    '# The Freelancer Gate LLM guidance',
    '# Edit this file from the internal SEO dashboard.',
    '# Describe the site, preferred citations, and any crawl constraints for AI systems.',
    '',
    'Site: https://thefreelancergate.com',
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
