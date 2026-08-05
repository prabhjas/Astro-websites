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
    'Contact Form Submission',
    '',
    `Name: ${form.fullName}`,
    `Email: ${form.email}`,
    `Phone: ${form.phone}`,
  ];
  if (form.message) lines.push('', `Message: ${form.message}`);
  if (form.company) lines.push(`Company: ${form.company}`);
  if (form.location) lines.push(`Location: ${form.location}`);
  if (form.campaign) lines.push(`Campaign: ${form.campaign}`);
  return lines.join('\n');
}

function buildCustomFields(env: ServerEnv, form: NormalisedContactForm): Record<string, unknown> {
  const keys = env.fieldKeys;

  const fields: Record<string, unknown> = {
    [keys.message]: buildFormMessage(form),
    [keys.source]: env.pipedriveLeadSourceId,
    [keys.website]: env.websiteId,
    [keys.leadSubmittedOn]: form.pageUrl ? `Lead Submitted On: ${form.pageUrl}` : undefined,
    [keys.userLandedOn]: form.referrerUrl ? `User Landed on: ${form.referrerUrl}` : undefined,
    [keys.nationality]: form.nationality,
    [keys.countryCode]: form.countryCode ? form.countryCode.replace(/^\+/, '') : undefined,
    [keys.companyName]: form.company,
    [keys.professionSector]: form.professionSector,
    [keys.locPhysicalMs]: form.locPhysicalMs,
    [keys.locInterestMs]: form.locInterestMs,
    [keys.adposition]: form.adposition,
    [keys.targetId]: form.targetId,
    [keys.placement]: form.placement,
    [keys.network]: form.network,
    [keys.device]: form.device,
    [keys.matchtype]: form.matchtype,
    [keys.keyword]: form.keyword,
    [keys.creativeId]: form.creativeId,
    [keys.campaignId]: form.campaignId || form.campaign,
    [keys.adgroupId]: form.adgroupId,
    [keys.gclid]: form.gclid,
  };

  if (keys.location) fields[keys.location] = form.location;
  if (keys.campaign) fields[keys.campaign] = form.campaign;
  if (keys.utmSource) fields[keys.utmSource] = form.utmSource;
  if (keys.utmMedium) fields[keys.utmMedium] = form.utmMedium;
  if (keys.utmCampaign) fields[keys.utmCampaign] = form.utmCampaign;
  if (keys.utmTerm) fields[keys.utmTerm] = form.utmTerm;
  if (keys.utmContent) fields[keys.utmContent] = form.utmContent;
  if (keys.fbclid) fields[keys.fbclid] = form.fbclid;

  return removeEmptyValues(fields) as Record<string, unknown>;
}

async function createPerson(env: ServerEnv, form: NormalisedContactForm): Promise<{ ok: boolean; id?: number; status: number; error?: string }> {
  const payload = removeEmptyValues({
    name: form.fullName,
    first_name: form.firstName,
    last_name: form.lastName,
    owner_id: env.pipedriveOwnerId,
    visible_to: env.pipedrivePersonVisibleTo,
    label_ids: env.pipedrivePersonLabelIds,
    email: [{ value: form.email, primary: true, label: 'work' }],
    phone: [{ value: form.phone, primary: true, label: 'work' }],
  });

  const result = await pipedriveRequest<{ id: number }>(env, '/persons', 'POST', payload);
  if (!result.ok || !result.data?.id) {
    return { ok: false, status: result.status, error: result.error };
  }
  return { ok: true, id: result.data.id, status: result.status };
}

async function createLead(
  env: ServerEnv,
  personId: number,
  form: NormalisedContactForm,
): Promise<{ ok: boolean; id?: string; status: number; error?: string }> {
  const title = `${env.leadTitlePrefix} - ${form.fullName}`.trim();
  const payload = removeEmptyValues({
    title,
    owner_id: env.pipedriveOwnerId,
    person_id: personId,
    ...buildCustomFields(env, form),
  });

  const result = await pipedriveRequest<{ id: string }>(env, '/leads', 'POST', payload);
  if (!result.ok || !result.data?.id) {
    return { ok: false, status: result.status, error: result.error };
  }
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
