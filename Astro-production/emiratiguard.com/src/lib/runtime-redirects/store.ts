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
      .filter((row) => row?.from && row?.to)
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
  if (!path) return "/";
  try {
    if (/^https?:\/\//i.test(path)) {
      path = new URL(path).pathname || "/";
    }
  } catch {
    /* keep as-is */
  }
  const withSlash = path.startsWith("/") ? path : `/${path}`;
  return withSlash.endsWith("/") ? withSlash : `${withSlash}/`;
}

function normaliseDestination(to: string): string {
  const trimmed = String(to || "").trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return normalisePath(trimmed);
}

function parseCsvRedirectImport(content: string): RuntimeRedirectRule[] {
  const lines = content
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return [];

  const split = (line: string) => {
    const cols: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        cols.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    cols.push(cur.trim());
    return cols;
  };

  let start = 0;
  let headers = split(lines[0]).map((h) => h.toLowerCase().replace(/^\ufeff/, ""));
  const looksLikeHeader =
    headers.some((h) => /^(from|source|url|match_url|old)$/.test(h)) &&
    headers.some((h) => /^(to|destination|url_to|new|target)$/.test(h));
  if (!looksLikeHeader) {
    headers = ["from", "to", "status"];
  } else {
    start = 1;
  }

  const idx = (names: string[]) => headers.findIndex((h) => names.includes(h));
  const fromIdx = idx(["from", "source", "url", "match_url", "old", "url_from"]);
  const toIdx = idx(["to", "destination", "url_to", "new", "target", "redirect_to"]);
  const statusIdx = idx(["status", "header_code", "statuscode", "code", "type"]);

  const out: RuntimeRedirectRule[] = [];
  for (let i = start; i < lines.length; i++) {
    const cols = split(lines[i]);
    const from = fromIdx >= 0 ? cols[fromIdx] || "" : cols[0] || "";
    const to = toIdx >= 0 ? cols[toIdx] || "" : cols[1] || "";
    const statusRaw = statusIdx >= 0 ? cols[statusIdx] : cols[2];
    const status = Number(statusRaw || 301);
    if (!from || !to) continue;
    const fromPath = normalisePath(from);
    const toPath = normaliseDestination(to);
    if (!toPath || fromPath === normalisePath(toPath)) continue;
    out.push({
      from: fromPath,
      to: toPath,
      status: Number.isFinite(status) ? status : 301,
      source: "csv-import",
      importedAt: new Date().toISOString(),
    });
  }
  return out;
}

/**
 * Parse Rank Math / generic JSON redirect exports.
 * Important: never use the same `url` field for both from and to (self-redirect bug).
 */
export function parseRankMathRedirectImport(content: string): RuntimeRedirectRule[] {
  const trimmed = content.trim();
  if (!trimmed) return [];

  // CSV detection (header or simple path rows)
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return parseCsvRedirectImport(trimmed);
  }

  const parsed = JSON.parse(trimmed) as Record<string, unknown> | unknown[];
  const candidates = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as any).redirects)
      ? (parsed as any).redirects
      : Array.isArray((parsed as any).redirections)
        ? (parsed as any).redirections
        : Array.isArray((parsed as any).items)
          ? (parsed as any).items
          : [];

  return candidates
    .map((row) => {
      const entry = row as Record<string, unknown>;
      const sources = entry.sources;
      const sourceFromArray =
        Array.isArray(sources) && sources.length
          ? String(sources[0] || "").trim()
          : Array.isArray(entry.source) && entry.source.length
            ? String(entry.source[0] || "").trim()
            : "";

      const from = String(
        entry.from ||
          entry.source ||
          entry.url_from ||
          entry.match_url ||
          entry.regex_url ||
          sourceFromArray ||
          entry.url ||
          "",
      ).trim();

      // Do NOT fall back to entry.url for destination — Rank Math often puts the
      // source path in `url`, which produced self-redirects.
      const to = String(
        entry.to ||
          entry.destination ||
          entry.url_to ||
          entry.redirect_to ||
          entry.target ||
          entry.new_url ||
          "",
      ).trim();

      const status = Number(entry.status || entry.header_code || entry.statusCode || entry.type || 301);
      if (!from || !to) return null;

      const fromPath = normalisePath(from);
      const toPath = normaliseDestination(to);
      if (!toPath || fromPath === normalisePath(toPath)) return null;

      return {
        from: fromPath,
        to: toPath,
        status: Number.isFinite(status) ? status : 301,
        source: "rank-math-import",
        importedAt: new Date().toISOString(),
      } satisfies RuntimeRedirectRule;
    })
    .filter((row): row is RuntimeRedirectRule => Boolean(row));
}

/** Auto-detect JSON vs CSV by content / filename hint. */
export function parseRedirectImport(content: string, fileName = ""): RuntimeRedirectRule[] {
  const name = fileName.toLowerCase();
  const trimmed = content.trim();
  if (name.endsWith(".csv") || (!trimmed.startsWith("{") && !trimmed.startsWith("["))) {
    return parseCsvRedirectImport(trimmed);
  }
  return parseRankMathRedirectImport(trimmed);
}

export function normaliseRedirectRule(
  input: Pick<RuntimeRedirectRule, "from" | "to"> & Partial<RuntimeRedirectRule>,
): RuntimeRedirectRule {
  return {
    from: normalisePath(String(input.from || "").trim()),
    to: normaliseDestination(String(input.to || "").trim()),
    status: Number(input.status || 301),
    source: input.source || "dashboard",
    importedAt: input.importedAt || new Date().toISOString(),
  };
}
