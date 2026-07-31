import type { ServerEnv } from '../../env/server';
import type { NormalisedContactForm } from '../../utils/form/validate';
import { removeEmptyValues } from '../../utils/form/remove-empty';

export type PipedriveResult =
  | { success: true; personId: number; leadId: string; retryable: false }
  | {
      success: false;
      statusCode?: number;
      error: string;
      retryable: boolean;
      errorCode: string;
    };

type PipedriveApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  error_info?: string;
};

function apiBase(domain: string): string {
  const trimmed = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (trimmed.includes('.')) {
    return `https://${trimmed}/api/v1`;
  }
  return `https://${trimmed}.pipedrive.com/api/v1`;
}

async function pipedriveRequest<T>(
  env: ServerEnv,
  path: string,
  method: 'GET' | 'POST' | 'PUT',
  body?: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; data?: T; error?: string }> {
  const url = new URL(`${apiBase(env.pipedriveCompanyDomain)}${path}`);
  url.searchParams.set('api_token', env.pipedriveApiToken);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.pipedriveRequestTimeoutMs);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeout);
    const message = error instanceof Error ? error.message : 'Pipedrive network error';
    return { ok: false, status: 0, error: message };
  }
  clearTimeout(timeout);

  let parsed: PipedriveApiResponse<T> | null = null;
  try {
    parsed = (await response.json()) as PipedriveApiResponse<T>;
  } catch {
    return { ok: false, status: response.status, error: 'Invalid Pipedrive response' };
  }

  if (!response.ok || !parsed?.success) {
    return {
      ok: false,
      status: response.status,
      error: parsed?.error || parsed?.error_info || `Pipedrive request failed (${response.status})`,
    };
  }

  return { ok: true, status: response.status, data: parsed.data };
}

function classifyPipedriveError(statusCode: number, error: string): { retryable: boolean; errorCode: string } {
  if (statusCode === 0) return { retryable: true, errorCode: 'network_error' };
  if ([429, 500, 502, 503, 504].includes(statusCode)) {
    return { retryable: true, errorCode: `http_${statusCode}` };
  }
  if ([401, 403].includes(statusCode)) {
    return { retryable: false, errorCode: `http_${statusCode}` };
  }
  if (statusCode === 400) {
    return { retryable: false, errorCode: 'validation_error' };
  }
  const code = error.toLowerCase().includes('timeout') ? 'timeout' : `http_${statusCode}`;
  return { retryable: false, errorCode: code };
}

function buildFormMessage(form: NormalisedContactForm): string {
  const lines = [
    'Iberia Workforce — Website enquiry',
    '',
    '=== Contact Information ===',
    `Name: ${form.fullName}`,
    form.email ? `Email: ${form.email}` : '',
    form.phone ? `Phone: ${form.phone}` : '',
    form.company ? `Company: ${form.company}` : '',
    form.professionSector ? `Service of interest: ${form.professionSector}` : '',
    form.leadSource ? `Language: ${form.leadSource}` : '',
  ].filter(Boolean);
  if (form.message) lines.push('', '=== Message ===', form.message);
  if (form.pageUrl || form.landingPageUrl) {
    lines.push('', '=== Tracking ===');
    if (form.pageUrl) lines.push(`Submitted from: ${form.pageUrl}`);
    if (form.landingPageUrl) lines.push(`Landed on: ${form.landingPageUrl}`);
  }
  return lines.join('\n');
}

function buildCustomFields(env: ServerEnv, form: NormalisedContactForm): Record<string, unknown> {
  const keys = env.fieldKeys;
  const fields: Record<string, unknown> = {};

  const set = (key: string | undefined, value: unknown) => {
    if (key && value !== undefined && value !== null && value !== '') fields[key] = value;
  };

  set(keys.message, buildFormMessage(form));
  if (env.pipedriveLeadSourceId) set(keys.source, env.pipedriveLeadSourceId);
  if (env.websiteId) set(keys.website, env.websiteId);
  set(keys.leadSubmittedOn, form.pageUrl ? `Lead Submitted On: ${form.pageUrl}` : undefined);
  set(keys.userLandedOn, form.referrerUrl ? `User Landed on: ${form.referrerUrl}` : undefined);
  set(keys.nationality, form.nationality);
  set(keys.countryCode, form.countryCode ? form.countryCode.replace(/^\+/, '') : undefined);
  set(keys.companyName, form.company);
  set(keys.professionSector, form.professionSector);
  set(keys.locPhysicalMs, form.locPhysicalMs);
  set(keys.locInterestMs, form.locInterestMs);
  set(keys.adposition, form.adposition);
  set(keys.targetId, form.targetId);
  set(keys.placement, form.placement);
  set(keys.network, form.network);
  set(keys.device, form.device);
  set(keys.matchtype, form.matchtype);
  set(keys.keyword, form.keyword);
  set(keys.creativeId, form.creativeId);
  set(keys.campaignId, form.campaignId || form.campaign);
  set(keys.adgroupId, form.adgroupId);
  set(keys.gclid, form.gclid);
  set(keys.location, form.location);
  set(keys.campaign, form.campaign);
  set(keys.utmSource, form.utmSource);
  set(keys.utmMedium, form.utmMedium);
  set(keys.utmCampaign, form.utmCampaign);
  set(keys.utmTerm, form.utmTerm);
  set(keys.utmContent, form.utmContent);
  set(keys.fbclid, form.fbclid);

  return removeEmptyValues(fields) as Record<string, unknown>;
}

