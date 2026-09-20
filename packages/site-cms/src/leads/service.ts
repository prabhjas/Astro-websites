import { getSiteCms, type LeadEnv } from '../context.js';
import { getNextRetryAt } from './retry-policy.js';
import type {
  DeliveryTrigger,
  DestinationDelivery,
  LeadDeliveryAttemptRecord,
  LeadSubmissionRecord,
} from './types.js';
import { FileLeadStore } from './file-store.js';
import { resolveDestinations } from './destinations/registry.js';
import { deriveDeliveryStatus, isDue, isSkipped, normaliseDeliveries } from './destinations/types.js';
import type { DestinationResult, LeadDestination } from './destinations/types.js';

/**
 * Deliver a stored lead to every configured destination.
 *
 * Two properties matter and are easy to lose:
 *
 * 1. Destinations are dispatched in PARALLEL. Delivery is awaited on the request
 *    path, so a sequential loop would add each destination's latency to the
 *    visitor's page response. Parallel keeps it at the slowest, not the sum.
 *
 * 2. A destination that has already succeeded is NEVER re-sent. Pipedrive has no
 *    idempotency key, so re-sending creates a second person and a second lead for
 *    a customer it already has. Without this skip, a Flow outage would duplicate
 *    every affected lead in Pipedrive on the next retry.
 */
