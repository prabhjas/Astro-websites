import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export type GlobalGtmConfig = {
  headScript: string;
  bodyHtml: string;
  footerScript: string;
  updatedAt: string;
  updatedBy: string;
};

function configPath(rootDir: string): string {
  return join(rootDir, 'gtm.json');
}

/** Strip WP Rocket / lazy-load wrappers so snippets run on Astro. */
export function sanitiseGtmSnippet(html: string): string {
  if (!html) return '';
  return html
    .replace(/\stype\s*=\s*["']rocketlazyloadscript["']/gi, '')
    .replace(/\stype\s*=\s*["']text\/rocketlazyloadscript["']/gi, '')
    .replace(/\sdata-rocket-[a-z0-9_-]+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\sdata-wpr-[a-z0-9_-]+\s*=\s*["'][^"']*["']/gi, '')
    .trim();
}

export async function readGlobalGtmConfig(rootDir: string): Promise<GlobalGtmConfig | null> {
  try {
    const raw = await readFile(configPath(rootDir), 'utf8');
    return JSON.parse(raw) as GlobalGtmConfig;
  } catch {
    return null;
  }
}

export async function writeGlobalGtmConfig(
  rootDir: string,
  value: Omit<GlobalGtmConfig, 'updatedAt'> & { updatedAt?: string },
): Promise<GlobalGtmConfig> {
  const next: GlobalGtmConfig = {
    headScript: sanitiseGtmSnippet(value.headScript),
    bodyHtml: sanitiseGtmSnippet(value.bodyHtml),
    footerScript: sanitiseGtmSnippet(String((value as { footerScript?: string }).footerScript || '')),
    updatedBy: value.updatedBy,
    updatedAt: value.updatedAt || new Date().toISOString(),
  };
  const path = configPath(rootDir);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  return next;
}
