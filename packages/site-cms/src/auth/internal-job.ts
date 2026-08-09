/**
 * Shared auth for machine callers (central CMS / cron).
 *
 * Legacy endpoints accept Authorization: Bearer <INTERNAL_JOB_SECRET> or
 * x-internal-job-secret. Sensitive endpoints must use the site-scoped request
 * signature implemented below. Query-string ?secret= is never accepted
 * because URLs leak through logs, Referer headers, and browser history.
 */
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { getLeadEnv, getSiteCms } from '../context.js';
import { applyInternalNoIndexHeaders } from '../security/internal-response.js';

export const SITE_AUTH_VERSION = 'site-v1';
export const SITE_AUTH_MAX_CLOCK_SKEW_SECONDS = 300;
export const SITE_AUTH_MAX_BODY_BYTES = 65_536;

const SITE_ID_HEADER = 'x-internal-site-id';
const TIMESTAMP_HEADER = 'x-internal-auth-timestamp';
const NONCE_HEADER = 'x-internal-auth-nonce';
const MAX_NONCE_CACHE_ENTRIES = 4_096;

const nonceExpiries = new Map<string, number>();

export type SiteScopedAuthInput = {
  secret: string;
  siteId: string;
  scope: string;
  timestamp?: number;
  nonce?: string;
};

export type SiteScopedAuthVerifyOptions = {
  now?: number;
  maxClockSkewSeconds?: number;
  maxBodyBytes?: number;
};

export type SiteScopedAuthResult =
  | { authorized: true }
  | {
      authorized: false;
      reason:
        | 'weak-secret'
        | 'invalid-site'
        | 'invalid-request'
        | 'expired'
        | 'invalid-signature'
        | 'replay'
        | 'body-too-large'
        | 'replay-cache-full';
    };

function readBearerCredential(request: Request): string {
  const authorization = request.headers.get('authorization') || '';
  const bearerMatch = authorization.match(/^Bearer\s+(.+)$/i);
  return bearerMatch?.[1]?.trim() || '';
}

function readLegacyAuthorizationCredential(request: Request): string {
  const authorization = request.headers.get('authorization') || '';
  // Preserve HEAD compatibility for legacy endpoints, which historically
  // accepted either a Bearer value or the raw secret in Authorization.
  return authorization.replace(/^Bearer\s+/i, '').trim();
}

function readLegacyHeaderCredential(request: Request): string {
  return request.headers.get('x-internal-job-secret')?.trim() || '';
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left, 'utf8');
  const rightBytes = Buffer.from(right, 'utf8');
  if (leftBytes.length !== rightBytes.length) return false;
  return timingSafeEqual(leftBytes, rightBytes);
}

/**
 * Deterministic configuration check for secrets used by sensitive endpoints.
 * It cannot prove fleet-wide uniqueness, but it rejects weak/default material;
 * the derived request token is also cryptographically bound to one site.
 */
export function getInternalJobSecretIssue(secret: string): string | null {
  const value = String(secret || '');
  if (!value) return 'missing';
  if (value !== value.trim()) return 'surrounding-whitespace';
  const byteLength = Buffer.byteLength(value, 'utf8');
  if (byteLength < 32) return 'too-short';
  if (byteLength > 512) return 'too-long';

  const normalized = value.toLowerCase().replace(/[^a-z0-9]/g, '');
  const placeholderPatterns = [
    /^(?:change|replace)(?:me|this|with)?/,
    /^(?:your|my)(?:internaljob)?(?:secret|token|key)/,
    /^(?:internaljob)?(?:secret|password|token|apikey|key)(?:123|1234)?$/,
    /^(?:test|testing|development|dev|example|sample|dummy|placeholder|todo)(?:secret|token|key)?(?:123|1234)?$/,
  ];
  if (placeholderPatterns.some((pattern) => pattern.test(normalized))) return 'placeholder';
  if (/^(.)\1+$/.test(value)) return 'repeated-character';
  return null;
}

export function isInternalJobAuthorized(request: Request, secret: string): boolean {
  if (!secret) return false;
  // Preserve the legacy contract: either credential may independently grant
  // access, even when the other header is present but unrelated.
  const bearerAuthorized = constantTimeEqual(readLegacyAuthorizationCredential(request), secret);
  const headerAuthorized = constantTimeEqual(readLegacyHeaderCredential(request), secret);
  return bearerAuthorized || headerAuthorized;
}

