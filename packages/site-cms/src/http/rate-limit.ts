const WINDOW_MS = 60_000;
const MAX_REQUESTS = 5;
const MAX_KEYS = 10_000;
const MAX_KEY_LENGTH = 128;

type HitBucket = {
  timestamps: number[];
  expiresAt: number;
};

const hits = new Map<string, HitBucket>();
let nextPruneAt = 0;

function normaliseKey(raw: string): string {
  return String(raw || 'unknown').trim().slice(0, MAX_KEY_LENGTH) || 'unknown';
}

function pruneExpired(now: number): void {
  if (now < nextPruneAt) return;
  for (const [key, bucket] of hits) {
    if (bucket.expiresAt <= now) hits.delete(key);
  }
  nextPruneAt = now + WINDOW_MS;
}

function makeCapacity(now: number): void {
  // Expiration is swept at most once per window. Between sweeps, evicting the
  // first Map entry is constant-time and avoids a full-map scan for every new
  // attacker-controlled key after the store reaches its bound.
  pruneExpired(now);
  if (hits.size < MAX_KEYS) return;
  const oldest = hits.keys().next().value as string | undefined;
  if (oldest !== undefined) hits.delete(oldest);
}

/** Bounded, expiring per-process limiter for low-volume contact endpoints. */
export function isRateLimited(rawKey: string): boolean {
  const now = Date.now();
  const key = normaliseKey(rawKey);
  pruneExpired(now);

  const existing = hits.get(key);
  const recent = (existing?.timestamps || []).filter((timestamp) => now - timestamp < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) {
    hits.delete(key);
    hits.set(key, { timestamps: recent, expiresAt: recent[recent.length - 1] + WINDOW_MS });
    return true;
  }

  if (!existing && hits.size >= MAX_KEYS) makeCapacity(now);
  recent.push(now);
  // Refresh insertion order so capacity eviction approximates LRU behavior.
  hits.delete(key);
  hits.set(key, { timestamps: recent, expiresAt: now + WINDOW_MS });
  return false;
}

export function resetRateLimitStore(): void {
  hits.clear();
  nextPruneAt = 0;
}

/**
 * Preserve the fleet's current proxy-header contract. H-04 must restrict the
 * origin and configure trusted proxies before this header can be authoritative.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const comma = forwarded.indexOf(',');
    return normaliseKey(comma === -1 ? forwarded : forwarded.slice(0, comma));
  }
  return normaliseKey(request.headers.get('x-real-ip') || 'unknown');
}
