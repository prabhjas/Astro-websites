const EMPTY_LITERALS = new Set(['null', 'undefined', '']);

export function isMeaningfulValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return false;
    if (EMPTY_LITERALS.has(trimmed.toLowerCase())) return false;
    return true;
  }
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

export function removeEmptyValues<T extends Record<string, unknown>>(payload: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (isMeaningfulValue(value)) {
      out[key] = value;
    }
  }
  return out as Partial<T>;
}
