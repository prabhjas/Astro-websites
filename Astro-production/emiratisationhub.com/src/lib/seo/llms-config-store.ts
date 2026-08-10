import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export type LlmsPathOverride = {
  group?: string;
  title?: string;
  description?: string;
  exclude?: boolean;
};

export type LlmsConfig = {
  mode: 'auto' | 'override';
  siteTitle: string;
  summary: string;
  details: string;
  groupOrder: string[];
  postsCount: number;
  optionalMarkdown: string;
  blogNote: string;
  /** Path-keyed overrides (e.g. "/about-us/"). */
  entries: Record<string, LlmsPathOverride>;
  updatedAt: string;
  updatedBy: string;
};

export type LlmsDefaultsFile = {
  siteTitle: string;
  summary: string;
  details: string;
  groupOrder: string[];
  postsCount: number;
  blogNote: string;
  categoryMarkdown: string;
  entries: Record<string, { group: string; title: string; description: string }>;
};

function loadDefaults(): LlmsDefaultsFile {
  const path = join(process.cwd(), 'src/data/llms-defaults.json');
  return JSON.parse(readFileSync(path, 'utf8')) as LlmsDefaultsFile;
}

let cachedDefaults: LlmsDefaultsFile | null = null;

function defaults(): LlmsDefaultsFile {
  if (!cachedDefaults) cachedDefaults = loadDefaults();
  return cachedDefaults;
}

function configPath(rootDir: string): string {
  return join(rootDir, 'llms-config.json');
}

export function getLlmsSeedDefaults(): LlmsDefaultsFile {
  return defaults();
}

export function defaultLlmsConfig(): LlmsConfig {
  const d = defaults();
  return {
    mode: 'auto',
    siteTitle: d.siteTitle,
    summary: d.summary,
    details: d.details,
    groupOrder: [...d.groupOrder],
    postsCount: d.postsCount,
    optionalMarkdown: '',
    blogNote: d.blogNote,
    entries: {},
    updatedAt: '',
    updatedBy: '',
  };
}

function sanitizeConfig(raw: Partial<LlmsConfig> | null | undefined): LlmsConfig {
  const base = defaultLlmsConfig();
  if (!raw || typeof raw !== 'object') return base;
  const entries: Record<string, LlmsPathOverride> = {};
  for (const [key, value] of Object.entries(raw.entries || {})) {
    const path = key.startsWith('/') ? (key.endsWith('/') || key === '/' ? key : `${key}/`) : `/${key}/`;
    if (!value || typeof value !== 'object') continue;
    entries[path === '//' ? '/' : path] = {
      ...(value.group ? { group: String(value.group).trim() } : {}),
      ...(value.title ? { title: String(value.title).trim() } : {}),
      ...(value.description ? { description: String(value.description).trim() } : {}),
      ...(value.exclude ? { exclude: true } : {}),
    };
  }
  return {
    mode: raw.mode === 'override' ? 'override' : 'auto',
    siteTitle: String(raw.siteTitle || base.siteTitle).trim() || base.siteTitle,
    summary: String(raw.summary ?? base.summary),
    details: String(raw.details ?? base.details),
    groupOrder: Array.isArray(raw.groupOrder)
      ? raw.groupOrder.map((g) => String(g).trim()).filter(Boolean)
      : base.groupOrder,
    postsCount: Number.isFinite(Number(raw.postsCount))
      ? Math.max(0, Math.min(100, Math.trunc(Number(raw.postsCount))))
      : base.postsCount,
    optionalMarkdown: String(raw.optionalMarkdown || ''),
    blogNote: String(raw.blogNote ?? base.blogNote),
    entries,
    updatedAt: String(raw.updatedAt || ''),
    updatedBy: String(raw.updatedBy || ''),
  };
}

export async function readLlmsConfig(rootDir: string): Promise<LlmsConfig> {
  try {
    const raw = await readFile(configPath(rootDir), 'utf8');
    return sanitizeConfig(JSON.parse(raw) as Partial<LlmsConfig>);
  } catch {
    return defaultLlmsConfig();
  }
}

export function readLlmsConfigSync(rootDir: string): LlmsConfig {
  const path = configPath(rootDir);
  if (!existsSync(path)) return defaultLlmsConfig();
  try {
    return sanitizeConfig(JSON.parse(readFileSync(path, 'utf8')) as Partial<LlmsConfig>);
  } catch {
    return defaultLlmsConfig();
  }
}

export async function writeLlmsConfig(
  rootDir: string,
  value: Partial<LlmsConfig> & { updatedBy: string },
): Promise<LlmsConfig> {
  const current = await readLlmsConfig(rootDir);
  const next = sanitizeConfig({
    ...current,
    ...value,
    updatedAt: value.updatedAt || new Date().toISOString(),
    updatedBy: value.updatedBy,
  });
  const path = configPath(rootDir);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  return next;
}

/** Resolve display metadata for a path: dashboard override > seed defaults. */
export function resolveLlmsEntryMeta(
  path: string,
  config: LlmsConfig,
): { group: string; title?: string; description?: string; exclude: boolean } {
  const seed = defaults().entries[path];
  const override = config.entries[path];
  return {
    group: override?.group || seed?.group || (path.startsWith('/category/') ? 'Blog & Insights' : 'Other Pages'),
    title: override?.title || seed?.title,
    description: override?.description || seed?.description,
    exclude: Boolean(override?.exclude),
  };
}
