export const DEFAULT_RETRY_DELAYS_MS = [
  60_000,
  5 * 60_000,
  15 * 60_000,
  60 * 60_000,
  6 * 60 * 60_000,
];

export function getRetryDelayMs(attemptNumber: number, configured?: number[]): number | null {
  const delays = configured && configured.length > 0 ? configured : DEFAULT_RETRY_DELAYS_MS;
  const index = Math.max(0, attemptNumber - 1);
  return delays[index] ?? null;
}

export function getNextRetryAt(attemptNumber: number, now = Date.now(), configured?: number[]): string | null {
  const delay = getRetryDelayMs(attemptNumber, configured);
  if (delay === null) return null;
  return new Date(now + delay).toISOString();
}
