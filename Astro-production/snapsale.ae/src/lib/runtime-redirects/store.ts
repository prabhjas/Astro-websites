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
    const parsed = parse(readFileSync(yamlPath, 'utf8')) ?? {};
    const list = Array.isArray(parsed.redirects) ? parsed.redirects : [];
    return list
      .filter((row: { from?: unknown; to?: unknown }) => Boolean(row?.from && row?.to))
      .map((row: { from?: unknown; to?: unknown; status?: unknown }) => ({
        from: String(row.from),
        to: String(row.to),
        status: Number(row.status || 301),
        source: 'repo' as const,
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

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).replace(/""/g, '"');
  }
  return trimmed;
}

function parseCsvRows(content: string): Record<string, string>[] {
  const lines = content
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const parseLine = (line: string): string[] => {
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
        cells.push(stripQuotes(current));
        current = '';
        continue;
      }
      current += ch;
    }
    cells.push(stripQuotes(current));
    return cells;
  };

  const headers = parseLine(lines[0]).map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = parseLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = cells[index] ?? '';
    });
    return row;
  });
}

function actionDataUrl(entry: Record<string, unknown>): string {
  const actionData = entry.action_data;
  if (actionData && typeof actionData === 'object') {
    return String((actionData as Record<string, unknown>).url || '').trim();
  }
  return '';
}

function mapImportRow(entry: Record<string, unknown>): RuntimeRedirectRule | null {
  const enabled = entry.enabled;
  const rowStatus = String(entry.status || '').toLowerCase();
  if (enabled === false || rowStatus === 'inactive' || rowStatus === 'disabled') {
    return null;
  }

  const from = String(
    entry.from ||
      entry.source ||
      entry.url_from ||
      entry.url ||
      entry.match_url ||
      entry.regex_url ||
      '',
  ).trim();
  const to = String(
    entry.to ||
      entry.target ||
      entry.destination ||
      entry.url_to ||
      actionDataUrl(entry) ||
      '',
  ).trim();
  const status = Number(
    entry.action_code || entry.code || entry.header_code || entry.statusCode || entry.status || 301,
  );
  if (!from || !to || !Number.isFinite(status)) return null;
  // Rank Math / CSV sometimes reuse "status" for active/inactive — ignore non-HTTP codes
  const httpStatus = status === 301 || status === 302 || status === 307 || status === 308 ? status : 301;

  return {
    from: normalisePath(from.replace(/^https?:\/\/[^/]+/i, '')),
    to,
    status: httpStatus,
    source: 'rank-math-import',
    importedAt: new Date().toISOString(),
  } satisfies RuntimeRedirectRule;
}

/** Accept Rank Math JSON exports and CSV exports (source,target,code,...). */
export function parseRankMathRedirectImport(content: string): RuntimeRedirectRule[] {
  const trimmed = content.trim().replace(/^\uFEFF/, '');
  if (!trimmed) return [];

  const looksCsv =
    /^source\s*,\s*target/i.test(trimmed) ||
    /^from\s*,\s*to/i.test(trimmed) ||
    (!trimmed.startsWith('{') && !trimmed.startsWith('[') && trimmed.includes(','));

  if (looksCsv) {
    return parseCsvRows(trimmed)
      .map((row) => mapImportRow(row as Record<string, unknown>))
      .filter((row): row is RuntimeRedirectRule => Boolean(row));
  }

  const parsed = JSON.parse(trimmed) as Record<string, unknown>;
  const candidates = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed.redirects)
      ? parsed.redirects
      : Array.isArray(parsed.redirections)
        ? parsed.redirections
        : Array.isArray(parsed.items)
          ? parsed.items
          : [];

  return candidates
    .map((row) => mapImportRow(row as Record<string, unknown>))
    .filter((row): row is RuntimeRedirectRule => Boolean(row));
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
