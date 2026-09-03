import type { LeadEnv } from '../../context.js';
import type { LeadSubmissionRecord } from '../types.js';
import { buildFlowEnvelope, serialiseFlowEnvelope } from './flow-envelope.js';
import { flowSigningHeaders, signFlowRequest } from './flow-signing.js';
import type { DestinationFailure, DestinationResult, LeadDestination } from './types.js';

export const FLOW_INGEST_PATH = '/api/sales/leads';
export const FLOW_PING_PATH = '/api/sales/leads/ping';

export type FlowConfig = {
  enabled: boolean;
  baseUrl: string;
  token: string;
  signingSecret: string;
  siteId: string;
  siteDomain?: string;
  maxBodyBytes: number;
  requestTimeoutMs: number;
  maxAttempts: number;
};

/**
 * Flow refuses insecure transport, but only for requests that actually arrive.
 * A plain-http URL is answered by the edge with a 301, and a 301 on a POST makes
 * the client drop the body — the enquiry disappears with nothing looking wrong.
 * That is the exact bug that cost this fleet real enquiries, so a misconfigured
 * base URL fails at start-up instead of silently at runtime.
 */
export function assertHttpsBaseUrl(baseUrl: string): void {
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new Error(`FLOW_INGEST_URL is not a valid URL: ${baseUrl}`);
  }
  if (parsed.protocol !== 'https:') {
    throw new Error(`FLOW_INGEST_URL must be https, refusing to start with: ${baseUrl}`);
  }
}

/**
 * Flow configuration comes from the process environment rather than each site's
 * env module. Every site supplies its own `getLeadEnv()`, so requiring the
 * mapping there would mean editing 36 site packages to ship one feature. The
 * backend already reads its env file at runtime, so per-site setup is the
 * FLOW_* block in that file and nothing else. A LeadEnv value still wins where
 * one is present, which keeps this injectable in tests.
 */
export function readFlowConfig(env: LeadEnv): FlowConfig | null {
  const raw = env as Record<string, unknown>;
  const proc: Record<string, string | undefined> =
    typeof process !== 'undefined' && process.env ? process.env : {};

  const pick = (envKey: string, procKey: string): string =>
    String(raw[envKey] ?? proc[procKey] ?? '').trim();

  const enabled =
    raw.flowEnabled === true ||
    (raw.flowEnabled === undefined && String(proc.FLOW_ENABLED ?? '').toLowerCase() === 'true');
  const baseUrl = pick('flowIngestUrl', 'FLOW_INGEST_URL');
  if (!enabled || !baseUrl) return null;

  assertHttpsBaseUrl(baseUrl);

  const number = (envKey: string, procKey: string, fallback: number): number => {
    const value = Number(raw[envKey] ?? proc[procKey] ?? fallback);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  };

  return {
    enabled,
    baseUrl: baseUrl.replace(/\/+$/, ''),
    token: pick('flowToken', 'FLOW_TOKEN'),
    signingSecret: pick('flowSigningSecret', 'FLOW_SIGNING_SECRET'),
    siteId: pick('flowSiteId', 'FLOW_SITE_ID'),
    siteDomain: pick('flowSiteDomain', 'FLOW_SITE_DOMAIN') || undefined,
    maxBodyBytes: number('flowMaxBodyBytes', 'FLOW_MAX_BODY_BYTES', 15360),
    requestTimeoutMs: number('flowRequestTimeoutMs', 'FLOW_REQUEST_TIMEOUT_MS', 5000),
    maxAttempts: number('flowMaxRetryAttempts', 'FLOW_MAX_RETRY_ATTEMPTS', 6),
  };
}

function classify(status: number, reason: string | undefined, body: string): DestinationFailure {
  // Flow's contract: 400/401/403/413 are permanent, 429/503 are retryable.
  if (status === 429 || status === 503 || (status >= 500 && status < 600)) {
    return { success: false, retryable: true, errorCode: reason || `http_${status}`, error: body, statusCode: status };
  }
  if (status === 400 || status === 401 || status === 403 || status === 413) {
    return { success: false, retryable: false, errorCode: reason || `http_${status}`, error: body, statusCode: status };
  }
  return { success: false, retryable: false, errorCode: reason || `http_${status}`, error: body, statusCode: status };
}