async function createPerson(env: ServerEnv, form: NormalisedContactForm): Promise<{ ok: boolean; id?: number; status: number; error?: string }> {
  const payload = removeEmptyValues({
    name: form.fullName,
    first_name: form.firstName,
    last_name: form.lastName,
    owner_id: env.pipedriveOwnerId > 0 ? env.pipedriveOwnerId : undefined,
    visible_to: env.pipedrivePersonVisibleTo,
    label_ids: env.pipedrivePersonLabelIds.length ? env.pipedrivePersonLabelIds : undefined,
    email: form.email ? [{ value: form.email, primary: true, label: 'work' }] : undefined,
    phone: form.phone ? [{ value: form.phone, primary: true, label: 'work' }] : undefined,
  });

  const result = await pipedriveRequest<{ id: number }>(env, '/persons', 'POST', payload);
  if (!result.ok || !result.data?.id) {
    return { ok: false, status: result.status, error: result.error };
  }
  return { ok: true, id: result.data.id, status: result.status };
}

async function createNote(
  env: ServerEnv,
  leadId: string,
  form: NormalisedContactForm,
): Promise<void> {
  const content = buildFormMessage(form);
  if (!content.trim()) return;
  const result = await pipedriveRequest(env, '/notes', 'POST', {
    lead_id: leadId,
    content,
  });
  if (!result.ok) {
    console.error('[pipedrive] note create failed for lead', leadId, result.error);
  }
}

async function createLead(
  env: ServerEnv,
  personId: number,
  form: NormalisedContactForm,
): Promise<{ ok: boolean; id?: string; status: number; error?: string }> {
  const serviceSuffix = form.professionSector ? ` — ${form.professionSector}` : '';
  const title = `${env.leadTitlePrefix.trim() || 'Website lead — iberiaworkforce.com'}${serviceSuffix}`;
  const payload = removeEmptyValues({
    title,
    owner_id: env.pipedriveOwnerId > 0 ? env.pipedriveOwnerId : undefined,
    person_id: personId,
    ...buildCustomFields(env, form),
  });

  const result = await pipedriveRequest<{ id: string }>(env, '/leads', 'POST', payload);
  if (!result.ok || !result.data?.id) {
    return { ok: false, status: result.status, error: result.error };
  }
  // Always attach a note so enquiry text is visible even without custom fields.
  await createNote(env, result.data.id, form);
  return { ok: true, id: result.data.id, status: result.status };
}

export async function createPipedriveLead(env: ServerEnv, form: NormalisedContactForm): Promise<PipedriveResult> {
  if (!env.pipedriveApiToken.trim()) {
    return {
      success: false,
      statusCode: 503,
      error: 'PIPEDRIVE_API_TOKEN is not configured',
      retryable: true,
      errorCode: 'config_error',
    };
  }

  const personResult = await createPerson(env, form);
  if (!personResult.ok || !personResult.id) {
    const classified = classifyPipedriveError(
      personResult.status,
      personResult.error || 'Failed to create person in Pipedrive',
    );
    return {
      success: false,
      statusCode: personResult.status,
      error: personResult.error || 'Failed to create person in Pipedrive',
      retryable: classified.retryable,
      errorCode: classified.errorCode,
    };
  }

  const leadResult = await createLead(env, personResult.id, form);
  if (!leadResult.ok || !leadResult.id) {
    const classified = classifyPipedriveError(
      leadResult.status,
      leadResult.error || 'Failed to create lead in Pipedrive',
    );
    return {
      success: false,
      statusCode: leadResult.status,
      error: leadResult.error || 'Failed to create lead in Pipedrive',
      retryable: classified.retryable,
      errorCode: classified.errorCode,
    };
  }

  return { success: true, personId: personResult.id, leadId: leadResult.id, retryable: false };
}
