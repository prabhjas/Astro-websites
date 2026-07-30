import type { ServerEnv } from '../../env/server';
import { sendFormNotification } from '../../services/email';
import { logFormSuccess, logPipedriveFailure, logWarn } from '../../services/logger';
import { createPipedriveLead } from '../../services/pipedrive';
import { getNextRetryAt } from './retry-policy';
import type { DeliveryTrigger, LeadDeliveryAttemptRecord, LeadSubmissionRecord } from './types';
import { FileLeadStore } from './file-store';

export async function deliverStoredLead(
  env: ServerEnv,
  store: FileLeadStore,
  record: LeadSubmissionRecord,
  requestId: string,
  triggerType: DeliveryTrigger,
): Promise<LeadSubmissionRecord> {
  const startedAt = Date.now();
  const startedAtIso = new Date(startedAt).toISOString();
  const pipedriveResult = await createPipedriveLead(env, record.payload);
  const attemptNumber = record.deliveryAttemptCount + 1;
  const completedAt = new Date().toISOString();

  const attempt: LeadDeliveryAttemptRecord = {
    id: crypto.randomUUID(),
    leadSubmissionId: record.id,
    publicId: record.publicId,
    requestId,
    attemptNumber,
    triggerType,
    status: pipedriveResult.success ? 'success' : pipedriveResult.retryable ? 'retryable_failure' : 'permanent_failure',
    httpStatus: pipedriveResult.success ? 200 : pipedriveResult.statusCode,
    externalReference: pipedriveResult.success ? pipedriveResult.leadId : undefined,
    responseSummary: pipedriveResult.success ? 'Lead created in Pipedrive' : undefined,
    errorCode: pipedriveResult.success ? undefined : pipedriveResult.errorCode,
    errorMessage: pipedriveResult.success ? undefined : pipedriveResult.error,
    durationMs: Date.now() - startedAt,
    createdAt: startedAtIso,
    completedAt,
  };
  await store.storeAttempt(attempt);

  const updatedRecord: LeadSubmissionRecord = {
    ...record,
    deliveryAttemptCount: attemptNumber,
    lastAttemptAt: completedAt,
    updatedAt: completedAt,
  };

  if (pipedriveResult.success) {
    updatedRecord.deliveryStatus = 'delivered';
    updatedRecord.deliveredAt = completedAt;
    updatedRecord.pipedriveLeadId = pipedriveResult.leadId;
    updatedRecord.pipedrivePersonId = pipedriveResult.personId;
    updatedRecord.pipedriveResponseSummary = 'Lead created in Pipedrive';
  } else {
    updatedRecord.lastErrorCode = pipedriveResult.errorCode;
    updatedRecord.lastErrorMessage = pipedriveResult.error;
    updatedRecord.pipedriveResponseSummary = pipedriveResult.error;
    const nextRetryAt =
      pipedriveResult.retryable && attemptNumber < env.pipedriveMaxRetryAttempts
        ? getNextRetryAt(attemptNumber)
        : null;
    if (nextRetryAt) {
      updatedRecord.deliveryStatus = 'retry_scheduled';
      updatedRecord.nextRetryAt = nextRetryAt;
    } else {
      updatedRecord.deliveryStatus = pipedriveResult.retryable ? 'dead_letter' : 'failed';
    }
    logPipedriveFailure({
      requestId,
      timestamp: completedAt,
      formName: record.formName,
      websiteId: env.websiteId,
      campaign: record.payload.campaign,
      pipedriveStatusCode: pipedriveResult.statusCode,
      pipedriveError: pipedriveResult.error,
      retryable: pipedriveResult.retryable,
      nextRetryAt,
      submissionId: record.publicId,
      triggerType,
    });
  }

  await store.updateSubmission(updatedRecord);

  const emailResult = await sendFormNotification(env, record.payload);
  logFormSuccess({
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

  if (!pipedriveResult.success && updatedRecord.deliveryStatus !== 'retry_scheduled') {
    logWarn('lead_delivery_requires_manual_review', {
      requestId,
      submissionId: updatedRecord.publicId,
      deliveryStatus: updatedRecord.deliveryStatus,
      formName: updatedRecord.formName,
      triggerType,
    });
  }

  return updatedRecord;
}