function canonicalSiteId(raw: string): string | null {
  const siteId = String(raw || '').trim().toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/.test(siteId)) return null;
  return siteId;
}

function canonicalScope(raw: string): string | null {
  const scope = String(raw || '').trim().toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9:._-]{0,62}[a-z0-9])?$/.test(scope)) return null;
  return scope;
}

function canonicalRequestTarget(request: Request): string {
  const url = new URL(request.url);
  return `${url.pathname}${url.search}`;
}

function canonicalContentType(request: Request): string {
  // Preserve the exact media type and parameter values. Multipart boundary
  // values are case-sensitive and changing one alters how the signed body is
  // parsed, so only insignificant surrounding whitespace may be removed.
  return (request.headers.get('content-type') || '').trim();
}

async function hashRequestBody(request: Request, maxBodyBytes: number): Promise<string | null> {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(contentLength) && contentLength > maxBodyBytes) return null;

  const body = request.clone().body;
  const hash = createHash('sha256');
  if (!body) return hash.digest('hex');

  const reader = body.getReader();
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBodyBytes) {
        await reader.cancel();
        return null;
      }
      hash.update(value);
    }
  } finally {
    reader.releaseLock();
  }
  return hash.digest('hex');
}

function canonicalSignaturePayload(args: {
  siteId: string;
  scope: string;
  method: string;
  target: string;
  contentType: string;
  timestamp: number;
  nonce: string;
  bodySha256: string;
}): string {
  return [
    SITE_AUTH_VERSION,
    args.siteId,
    args.scope,
    args.method.toUpperCase(),
    args.target,
    args.contentType,
    String(args.timestamp),
    args.nonce,
    args.bodySha256,
  ].join('\n');
}

function signatureFor(secret: string, payload: string): string {
  return `${SITE_AUTH_VERSION}.${createHmac('sha256', secret).update(payload).digest('base64url')}`;
}

/**
 * Build authorization headers for a request already containing its final body.
 * The caller must send the exact URL, method, body, and returned headers.
 */
export async function createSiteScopedInternalJobAuthHeaders(
  request: Request,
  input: SiteScopedAuthInput,
): Promise<Headers> {
  const secretIssue = getInternalJobSecretIssue(input.secret);
  if (secretIssue) throw new Error(`Refusing to sign with an invalid internal secret (${secretIssue}).`);

  const siteId = canonicalSiteId(input.siteId);
  const scope = canonicalScope(input.scope);
  if (!siteId || !scope) throw new Error('Invalid site ID or authorization scope.');

  const timestamp = input.timestamp ?? Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(timestamp) || timestamp <= 0) throw new Error('Invalid authorization timestamp.');
  const nonce = input.nonce || randomBytes(18).toString('base64url');
  if (!/^[A-Za-z0-9_-]{22,128}$/.test(nonce)) throw new Error('Invalid authorization nonce.');

  const bodySha256 = await hashRequestBody(request, SITE_AUTH_MAX_BODY_BYTES);
  if (!bodySha256) throw new Error('Request body exceeds the site-auth limit.');

  const signature = signatureFor(
    input.secret,
    canonicalSignaturePayload({
      siteId,
      scope,
      method: request.method,
      target: canonicalRequestTarget(request),
      contentType: canonicalContentType(request),
      timestamp,
      nonce,
      bodySha256,
    }),
  );

  return new Headers({
    Authorization: `Bearer ${signature}`,
    [SITE_ID_HEADER]: siteId,
    [TIMESTAMP_HEADER]: String(timestamp),
    [NONCE_HEADER]: nonce,
  });
}

function pruneNonceCache(now: number): void {
  for (const [key, expiresAt] of nonceExpiries) {
    if (expiresAt <= now) nonceExpiries.delete(key);
  }
}