function retryAfterSeconds(headers: Headers): number | undefined {
  const raw = headers.get('retry-after');
  if (!raw) return undefined;
  const asNumber = Number(raw);
  if (Number.isFinite(asNumber) && asNumber >= 0) return asNumber;
  const asDate = Date.parse(raw);
  if (!Number.isNaN(asDate)) return Math.max(0, Math.round((asDate - Date.now()) / 1000));
  return undefined;
}

async function send(
  config: FlowConfig,
  method: 'POST' | 'GET',
  path: string,
  body: string,
): Promise<{ status: number; json: Record<string, unknown> | null; headers: Headers } | { networkError: string }> {
  const signed = signFlowRequest({ secret: config.signingSecret, method, pathWithQuery: path, body });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.requestTimeoutMs);
  try {
    const response = await fetch(`${config.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/json',
        ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
        ...(method === 'POST' ? { 'X-Idempotency-Key': String(JSON.parse(body).idempotency_key ?? '') } : {}),
        ...flowSigningHeaders(signed),
      },
      // The SAME bytes that were signed. Never hand fetch the object.
      ...(method === 'POST' ? { body } : {}),
      signal: controller.signal,
    });
    let json: Record<string, unknown> | null = null;
    let text = '';
    try {
      text = await response.text();
      json = text ? (JSON.parse(text) as Record<string, unknown>) : null;
    } catch {
      json = null;
    }
    return { status: response.status, json: json ?? ({ raw: text } as Record<string, unknown>), headers: response.headers };
  } catch (error) {
    return { networkError: error instanceof Error ? error.message : 'Flow network error' };
  } finally {
    clearTimeout(timer);
  }
}

export function createFlowDestination(config: FlowConfig): LeadDestination {
  return {
    id: 'flow',
    maxAttempts: config.maxAttempts,
    async deliver(_env: LeadEnv, record: LeadSubmissionRecord): Promise<DestinationResult> {
      if (!config.token || !config.signingSecret) {
        // Not yet given credentials: skip rather than retry. Retrying a site
        // that was never configured would fill its store with failures and
        // bury a genuine Flow problem elsewhere in the fleet.
        return {
          success: false,
          skipped: true,
          reason: 'Flow skipped (FLOW_TOKEN or FLOW_SIGNING_SECRET not configured)',
        };
      }

      const envelope = buildFlowEnvelope(record, {
        siteId: config.siteId,
        siteDomain: config.siteDomain,
      });
      const { body } = serialiseFlowEnvelope(envelope, config.maxBodyBytes);

      const result = await send(config, 'POST', FLOW_INGEST_PATH, body);
      if ('networkError' in result) {
        return { success: false, retryable: true, errorCode: 'network_error', error: result.networkError };
      }

      const { status, json, headers } = result;
      if (status >= 200 && status < 300) {
        return {
          success: true,
          externalId: json?.id != null ? String(json.id) : undefined,
          externalRefs: json?.lead_uuid ? { leadUuid: String(json.lead_uuid) } : undefined,
          summary: `Flow ${status} (${String(json?.status ?? 'stored')})`,
          // A warning rides on a 2xx. It is stored; it is never a retry reason.
          warning: json?.warning ? String(json.warning) : undefined,
        };
      }

      const classified = classify(status, json?.reason ? String(json.reason) : undefined, String(json?.error ?? ''));
      if (classified.retryable) {
        classified.retryAfterSeconds = retryAfterSeconds(headers);
      }
      return classified;
    },
  };
}

/**
 * Signed ping, used as the post-deploy self-test.
 *
 * Run from inside the backend process, a 200 proves in one call that this
 * process is on the release carrying the adapter, holds working credentials,
 * has a clock inside the 300-second signature window, is posting from an
 * allow-listed address, and can reach Flow. A publish that switched only the
 * front cannot produce a 200 here, because this code would not be running.
 */
export async function flowSelfTest(config: FlowConfig): Promise<{
  ok: boolean;
  status?: number;
  siteId?: string;
  reason?: string;
  error?: string;
}> {
  if (!config.token || !config.signingSecret) {
    return { ok: false, error: 'FLOW_TOKEN or FLOW_SIGNING_SECRET is not configured' };
  }
  const result = await send(config, 'GET', FLOW_PING_PATH, '');
  if ('networkError' in result) return { ok: false, error: result.networkError };
  const { status, json } = result;
  return {
    ok: status >= 200 && status < 300,
    status,
    siteId: json?.site_id ? String(json.site_id) : undefined,
    reason: json?.reason ? String(json.reason) : undefined,
    error: json?.error ? String(json.error) : undefined,
  };
}
