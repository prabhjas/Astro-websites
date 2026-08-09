import type { APIRoute } from 'astro';
import { isValidPublicId } from '@connect/site-cms/leads/public-id';
import { deriveAttributionFromRequest, mergeAttributionIntoContactForm, normaliseAttribution } from '../../lib/attribution/server';
import { FileLeadStore } from '../../lib/leads/file-store';
import { deliverStoredLead } from '../../lib/leads/service';
import type { LeadSubmissionRecord } from '../../lib/leads/types';
import { getServerEnv } from '../../env/server';
import { logFormFailure } from '../../services/logger';
import { getClientIp, isRateLimited } from '../../utils/form/rate-limit';
import { maskSensitiveValue } from '../../utils/form/mask';
import { parseContactFormBody } from '../../utils/form/parse-contact-body';
import {
  collectFilesFromFormData,
  persistBase64Attachments,
  persistContactAttachments,
  type IncomingBase64Attachment,
} from '../../utils/form/persist-attachments';
import { validateContactForm, type ContactFormInput } from '../../utils/form/validate';

export const prerender = false;

const MAX_JSON_BODY_BYTES = 40 * 1024 * 1024; // includes base64 wizard uploads
const MAX_MULTIPART_BODY_BYTES = 40 * 1024 * 1024;

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function parseAttributionJson(value: string | undefined): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export const POST: APIRoute = async ({ request }) => {
  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  let env;

  const contentType = request.headers.get('content-type') || '';
  const isMultipart = contentType.includes('multipart/form-data');
  const maxBody = isMultipart ? MAX_MULTIPART_BODY_BYTES : MAX_JSON_BODY_BYTES;
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > maxBody) {
    logFormFailure({
      requestId,
      timestamp,
      errorMessage: 'Request body too large',
      errorCode: 'payload_too_large',
    });
    return jsonResponse(
      { success: false, message: 'We could not submit your enquiry at the moment. Please try again shortly.' },
      413,
    );
  }

  const clientIp = getClientIp(request);
  if (isRateLimited(clientIp)) {
    logFormFailure({
      requestId,
      timestamp,
      errorMessage: 'Rate limit exceeded',
      errorCode: 'rate_limited',
    });
    return jsonResponse(
      { success: false, message: 'We could not submit your enquiry at the moment. Please try again shortly.' },
      429,
    );
  }

  try {
    env = getServerEnv();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server configuration error';
    logFormFailure({
      requestId,
      timestamp,
      errorMessage: message,
      errorCode: 'config_error',
    });
    return jsonResponse(
      { success: false, message: 'We could not submit your enquiry at the moment. Please try again shortly.' },
      500,
    );
  }

  let input: ContactFormInput;
  let pendingBase64Attachments: IncomingBase64Attachment[] = [];
  let pendingFileAttachments: File[] = [];
  try {
    const contentTypeHeader = request.headers.get('content-type') || '';
    if (contentTypeHeader.includes('application/json')) {
      const json = (await request.json()) as Record<string, unknown>;
      const raw: Record<string, FormDataEntryValue> = {};
      const arrays: Record<string, string[]> = {};
      for (const [key, value] of Object.entries(json || {})) {
        if (Array.isArray(value)) {
          arrays[key] = value.map((v) => String(v));
        } else if (value != null && typeof value !== 'object') {
          raw[key] = String(value);
        }
      }
      input = parseContactFormBody(raw, arrays);
      if (!input.submissionId) input.submissionId = crypto.randomUUID();
      pendingBase64Attachments = Array.isArray((json as { attachments_b64?: unknown }).attachments_b64)
        ? ((json as { attachments_b64: IncomingBase64Attachment[] }).attachments_b64 || [])
        : [];
    } else {
      const formData = await request.formData();
      const raw: Record<string, FormDataEntryValue> = {};
      const arrays: Record<string, string[]> = {};
      formData.forEach((value, key) => {
        if (value instanceof File) return;
        if (key.endsWith('[]')) {
          const arrayKey = key.slice(0, -2);
          if (!arrays[arrayKey]) arrays[arrayKey] = [];
          arrays[arrayKey].push(String(value));
          return;
        }
        raw[key] = value;
      });
      input = parseContactFormBody(raw, arrays);

      if (!input.submissionId) input.submissionId = crypto.randomUUID();
      pendingFileAttachments = collectFilesFromFormData(formData);
    }
  } catch {
    logFormFailure({
      requestId,
      timestamp,
      websiteId: env.websiteId,
      formName: env.formName,
      errorMessage: 'Failed to parse request body',
      errorCode: 'parse_error',
    });
    return jsonResponse(
      { success: false, message: 'We could not submit your enquiry at the moment. Please try again shortly.' },
      400,
    );
  }

  if (!input.formName) input.formName = env.formName;
  if (!input.formSource) input.formSource = env.formSource;
  if (!input.pageUrl) input.pageUrl = request.headers.get('referer') || undefined;
  if (!input.submittedAt) input.submittedAt = timestamp;
  if (!input.submissionId) input.submissionId = crypto.randomUUID();

  const validation = validateContactForm(input);
  if (!validation.valid) {
    logFormFailure({
      requestId,
      timestamp,
      websiteId: env.websiteId,
      formName: input.formName || env.formName,
      pageUrl: input.pageUrl,
      campaign: input.campaign,
      errorMessage: validation.message,
      errorCode: 'validation_error',
      email: input.email ? maskSensitiveValue(input.email, 'email') : undefined,
      phone: input.phone ? maskSensitiveValue(input.phone, 'phone') : undefined,
    });
    return jsonResponse(
      {
        success: false,
        message: validation.message,
        errors: validation.errors,
      },
      422,
    );
  }

  const form = validation.data;
  if (!isValidPublicId(form.submissionId)) {
    logFormFailure({
      requestId,
      timestamp,
      websiteId: env.websiteId,
      formName: form.formName || env.formName,
      errorMessage: 'Invalid submission ID',
      errorCode: 'validation_error',
    });
    return jsonResponse(
      { success: false, message: 'We could not submit your enquiry at the moment. Please try again shortly.' },
      422,
    );
  }

  const requestAttribution = deriveAttributionFromRequest(request);
  const attributionPayload = normaliseAttribution({ ...requestAttribution, ...input });
  const firstTouchPayload = normaliseAttribution(parseAttributionJson(form.firstTouchPayload));
  const lastTouchPayload = normaliseAttribution(parseAttributionJson(form.lastTouchPayload || JSON.stringify(attributionPayload)));
  mergeAttributionIntoContactForm(form, lastTouchPayload, firstTouchPayload, attributionPayload);

  const store = new FileLeadStore({
    rootDir: env.leadStoreDir,
    maxFileBytes: env.leadStoreMaxFileBytes,
  });

  const existing = await store.getSubmission(form.submissionId);
  if (existing) {
    return jsonResponse({
      success: true,
      submissionId: existing.publicId,
      message: 'Thank you. Your enquiry has been received.',
    });
  }

  if (pendingBase64Attachments.length || pendingFileAttachments.length) {
    const saved = pendingBase64Attachments.length
      ? await persistBase64Attachments(env.leadStoreDir, form.submissionId, pendingBase64Attachments)
      : await persistContactAttachments(env.leadStoreDir, form.submissionId, pendingFileAttachments);
    if (saved.error) {
      return jsonResponse({ success: false, message: saved.error, errors: { file: saved.error } }, 422);
    }
    form.attachments = saved.attachments;
  }

  const record: LeadSubmissionRecord = {
    id: crypto.randomUUID(),
    publicId: form.submissionId,
    requestId,
    idempotencyKey: request.headers.get('x-idempotency-key')?.trim() || form.submissionId,
    formId: form.formId || 'contact-form',
    formName: form.formName || env.formName,
    submissionStatus: 'stored',
    deliveryStatus: 'pending',
    payload: form,
    attributionPayload,
    firstTouchPayload,
    lastTouchPayload,
    landingPageUrl: form.landingPageUrl || firstTouchPayload.landing_page_url || '',
    submissionPageUrl: form.submissionPageUrl || form.pageUrl || '',
    referrerUrl: form.referrerUrl || attributionPayload.referrer || '',
    gclid: form.gclid,
    gbraid: form.gbraid,
    wbraid: form.wbraid,
    fbclid: form.fbclid,
    msclkid: form.msclkid,
    campaignId: form.campaignId,
    adgroupId: form.adgroupId,
    groupId: form.groupId,
    creativeId: form.creativeId,
    keyword: form.keyword,
    matchtype: form.matchtype,
    device: form.device,
    network: form.network,
    placement: form.placement,
    target: form.target,
    source: form.source,
    utmSource: form.utmSource,
    utmMedium: form.utmMedium,
    utmCampaign: form.utmCampaign,
    utmTerm: form.utmTerm,
    utmContent: form.utmContent,
    deliveryAttemptCount: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  try {
    await store.storeSubmission(record);
  } catch (error) {
    logFormFailure({
      requestId,
      timestamp,
      websiteId: env.websiteId,
      formName: record.formName,
      errorMessage: error instanceof Error ? error.message : 'Failed to persist submission',
      errorCode: 'lead_store_error',
    });
    return jsonResponse(
      { success: false, message: 'We could not submit your enquiry at the moment. Please try again shortly.' },
      500,
    );
  }

  const updatedRecord = await deliverStoredLead(env, store, record, requestId, 'initial');

  return jsonResponse({
    success: true,
    submissionId: updatedRecord.publicId,
    message: 'Thank you. Your enquiry has been received.',
  });
};
