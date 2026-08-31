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

type PipedriveFieldKeys = ServerEnv['fieldKeys'];

/** Connect Group shared deal-field hashes (cbss.ae / redo.ae). Used when env omits PIPEDRIVE_FIELD_* . */
const CONNECT_GROUP_FIELD_KEYS: PipedriveFieldKeys = {
  message: '3a108ee6cdcaad880546876dd524bfa9aa686da7',
  source: '296a2c3746355d2b33b7ff392bd038199eaf9665',
  website: 'af2182f3f2ee03a51c7dcfd898951a268787343c',
  leadSubmittedOn: '1b6c5556b8f2796d4a87d842248152f78384ac37',
  userLandedOn: 'da1c7e07576ae835e0cf337b831ab2db59d64707',
  nationality: 'ef20fc32751f00f294ca3c35003b908ba0ad42a4',
  countryCode: '4c0ac56cd5cca4ff7d5996b692608d5b82ea9dc6',
  companyName: 'b311a9a442b96abcecc6fbd254b977287a54feac',
  professionSector: 'fa0d863f0fdfdbb2a7b39519208841b18b256006',
  locPhysicalMs: '872ba697d4548d943f25d247fa955ac99407d7a5',
  locInterestMs: '7d77301b889aa6f07f8858bf5662c450fc36b4d9',
  adposition: '3dcaf84909978d5167a9bab13e754eccfc6d39d1',
  targetId: '04057083817af90abe314fd48f0f856ea52652c0',
  placement: '53d1db8286116e3a52f6bb5ad28c6cfab5b170ac',
  network: 'e2ea3701d1c42e64ea160bd0c74989996475c51d',
  device: '9c13a77c0d5cb7f5bdb1a3c63d784d88b5555029',
  matchtype: '416eeb319125d90c7a0b9b37fdf7576bc9eae70b',
  keyword: '48a9a6f7ff7347062221a840ff955bae94b19d5e',
  creativeId: 'cb7ffc625c3a3e6c1b04e9b1d9860559f0ecd480',
  campaignId: 'b8da9d1e02468bc3b9e62958fd86a1fa61d4c215',
  adgroupId: 'c8b52df3a6c58f5ecf129b2c73db8830b5c5167e',
  gclid: 'd3a15df8cde497d2eb39515f9488f681440cca92',
  utmSource: '',
  utmMedium: '',
  utmCampaign: '',
  utmTerm: '',
  utmContent: '',
  fbclid: '',
  location: '',
  campaign: '',
};

function resolveFieldKeys(env: ServerEnv): PipedriveFieldKeys {
  const keys = env.fieldKeys;
  if (keys.message.trim()) return keys;
  return CONNECT_GROUP_FIELD_KEYS;
}

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

  const tracking: string[] = [];
  if (form.pageUrl) tracking.push(`Submitted from: ${form.pageUrl}`);
  if (form.landingPageUrl) tracking.push(`Landed on: ${form.landingPageUrl}`);
  if (form.gclid) tracking.push(`GCLID: ${form.gclid}`);
  if (form.utmSource) tracking.push(`UTM source: ${form.utmSource}`);
  if (form.utmMedium) tracking.push(`UTM medium: ${form.utmMedium}`);
  if (form.utmCampaign) tracking.push(`UTM campaign: ${form.utmCampaign}`);
  if (form.utmTerm) tracking.push(`UTM term: ${form.utmTerm}`);
  if (form.utmContent) tracking.push(`UTM content: ${form.utmContent}`);
  if (form.campaignId || form.campaign) {
    tracking.push(`Campaign ID: ${form.campaignId || form.campaign}`);
  }
  if (form.keyword) tracking.push(`Keyword: ${form.keyword}`);
  if (tracking.length) {
    lines.push('', '=== Tracking ===', ...tracking);
  }

  return lines.join('\n');
}

function buildCustomFields(env: ServerEnv, form: NormalisedContactForm): Record<string, unknown> {
  const keys = resolveFieldKeys(env);
  const fields: Record<string, unknown> = {};

  const set = (key: string | undefined, value: unknown) => {
    if (key && value !== undefined && value !== null && value !== '') fields[key] = value;
  };

  set(keys.message, buildFormMessage(form));
  set(keys.source, env.pipedriveLeadSourceId || undefined);
  set(keys.website, env.websiteId || undefined);
  set(keys.leadSubmittedOn, form.pageUrl ? `Lead Submitted On: ${form.pageUrl}` : undefined);
  set(keys.userLandedOn, form.landingPageUrl ? `User Landed on: ${form.landingPageUrl}` : undefined);
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
