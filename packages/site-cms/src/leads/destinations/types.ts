import type { LeadEnv } from '../../context.js';
import type { DeliveryStatus, DestinationDelivery, LeadSubmissionRecord } from '../types.js';

export type { DestinationDelivery };

/**
 * A lead is delivered to one or more destinations that succeed, fail and retry
 * independently. Before this, delivery was hardcoded to Pipedrive and the record
 * carried a single status — there was nowhere to record that Flow succeeded
 * while Pipedrive failed, and no way to retry one without re-sending the other.
 *
 * Re-sending matters: Pipedrive has no idempotency key, so every call creates a
 * fresh person and lead. A retry that re-sends an already-delivered destination
 * duplicates the customer. Destinations that have already succeeded are skipped.
 */

export type DestinationId = 'pipedrive' | 'flow';

export type DestinationSuccess = {
  success: true;
  externalId?: string;
  externalRefs?: Record<string, string>;
  summary?: string;
  warning?: string;
};

/**
 * Not configured for this site. The lead is stored and no retry is scheduled —
 * the file-only mode (a blank PIPEDRIVE_API_TOKEN, or a site not yet given Flow
 * credentials). Distinct from a failure: nothing is wrong and nothing is owed.
 */
export type DestinationSkipped = {
  success: false;
  skipped: true;
  reason: string;
};

export type DestinationFailure = {
  success: false;
  /** Present and false so `skipped` discriminates the union. */
  skipped?: false;
  /** false means permanent: never re-send this body. */
  retryable: boolean;
  errorCode: string;
  error: string;
  statusCode?: number;
  /** Seconds, from a Retry-After header. Honoured over the backoff schedule. */
  retryAfterSeconds?: number;
};

export type DestinationResult = DestinationSuccess | DestinationSkipped | DestinationFailure;

export function isSkipped(result: DestinationResult): result is DestinationSkipped {
  return result.success === false && result.skipped === true;
}

export type LeadDestination = {
  id: DestinationId;
  /** Attempts vs this destination stop after this many. */
  maxAttempts: number;
  deliver(env: LeadEnv, record: LeadSubmissionRecord): Promise<DestinationResult>;
};

/** Records written before the per-destination model have no `deliveries` map. */
export function normaliseDeliveries(record: LeadSubmissionRecord): Record<string, DestinationDelivery> {
  if (record.deliveries && typeof record.deliveries === 'object') return record.deliveries;

  const legacy: DestinationDelivery = {
    status: record.deliveryStatus,
    attemptCount: record.deliveryAttemptCount ?? 0,
    externalId: record.pipedriveLeadId,
    externalRefs: record.pipedrivePersonId ? { personId: String(record.pipedrivePersonId) } : undefined,
    lastErrorCode: record.lastErrorCode,
    lastErrorMessage: record.lastErrorMessage,
    lastAttemptAt: record.lastAttemptAt,
    deliveredAt: record.deliveredAt,
    nextRetryAt: record.nextRetryAt,
  };
  return { pipedrive: legacy };
}

/**
 * The record-level status, derived. Delivered only once every destination has
 * succeeded; otherwise the least-settled state wins, so a lead is never reported
 * as delivered while one destination is still owed.
 */
export function deriveDeliveryStatus(deliveries: Record<string, DestinationDelivery>): DeliveryStatus {
  const values = Object.values(deliveries);
  if (values.length === 0) return 'pending';
  // Every destination skipped is the file-only mode: stored, nothing owed.
  if (values.every((d) => d.status === 'skipped')) return 'skipped';
  const settled = (d: DestinationDelivery) =>
    d.status === 'delivered' || d.status === 'manually_resolved' || d.status === 'skipped';
  if (values.every(settled)) return 'delivered';
  if (values.some((d) => d.status === 'retry_scheduled')) return 'retry_scheduled';
  if (values.some((d) => d.status === 'pending' || d.status === 'processing')) return 'pending';
  if (values.some((d) => d.status === 'dead_letter')) return 'dead_letter';
  return 'failed';
}

/** True when this destination still owes a delivery attempt at `nowIso`. */
export function isDue(delivery: DestinationDelivery | undefined, nowIso: string): boolean {
  if (!delivery) return true;
  if (delivery.status === 'delivered' || delivery.status === 'manually_resolved') return false;
  if (delivery.status === 'failed') return false;
  // Skipped is re-evaluated every time: a site given credentials later should
  // start delivering without anything having to rewrite its stored leads.
  if (delivery.status === 'skipped') return true;
  if (delivery.status === 'retry_scheduled') {
    return Boolean(delivery.nextRetryAt) && String(delivery.nextRetryAt) <= nowIso;
  }
  return true;
}
