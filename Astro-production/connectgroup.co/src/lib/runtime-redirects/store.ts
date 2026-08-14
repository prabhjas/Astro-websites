import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { parse, stringify } from 'yaml';

export type RuntimeRedirectRule = {
  from: string;
  to: string;
  status: number;
  source?: string;
  importedAt?: string;
};

export type RedirectStatRecord = {
  from: string;
  hits: number;
  lastAccessAt?: string;
};

type RedirectYamlRow = {
  from?: unknown;
  to?: unknown;
  status?: unknown;
};

function runtimePath(rootDir: string): string {
  return join(rootDir, 'redirects.json');
}

function statsPath(rootDir: string): string {
  return join(rootDir, 'redirect-stats.json');
}

export async function readRuntimeRedirects(rootDir: string): Promise<RuntimeRedirectRule[]> {
  try {
    const raw = await readFile(runtimePath(rootDir), 'utf8');
    const parsed = JSON.parse(raw) as RuntimeRedirectRule[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function writeRuntimeRedirects(rootDir: string, redirects: RuntimeRedirectRule[]): Promise<void> {
  const path = runtimePath(rootDir);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(redirects, null, 2)}\n`, 'utf8');
}

export async function readRedirectStats(rootDir: string): Promise<Record<string, RedirectStatRecord>> {
  try {
    const raw = await readFile(statsPath(rootDir), 'utf8');
    const parsed = JSON.parse(raw) as Record<string, RedirectStatRecord>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export async function writeRedirectStats(rootDir: string, stats: Record<string, RedirectStatRecord>): Promise<void> {
  const path = statsPath(rootDir);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(stats, null, 2)}\n`, 'utf8');
}

export async function recordRedirectHit(rootDir: string, from: string): Promise<void> {
  const stats = await readRedirectStats(rootDir);
  const existing = stats[from] || { from, hits: 0 };
  stats[from] = {
    from,
    hits: existing.hits + 1,
    lastAccessAt: new Date().toISOString(),
  };
  await writeRedirectStats(rootDir, stats);
}

export async function readManagedRedirects(rootDir: string, projectRoot: string): Promise<RuntimeRedirectRule[]> {
  const merged = [...readCanonicalRedirectsYaml(projectRoot), ...(await readRuntimeRedirects(rootDir))];
  return Array.from(new Map(merged.map((rule) => [rule.from, rule])).values()).sort((a, b) =>
    a.from.localeCompare(b.from),
  );
}

export async function persistManagedRedirects(
  rootDir: string,
  projectRoot: string,
  redirects: RuntimeRedirectRule[],
): Promise<void> {
  const deduped = Array.from(new Map(redirects.map((rule) => [rule.from, rule])).values()).sort((a, b) =>
    a.from.localeCompare(b.from),
  );
  await writeRuntimeRedirects(rootDir, deduped);
  await syncRuntimeRedirectsToYaml(projectRoot, deduped);
}

export function readCanonicalRedirectsYaml(projectRoot: string): RuntimeRedirectRule[] {
  try {
    const yamlPath = join(projectRoot, 'src/data/redirects.yml');
    const parsed = (parse(readFileSync(yamlPath, 'utf8')) ?? {}) as { redirects?: RedirectYamlRow[] };
    const list: RedirectYamlRow[] = Array.isArray(parsed.redirects) ? parsed.redirects : [];
    return list
      .filter((row): row is RedirectYamlRow & { from: unknown; to: unknown } => Boolean(row?.from && row?.to))
      .map((row) => ({
        from: String(row.from),
        to: String(row.to),
        status: Number(row.status || 301),
        source: 'repo',
      }));
  } catch {
    return [];
  }
}

export async function syncRuntimeRedirectsToYaml(projectRoot: string, redirects: RuntimeRedirectRule[]): Promise<void> {
  const yamlPath = join(projectRoot, 'src/data/redirects.yml');
  const payload = {
    redirects: redirects.map((row) => ({
      from: row.from,
      to: row.to,
      status: row.status || 301,
    })),
  };
  await writeFile(yamlPath, stringify(payload), 'utf8');
}

function normalisePath(path: string): string {
  if (!path) return '/';
  const withSlash = path.startsWith('/') ? path : `/${path}`;
  return withSlash.endsWith('/') ? withSlash : `${withSlash}/`;
}

function pickString(...values: unknown[]): string {
  for (const value of values) {
    if (value == null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
}

function actionDataUrl(entry: Record<string, unknown>): string {
  const actionData = entry.action_data;
  if (actionData && typeof actionData === 'object') {
    return pickString((actionData as Record<string, unknown>).url);
  }
  return '';
}

function parseRankMathJsonRows(content: string): RuntimeRedirectRule[] {
  const parsed = JSON.parse(content) as Record<string, unknown> | unknown[];
  const candidates: unknown[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed.redirects)
      ? parsed.redirects
      : Array.isArray(parsed.redirections)
        ? parsed.redirections
        : Array.isArray(parsed.items)
          ? parsed.items
          : [];

  return candidates
    .map((row): RuntimeRedirectRule | null => {
      const entry = row as Record<string, unknown>;
      // Rank Math: `url` / `sources` are match sources; destination is `action_data.url`.
      // Never treat bare `url` as destination.
      const from = pickString(
        entry.from,
        entry.source,
        entry.url_from,
        entry.match_url,
        entry.regex_url,
        entry.url,
        Array.isArray(entry.sources) ? entry.sources[0] : '',
      );
      const to = pickString(
        entry.to,
        entry.destination,
        entry.url_to,
        entry.target,
        actionDataUrl(entry),
      );
      const status = Number(entry.status || entry.header_code || entry.statusCode || entry.code || 301);
      if (!from || !to) return null;
      return {
        from: normalisePath(from.replace(/^https?:\/\/[^/]+/i, '')),
        to,
        status: Number.isFinite(status) ? status : 301,
        source: 'rank-math-import',
        importedAt: new Date().toISOString(),
      } satisfies RuntimeRedirectRule;
    })
    .filter((row): row is RuntimeRedirectRule => Boolean(row));
}

function parseCsvRedirectRows(content: string): RuntimeRedirectRule[] {
  const lines = content
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const split = (line: string): string[] => {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }
      if (ch === ',' && !inQuotes) {
        cells.push(current.trim());
        current = '';
        continue;
      }
      current += ch;
    }
    cells.push(current.trim());
    return cells;
  };

  const header = split(lines[0]).map((cell) => cell.toLowerCase());
  const hasHeader = header.some((cell) =>
    ['from', 'source', 'to', 'target', 'destination', 'status', 'code', 'header_code'].includes(cell),
  );
  const rows = hasHeader ? lines.slice(1) : lines;
  const indexOf = (...names: string[]) => header.findIndex((cell) => names.includes(cell));

  const fromIdx = hasHeader ? indexOf('from', 'source', 'url_from', 'match_url') : 0;
  const toIdx = hasHeader ? indexOf('to', 'target', 'destination', 'url_to') : 1;
  const statusIdx = hasHeader ? indexOf('status', 'code', 'header_code', 'statuscode') : 2;

  return rows
    .map((line): RuntimeRedirectRule | null => {
      const cells = split(line);
      const from = pickString(cells[fromIdx]);
      const to = pickString(cells[toIdx]);
      const status = Number(pickString(cells[statusIdx]) || 301);
      if (!from || !to) return null;
      return {
        from: normalisePath(from.replace(/^https?:\/\/[^/]+/i, '')),
        to,
        status: Number.isFinite(status) ? status : 301,
        source: 'csv-import',
        importedAt: new Date().toISOString(),
      } satisfies RuntimeRedirectRule;
    })
    .filter((row): row is RuntimeRedirectRule => Boolean(row));
}

export function parseRankMathRedirectImport(content: string): RuntimeRedirectRule[] {
  const trimmed = content.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return parseRankMathJsonRows(trimmed);
  }
  return parseCsvRedirectRows(trimmed);
}

export function normaliseRedirectRule(input: Pick<RuntimeRedirectRule, 'from' | 'to'> & Partial<RuntimeRedirectRule>): RuntimeRedirectRule {
  return {
    from: normalisePath(String(input.from || '').trim().replace(/^https?:\/\/[^/]+/i, '')),
    to: String(input.to || '').trim(),
    status: Number(input.status || 301),
    source: input.source || 'dashboard',
    importedAt: input.importedAt || new Date().toISOString(),
  };
}

/** Best-effort regenerate public/_redirects; never fail the dashboard mutation. */
export async function regenerateRedirectArtifacts(projectRoot: string): Promise<void> {
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const execFileAsync = promisify(execFile);
  try {
    await execFileAsync('node', ['scripts/generate-redirects.mjs'], { cwd: projectRoot });
  } catch (error) {
    console.error('[redirects] generate-redirects.mjs failed (runtime redirects still saved):', error);
  }
}
