import type { APIRoute } from 'astro';
import {
  deriveAttributionFromRequest,
  mergeAttributionIntoContactForm,
  normaliseAttribution,
} from '@/lib/attribution/server';
import { FileLeadStore } from '@/lib/leads/file-store';
import { deliverStoredLead } from '@/lib/leads/service';
import type { LeadSubmissionRecord } from '@/lib/leads/types';
import { getServerEnv } from '@/env/server';
import { logFormFailure } from '@/services/logger';
import { getClientIp, isRateLimited } from '@/utils/form/rate-limit';
import { maskSensitiveValue } from '@/utils/form/mask';
import { parseContactFormBody } from '@/utils/form/parse-contact-body';
import { validateContactForm, type ContactFormInput } from '@/utils/form/validate';

export const prerender = false;

const MAX_BODY_BYTES = 32_768;

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

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_BODY_BYTES) {
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
  try {
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      // Browser posts CF7 field names (first-name, your-email, phonetext-*).
      // Always run through parseContactFormBody — do not cast JSON as ContactFormInput.
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
    } else {
      const formData = await request.formData();
      const raw: Record<string, FormDataEntryValue> = {};
      const arrays: Record<string, string[]> = {};
      formData.forEach((value, key) => {
        if (key.endsWith('[]')) {
          const arrayKey = key.slice(0, -2);
          if (!arrays[arrayKey]) arrays[arrayKey] = [];
          arrays[arrayKey].push(String(value));
          return;
        }
        raw[key] = value;
      });
      input = parseContactFormBody(raw, arrays);
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

  const requestAttribution = deriveAttributionFromRequest(request);
  const attributionPayload = normaliseAttribution({ ...requestAttribution, ...input });
  const firstTouchPayload = normaliseAttribution(parseAttributionJson(form.firstTouchPayload));
  const lastTouchPayload = normaliseAttribution(
    parseAttributionJson(form.lastTouchPayload || JSON.stringify(attributionPayload)),
  );
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