/** Verify a body-bound, short-lived, single-use site token. */
export async function verifySiteScopedInternalJobRequest(
  request: Request,
  input: Pick<SiteScopedAuthInput, 'secret' | 'siteId' | 'scope'>,
  options: SiteScopedAuthVerifyOptions = {},
): Promise<SiteScopedAuthResult> {
  if (getInternalJobSecretIssue(input.secret)) return { authorized: false, reason: 'weak-secret' };

  const siteId = canonicalSiteId(input.siteId);
  const scope = canonicalScope(input.scope);
  if (!siteId || !scope) return { authorized: false, reason: 'invalid-site' };
  if (request.headers.get(SITE_ID_HEADER)?.trim().toLowerCase() !== siteId) {
    return { authorized: false, reason: 'invalid-site' };
  }

  const timestampRaw = request.headers.get(TIMESTAMP_HEADER)?.trim() || '';
  const timestamp = Number(timestampRaw);
  const nonce = request.headers.get(NONCE_HEADER)?.trim() || '';
  if (
    !/^\d{10,11}$/.test(timestampRaw) ||
    !Number.isSafeInteger(timestamp) ||
    !/^[A-Za-z0-9_-]{22,128}$/.test(nonce)
  ) {
    return { authorized: false, reason: 'invalid-request' };
  }

  const now = options.now ?? Date.now();
  const maxClockSkewSeconds = options.maxClockSkewSeconds ?? SITE_AUTH_MAX_CLOCK_SKEW_SECONDS;
  if (Math.abs(Math.floor(now / 1000) - timestamp) >= maxClockSkewSeconds) {
    return { authorized: false, reason: 'expired' };
  }

  const bodySha256 = await hashRequestBody(request, options.maxBodyBytes ?? SITE_AUTH_MAX_BODY_BYTES);
  if (!bodySha256) return { authorized: false, reason: 'body-too-large' };

  const expected = signatureFor(
    input.secret,
    canonicalSignaturePayload({
      siteId,
      scope,
      method: request.method,
      target: canonicalRequestTarget(request),
      contentType: canonicalContentType(request),
      timestamp,
      nonce,
      bodySha256,
    }),
  );
  // Site-scoped signatures have one unambiguous transport: Bearer auth. The
  // legacy x-internal-job-secret header must never carry a site-v1 token.
  if (!constantTimeEqual(readBearerCredential(request), expected)) {
    return { authorized: false, reason: 'invalid-signature' };
  }

  pruneNonceCache(now);
  const nonceKey = `${siteId}:${scope}:${nonce}`;
  if (nonceExpiries.has(nonceKey)) return { authorized: false, reason: 'replay' };
  if (nonceExpiries.size >= MAX_NONCE_CACHE_ENTRIES) {
    return { authorized: false, reason: 'replay-cache-full' };
  }
  nonceExpiries.set(nonceKey, (timestamp + maxClockSkewSeconds) * 1_000);
  return { authorized: true };
}

export function internalJsonHeaders(): Headers {
  const headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8' });
  applyInternalNoIndexHeaders(headers);
  return headers;
}

export function internalJson(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: internalJsonHeaders() });
}

/** Returns an error Response if unauthorized / misconfigured; otherwise null. */
export function requireInternalJobAuth(request: Request): Response | null {
  let secret = '';
  try {
    secret = String(getLeadEnv().internalJobSecret || '');
  } catch {
    return internalJson({ success: false, message: 'Server configuration error.' }, 500);
  }

  if (!secret) {
    return internalJson({ success: false, message: 'INTERNAL_JOB_SECRET is not configured.' }, 503);
  }

  if (!isInternalJobAuthorized(request, secret)) {
    return internalJson({ success: false, message: 'Forbidden' }, 403);
  }

  return null;
}

/**
 * Sensitive-write authentication. Unlike legacy auth, this requires a strong
 * secret and a signed request bound to the canonical server-side site ID.
 */
export async function requireSiteScopedInternalJobAuth(
  request: Request,
  scope: string,
): Promise<Response | null> {
  let secret = '';
  let siteId = '';
  try {
    secret = String(getLeadEnv().internalJobSecret || '');
    siteId = String(getSiteCms().siteId || '');
  } catch {
    return internalJson({ success: false, message: 'Server configuration error.' }, 500);
  }

  const result = await verifySiteScopedInternalJobRequest(request, { secret, siteId, scope });
  if (result.authorized === true) return null;
  if (result.reason === 'weak-secret') {
    return internalJson(
      { success: false, message: 'Strong site-scoped internal authentication is not configured.' },
      503,
    );
  }
  if (result.reason === 'body-too-large') {
    return internalJson({ success: false, message: 'Request body is too large.' }, 413);
  }
  if (result.reason === 'replay-cache-full') {
    return internalJson({ success: false, message: 'Authentication service is temporarily unavailable.' }, 503);
  }
  return internalJson({ success: false, message: 'Forbidden' }, 403);
}
