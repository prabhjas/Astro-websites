import type { AttributionValues } from '../attribution/config';
import type { NormalisedContactForm } from '../../utils/form/validate';

export type SubmissionStatus = 'received' | 'validated' | 'stored' | 'rejected' | 'spam' | 'archived';
export type DeliveryStatus = 'pending' | 'processing' | 'delivered' | 'retry_scheduled' | 'failed' | 'dead_letter' | 'manually_resolved';
export type DeliveryTrigger = 'initial' | 'automatic_retry' | 'manual_retry' | 'bulk_retry';
export type DeliveryResultType = 'success' | 'retryable_failure' | 'permanent_failure';

export type LeadSubmissionRecord = {
  id: string;
  publicId: string;
  requestId: string;
  idempotencyKey: string;
  formId: string;
  formName: string;
  submissionStatus: SubmissionStatus;
  deliveryStatus: DeliveryStatus;
  payload: NormalisedContactForm;
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