export async function deliverStoredLead(
  env: LeadEnv,
  store: FileLeadStore,
  record: LeadSubmissionRecord,
  requestId: string,
  triggerType: DeliveryTrigger,
): Promise<LeadSubmissionRecord> {
  const cms = getSiteCms();
  const nowIso = new Date().toISOString();
  const deliveries: Record<string, DestinationDelivery> = { ...normaliseDeliveries(record) };
  const destinations = resolveDestinations(env);

  const explicitRetry = triggerType === 'manual_retry' || triggerType === 'bulk_retry';
  const due = destinations.filter((d) =>
    isDue(deliveries[d.id], nowIso, { explicitRetry, maxAttempts: d.maxAttempts }),
  );

  const outcomes = await Promise.allSettled(
    due.map(async (destination) => {
      const startedAt = Date.now();
      const startedAtIso = new Date(startedAt).toISOString();
      const result = await destination.deliver(env, record);
      return { destination, result, startedAt, startedAtIso };
    }),
  );

  for (let index = 0; index < outcomes.length; index += 1) {
    const outcome = outcomes[index];
    const destination = due[index];
    const previous = deliveries[destination.id];
    const attemptNumber = (previous?.attemptCount ?? 0) + 1;
    const completedAt = new Date().toISOString();

    // A thrown adapter is a retryable failure, not a lost lead.
    const result: DestinationResult =
      outcome.status === 'fulfilled'
        ? outcome.value.result
        : {
            success: false,
            retryable: true,
            errorCode: 'adapter_error',
            error: outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason),
          };
    const startedAtIso = outcome.status === 'fulfilled' ? outcome.value.startedAtIso : completedAt;
    const durationMs = outcome.status === 'fulfilled' ? Date.now() - outcome.value.startedAt : 0;

    // Not configured for this site: record it and move on. No attempt is logged
    // and no retry scheduled, because nothing was tried and nothing is owed.
    if (isSkipped(result)) {
      deliveries[destination.id] = {
        status: 'skipped',
        attemptCount: previous?.attemptCount ?? 0,
        lastAttemptAt: previous?.lastAttemptAt,
        skippedReason: result.reason,
      };
      continue;
    }

    const attempt: LeadDeliveryAttemptRecord = {
      id: crypto.randomUUID(),
      destination: destination.id,
      leadSubmissionId: record.id,
      publicId: record.publicId,
      requestId,
      attemptNumber,
      triggerType,
      status: result.success ? 'success' : result.retryable ? 'retryable_failure' : 'permanent_failure',
      httpStatus: result.success ? 200 : result.statusCode,
      externalReference: result.success ? result.externalId : undefined,
      responseSummary: result.success ? result.summary : undefined,
      errorCode: result.success ? undefined : result.errorCode,
      errorMessage: result.success ? undefined : result.error,
      durationMs,
      createdAt: startedAtIso,
      completedAt,
    };
    await store.storeAttempt(attempt);

    if (result.success) {
      deliveries[destination.id] = {
        status: 'delivered',
        attemptCount: attemptNumber,
        externalId: result.externalId,
        externalRefs: result.externalRefs,
        lastAttemptAt: completedAt,
        deliveredAt: completedAt,
        warning: result.warning,
      };
      if (result.warning) {
        // Stored and surfaced, never retried: the lead is already accepted.
        cms.logWarn('lead_destination_warning', {
          requestId,
          submissionId: record.publicId,
          destination: destination.id,
          warning: result.warning,
        });
      }
      continue;
    }

    // Retry-After wins over our backoff schedule when the destination sets one.
    const scheduled =
      result.retryable && attemptNumber < destination.maxAttempts
        ? result.retryAfterSeconds != null
          ? new Date(Date.now() + result.retryAfterSeconds * 1000).toISOString()
          : getNextRetryAt(attemptNumber)
        : null;

    deliveries[destination.id] = {
      status: scheduled ? 'retry_scheduled' : result.retryable ? 'dead_letter' : 'failed',
      attemptCount: attemptNumber,
      externalId: previous?.externalId,
      externalRefs: previous?.externalRefs,
      lastErrorCode: result.errorCode,
      lastErrorMessage: result.error,
      lastAttemptAt: completedAt,
      nextRetryAt: scheduled ?? undefined,
    };

    if (destination.id === 'pipedrive') {
      cms.logPipedriveFailure({
        requestId,
        timestamp: completedAt,
        formName: record.formName,
        websiteId: env.websiteId,
        campaign: record.payload.campaign,
        pipedriveStatusCode: result.statusCode,
        pipedriveError: result.error,
        retryable: result.retryable,
        nextRetryAt: scheduled,
        submissionId: record.publicId,
        triggerType,
      });
    } else {
      cms.logWarn('lead_destination_failure', {
        requestId,
        submissionId: record.publicId,
        destination: destination.id,
        errorCode: result.errorCode,
        errorMessage: result.error,
        statusCode: result.statusCode,
        retryable: result.retryable,
        nextRetryAt: scheduled,
        triggerType,
      });
    }
  }

  const completedAt = new Date().toISOString();
  const pipedrive = deliveries.pipedrive;

  const updatedRecord: LeadSubmissionRecord = {
    ...record,
    deliveries,
    deliveryStatus: deriveDeliveryStatus(deliveries),
    // Legacy aliases, kept in step so the dashboard and CSV export are unaffected.
    deliveryAttemptCount: pipedrive?.attemptCount ?? record.deliveryAttemptCount ?? 0,
    nextRetryAt: pipedrive?.nextRetryAt,
    lastAttemptAt: pipedrive?.lastAttemptAt ?? record.lastAttemptAt,
    deliveredAt: pipedrive?.deliveredAt ?? record.deliveredAt,
    lastErrorCode: pipedrive?.lastErrorCode,
    lastErrorMessage: pipedrive?.lastErrorMessage,
    pipedriveLeadId: pipedrive?.externalId ?? record.pipedriveLeadId,
    pipedrivePersonId: pipedrive?.externalRefs?.personId
      ? Number(pipedrive.externalRefs.personId)
      : record.pipedrivePersonId,
    pipedriveResponseSummary:
      pipedrive?.status === 'delivered'
        ? 'Lead created in Pipedrive'
        : pipedrive?.status === 'skipped'
          ? pipedrive.skippedReason
          : pipedrive?.lastErrorMessage,
    updatedAt: completedAt,
  };

  await store.updateSubmission(updatedRecord);

  const emailResult = await cms.sendFormNotification(env, record.payload);
  cms.logFormSuccess({
    requestId,
    timestamp: completedAt,
    submissionId: updatedRecord.publicId,
    websiteId: env.websiteId,
    formName: updatedRecord.formName,
    deliveryStatus: updatedRecord.deliveryStatus,
    pipedriveLeadId: updatedRecord.pipedriveLeadId,
    pipedrivePersonId: updatedRecord.pipedrivePersonId,
    emailNotificationSent: emailResult.sent,
    emailNotificationSkipped: emailResult.skipped,
    triggerType,
  });

  for (const [id, delivery] of Object.entries(deliveries)) {
    if (delivery.status === 'failed' || delivery.status === 'dead_letter') {
      cms.logWarn('lead_delivery_requires_manual_review', {
        requestId,
        submissionId: updatedRecord.publicId,
        destination: id,
        deliveryStatus: delivery.status,
        formName: updatedRecord.formName,
        triggerType,
      });
    }
  }

  return updatedRecord;
}

export type { LeadDestination };
