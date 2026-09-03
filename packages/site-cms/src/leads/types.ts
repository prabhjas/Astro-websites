import type { ContactPayload } from '../context.js';

export type AttributionValues = Record<string, string>;

export type SubmissionStatus = 'received' | 'validated' | 'stored' | 'rejected' | 'spam' | 'archived';
export type DeliveryStatus =
  | 'pending'
  | 'processing'
  | 'delivered'
  | 'skipped'
  | 'retry_scheduled'
  | 'failed'
  | 'dead_letter'
  | 'manually_resolved';
export type DeliveryTrigger = 'initial' | 'automatic_retry' | 'manual_retry' | 'bulk_retry';
export type DeliveryResultType = 'success' | 'retryable_failure' | 'permanent_failure';

/**
 * Delivery state for one destination. Destinations succeed, fail and retry
 * independently, so each carries its own status, attempt count and schedule.
 */
export type DestinationDelivery = {
  status: DeliveryStatus;
  attemptCount: number;
  externalId?: string;
  externalRefs?: Record<string, string>;
  lastErrorCode?: string;
  lastErrorMessage?: string;
  lastAttemptAt?: string;
  deliveredAt?: string;
  nextRetryAt?: string;
  /** Destination stored the lead but flagged something. Never a retry reason. */
  warning?: string;
  /** Why this destination was skipped, when status is 'skipped'. */
  skippedReason?: string;
};

export type LeadSubmissionRecord = {
  id: string;
  publicId: string;
  requestId: string;
  idempotencyKey: string;
  formId: string;
  formName: string;
  submissionStatus: SubmissionStatus;
  deliveryStatus: DeliveryStatus;
  payload: ContactPayload;
  attributionPayload: AttributionValues;
  firstTouchPayload: AttributionValues;
  lastTouchPayload: AttributionValues;
  landingPageUrl: string;
  submissionPageUrl: string;
  referrerUrl: string;
  gclid: string;
  gbraid: string;
  wbraid: string;
  fbclid: string;
  msclkid: string;
  campaignId: string;
  adgroupId: string;
  groupId: string;
  creativeId: string;
  keyword: string;
  matchtype: string;
  device: string;
  network: string;
  placement: string;
  target: string;
  source: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm: string;
  utmContent: string;
  /**
   * Per-destination delivery state, keyed by destination id. Absent on records
   * written before the multi-destination model — normaliseDeliveries() maps
   * those from the legacy pipedrive* fields below.
   */
  deliveries?: Record<string, DestinationDelivery>;
  /**
   * Legacy Pipedrive fields. Kept and maintained as derived aliases of
   * deliveries.pipedrive so the lead-ops dashboard and CSV export are unaffected.
   */
  pipedrivePersonId?: number;
  pipedriveLeadId?: string;
  pipedriveResponseSummary?: string;
  deliveryAttemptCount: number;
  nextRetryAt?: string;
  lastAttemptAt?: string;
  deliveredAt?: string;
  lastErrorCode?: string;
  lastErrorMessage?: string;
  createdAt: string;
  updatedAt: string;
};

export type LeadDeliveryAttemptRecord = {
  id: string;
  /** Which destination this attempt was against. Absent on pre-multi-destination rows. */
  destination?: string;
  leadSubmissionId: string;
  publicId: string;
  requestId: string;
  attemptNumber: number;
  triggerType: DeliveryTrigger;
  status: DeliveryResultType;
  httpStatus?: number;
  externalReference?: string;
  responseSummary?: string;
  errorCode?: string;
  errorMessage?: string;
  durationMs?: number;
  createdAt: string;
  completedAt?: string;
};

export type LeadStoreEvent =
  | { type: 'lead_submission_stored'; record: LeadSubmissionRecord; createdAt: string }
  | { type: 'lead_delivery_attempt'; record: LeadDeliveryAttemptRecord; createdAt: string }
  | { type: 'lead_delivery_updated'; record: LeadSubmissionRecord; createdAt: string };
