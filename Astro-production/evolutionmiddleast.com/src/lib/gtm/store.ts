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
    headScript: value.headScript.trim(),
    bodyHtml: value.bodyHtml.trim(),
    footerScript: String((value as { footerScript?: string }).footerScript || '').trim(),
    updatedBy: value.updatedBy,
    updatedAt: value.updatedAt || new Date().toISOString(),
  };
  const path = configPath(rootDir);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  return next;
}
