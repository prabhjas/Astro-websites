/**
 * Date window for enhanced Google Ads uploads.
 *
 * Default (no query / env): last 2 days from jobs.ts.
 * Override (any of these, YYYY-MM-DD):
 *   ?date=2026-08-06              → that day only
 *   ?start=2026-08-06&end=2026-08-10
 *   ?from= / ?to=                 → aliases of start/end
 *   ?start=2026-08-06             → that day through today (UTC)
 *   ?end=2026-08-10               → that day only
 * Env: ENHANCED_WINDOW_START / ENHANCED_WINDOW_END (same rules, after query).
 */

export type EnhancedDateOverride = {
  date?: string;
  start?: string;
  end?: string;
};

export type ResolvedEnhancedWindow = {
  start: string;
  end: string;
  source: 'default' | 'override';
  error?: string;
};

export function parseIsoDate(value: string): string | null {
  const s = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) return null;
  return s;
}

export function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export function parseEnhancedDateQuery(params: URLSearchParams): EnhancedDateOverride | undefined {
  const date = (params.get('date') || params.get('day') || '').trim();
  const start = (params.get('start') || params.get('from') || '').trim();
  const end = (params.get('end') || params.get('to') || '').trim();
  if (!date && !start && !end) return undefined;
  return {
    date: date || undefined,
    start: start || undefined,
    end: end || undefined,
  };
}

function attemptedOverride(
  override?: EnhancedDateOverride,
  envStart = '',
  envEnd = '',
): boolean {
  return Boolean(
    override?.date || override?.start || override?.end || envStart.trim() || envEnd.trim(),
  );
}

/**
 * Query wins over env. Invalid YYYY-MM-DD returns error (do not silently fall back).
 */
export function resolveEnhancedDateRange(
  defaultWindow: { start: string; end: string },
  override?: EnhancedDateOverride,
  envStart = '',
  envEnd = '',
): ResolvedEnhancedWindow {
  const wanted = attemptedOverride(override, envStart, envEnd);
  if (!wanted) {
    return { start: defaultWindow.start, end: defaultWindow.end, source: 'default' };
  }

  const rawDate = override?.date?.trim() || '';
  const rawStart = override?.start?.trim() || envStart.trim();
  const rawEnd = override?.end?.trim() || envEnd.trim();

  if (rawDate) {
    const day = parseIsoDate(rawDate);
    if (!day) {
      return {
        ...defaultWindow,
        source: 'override',
        error: `Invalid date=${rawDate}. Use YYYY-MM-DD.`,
      };
    }
    return { start: day, end: day, source: 'override' };
  }

  const start = rawStart ? parseIsoDate(rawStart) : null;
  const end = rawEnd ? parseIsoDate(rawEnd) : null;

  if (rawStart && !start) {
    return {
      ...defaultWindow,
      source: 'override',
      error: `Invalid start=${rawStart}. Use YYYY-MM-DD.`,
    };
  }
  if (rawEnd && !end) {
    return {
      ...defaultWindow,
      source: 'override',
      error: `Invalid end=${rawEnd}. Use YYYY-MM-DD.`,
    };
  }

  let from = start;
  let to = end;
  if (from && !to) to = utcToday();
  if (to && !from) from = to;

  if (!from || !to) {
    return {
      ...defaultWindow,
      source: 'override',
      error: 'Date override needs date=YYYY-MM-DD or start=/end= YYYY-MM-DD.',
    };
  }

  if (from > to) {
    return { start: to, end: from, source: 'override' };
  }
  return { start: from, end: to, source: 'override' };
}
