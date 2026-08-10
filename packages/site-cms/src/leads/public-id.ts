import { isAbsolute, relative, resolve } from 'node:path';

export const PUBLIC_ID_MAX_LENGTH = 128;

// Browser clients generate UUIDs, with a timestamp-random fallback. Keep legacy
// alphanumeric, dash and underscore IDs valid while rejecting every path syntax.
const PUBLIC_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;

export function isValidPublicId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= PUBLIC_ID_MAX_LENGTH &&
    PUBLIC_ID_PATTERN.test(value)
  );
}

export function assertValidPublicId(value: unknown): asserts value is string {
  if (!isValidPublicId(value)) {
    throw new TypeError('Invalid publicId');
  }
}

/** Resolve an untrusted child path and prove it remains below the canonical base. */
export function resolveContainedPath(baseDir: string, ...segments: string[]): string {
  const base = resolve(baseDir);
  const candidate = resolve(base, ...segments);
  const rel = relative(base, candidate);

  if (rel === '' || (!isAbsolute(rel) && rel !== '..' && !rel.startsWith('../') && !rel.startsWith('..\\'))) {
    return candidate;
  }

  throw new TypeError('Resolved path escapes its base directory');
}
