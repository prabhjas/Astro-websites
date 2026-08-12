import { hashEmail, hashNamePart, hashPhone, splitName } from './hash.js';
import {
  FIELD_DOMAIN_ID,
  FIELD_GCLID,
  FIELD_STAGE_ID,
  getEnhancedJob,
  resolveDateWindow,
  type EnhancedJobConfig,
} from './jobs.js';

export type EnhancedLead = {
  deal_id: number | string;
  add_time: string;
  date: string;
  name: string;
  gclid: string;
  email: string;
  phone: string;
};

export type EnhancedRunResult = {
  ok: boolean;
  status: number;
  log: string[];
  leadsQueued: number;
  upload?: unknown;
  error?: unknown;
};

function env(name: string, fallback = ''): string {
  return String(process.env[name] || '').trim() || fallback;
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function logLine(log: string[], message: string): void {
  log.push(message);
}

function formatConversionDateTime(raw: string): string {
  const s = String(raw || '').trim();
  let d: Date;
  // Pipedrive deal add_time is UTC "YYYY-MM-DD HH:MM:SS" without zone.
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/.test(s)) {
    d = new Date(s.replace(' ', 'T') + 'Z');
  } else {
    d = new Date(s || Date.now() - 60_000);
  }
  if (Number.isNaN(d.getTime())) {
    d = new Date(Date.now() - 60_000);
  }
  // Google Ads wants "yyyy-mm-dd hh:mm:ss+00:00"
  const iso = d.toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 19)}+00:00`;
}

async function refreshGoogleAdsToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
): Promise<string> {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });
  const res = await fetch('https://accounts.google.com/o/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const json = (await res.json()) as { access_token?: string; error?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(`Error refreshing token: ${JSON.stringify(json)}`);
  }
  return json.access_token;
}

type PipedriveDeal = Record<string, unknown> & {
  id?: number | string;
  add_time?: string;
  person_name?: string;
  person_id?: {
    email?: Array<{ value?: string }>;
    phone?: Array<{ value?: string }>;
  };
};

async function fetchPipedriveDeals(args: {
  domain: string;
  apiToken: string;
  job: EnhancedJobConfig;
  startDate: string;
  endDate: string;
  log: string[];
}): Promise<EnhancedLead[]> {
  const { domain, apiToken, job, startDate, endDate, log } = args;
  const select = ['id', 'add_time', 'person_name', 'person_id', FIELD_DOMAIN_ID, FIELD_GCLID];
  if (job.stageFieldValue != null) select.push(FIELD_STAGE_ID);

  const leads: EnhancedLead[] = [];
  let start = 0;
  const limit = 200;
  let pagesFetched = 0;
  let rawDealsSeen = 0;
  let matchedDomain = 0;
  let matchedDate = 0;
  let withGclid = 0;
  let withoutGclid = 0;
  let stopPagination = false;

  const filterDesc =
    job.stageFieldValue != null
      ? `${FIELD_DOMAIN_ID}=${job.domainFieldValue} AND ${FIELD_STAGE_ID}=${job.stageFieldValue}`
      : `${FIELD_DOMAIN_ID}=${job.domainFieldValue} (all leads, gclid optional)`;
  logLine(log, `Window: ${startDate} to ${endDate}\nFilter: ${filterDesc}`);

  do {
    pagesFetched += 1;
    const url = new URL(`https://${domain}/v1/deals`);
    url.searchParams.set('api_token', apiToken);
    url.searchParams.set('start', String(start));
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('status', 'all_not_deleted');
    url.searchParams.set('sort', 'add_time DESC');
    url.searchParams.set('select', select.join(','));

    logLine(log, `[DEBUG] Fetching page ${pagesFetched} | start=${start} | limit=${limit}`);
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) {
      logLine(log, `Pipedrive error: HTTP ${res.status} for deals list`);
      break;
    }
    const json = (await res.json()) as {
      data?: PipedriveDeal[] | null;
      additional_data?: { pagination?: { more_items_in_collection?: boolean; next_start?: number } };
    };
    if (!json.data?.length) break;

    const pageDeals = json.data.length;
    rawDealsSeen += pageDeals;
    logLine(log, `[DEBUG] Page ${pagesFetched} returned ${pageDeals} deals.`);

    for (const deal of json.data) {
      if (!deal.add_time || deal[FIELD_DOMAIN_ID] == null) continue;
      if (job.stageFieldValue != null && deal[FIELD_STAGE_ID] == null) continue;

      const ts = Date.parse(String(deal.add_time).replace(' ', 'T') + 'Z');
      if (Number.isNaN(ts)) continue;
      const dealDate = new Date(ts).toISOString().slice(0, 10);

      if (dealDate < startDate) {
        stopPagination = true;
        break;
      }

      if (Number(deal[FIELD_DOMAIN_ID]) !== job.domainFieldValue) continue;
      matchedDomain += 1;

      if (job.stageFieldValue != null && Number(deal[FIELD_STAGE_ID]) !== job.stageFieldValue) continue;

      if (dealDate < startDate || dealDate > endDate) continue;
      matchedDate += 1;

      const gclid = String(deal[FIELD_GCLID] ?? '');
      if (!gclid) withoutGclid += 1;
      else withGclid += 1;

      const person = deal.person_id && typeof deal.person_id === 'object' ? deal.person_id : {};
      const email = person.email?.[0]?.value || '';
      const phone = person.phone?.[0]?.value || '';

      const lead: EnhancedLead = {
        deal_id: deal.id ?? '',
        add_time: String(deal.add_time),
        date: dealDate,
        name: String(deal.person_name || ''),
        gclid,
        email,
        phone,
      };
      leads.push(lead);
      logLine(
        log,
        `Deal #${lead.deal_id} | ${lead.date} | GCLID=${lead.gclid || 'N/A'} | Name=${lead.name || 'N/A'} | Email=${lead.email || 'N/A'} | Phone=${lead.phone || 'N/A'}`,
      );
    }

    const pagination = json.additional_data?.pagination || {};
    const more = Boolean(pagination.more_items_in_collection);
    const nextStart = pagination.next_start;
    logLine(
      log,
      `[DEBUG] Page ${pagesFetched} done | more_items=${more ? 'yes' : 'no'} | next_start=${nextStart ?? 'null'}`,
    );
    if (stopPagination) {
      logLine(log, `[DEBUG] Early stop triggered: reached data older than ${startDate}.`);
      break;
    }
    if (!more || nextStart == null) break;
    start = nextStart;
  } while (true);

  logLine(log, `Total filtered deals: ${leads.length}`);
  logLine(
    log,
    `[DEBUG] Summary:\nRaw deals scanned: ${rawDealsSeen}\nMatched domain(${job.domainFieldValue}): ${matchedDomain}\nMatched date window: ${matchedDate}\nWith gclid: ${withGclid}\nWithout gclid: ${withoutGclid}\nFinal leads queued: ${leads.length}`,
  );
  return leads;
}

async function uploadClickConversions(args: {
  leads: EnhancedLead[];
  customerId: string;
  conversionAction: string;
  developerToken: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  accessTokenHint: string;
  log: string[];
}): Promise<{ ok: boolean; httpCode: number; body: unknown; error?: unknown }> {
  const {
    leads,
    customerId,
    conversionAction,
    developerToken,
    clientId,
    clientSecret,
    refreshToken,
    log,
  } = args;

  logLine(log, '[DEBUG] Refreshing Google Ads access token...');
  const accessToken = await refreshGoogleAdsToken(clientId, clientSecret, refreshToken);

  const conversions = [];
  let withGclid = 0;
  let withIdentifiers = 0;
  let skippedEmpty = 0;

  for (const lead of leads) {
    const userIdentifiers: Array<Record<string, unknown>> = [];
    if (lead.email) {
      const hashedEmail = hashEmail(lead.email);
      if (hashedEmail) userIdentifiers.push({ hashed_email: hashedEmail });
    }
    if (lead.phone) {
      const hashedPhone = hashPhone(lead.phone);
      if (hashedPhone) userIdentifiers.push({ hashed_phone_number: hashedPhone });
    }
    if (lead.name) {
      const [firstNameRaw, lastNameRaw] = splitName(lead.name);
      const addressInfo: Record<string, string> = {};
      const hashedFirstName = hashNamePart(firstNameRaw);
      const hashedLastName = hashNamePart(lastNameRaw);
      if (hashedFirstName) addressInfo.hashed_first_name = hashedFirstName;
      if (hashedLastName) addressInfo.hashed_last_name = hashedLastName;
      if (Object.keys(addressInfo).length) userIdentifiers.push({ address_info: addressInfo });
    }

    // Click upload needs gclid and/or user identifiers — skip empty rows (Ads fieldError REQUIRED).
    if (!lead.gclid && userIdentifiers.length === 0) {
      skippedEmpty += 1;
      continue;
    }

    const conversion: Record<string, unknown> = {
      conversion_action: conversionAction,
      conversion_date_time: formatConversionDateTime(lead.add_time),
    };
    if (lead.gclid) {
      conversion.gclid = lead.gclid;
      withGclid += 1;
    }
    if (userIdentifiers.length) {
      conversion.user_identifiers = userIdentifiers;
      withIdentifiers += 1;
    }
    conversions.push(conversion);
  }

  logLine(
    log,
    `[DEBUG] Prepared conversions: ${conversions.length} | with_gclid=${withGclid} | with_user_identifiers=${withIdentifiers} | skipped_empty=${skippedEmpty}`,
  );
  if (conversions[0]) {
    logLine(log, `[DEBUG] First conversion sample:\n${JSON.stringify(conversions[0], null, 2)}`);
  }

  if (conversions.length === 0) {
    logLine(log, 'No uploadable conversions after filtering (need gclid and/or user identifiers).');
    return { ok: true, httpCode: 200, body: { skipped: true, reason: 'no_uploadable_conversions' } };
  }

  const url = `https://googleads.googleapis.com/v24/customers/${customerId}:uploadClickConversions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'developer-token': developerToken,
    },
    body: JSON.stringify({ conversions, partial_failure: true }),
  });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* keep text */
  }
  logLine(log, `[DEBUG] Google Ads API Response:\n${typeof body === 'string' ? body : JSON.stringify(body, null, 2)}\nHTTP Code: ${res.status}`);

  if (!res.ok) {
    return { ok: false, httpCode: res.status, body, error: body };
  }
  // Google returns HTTP 200 with partialFailureError when some rows fail (expired clicks, etc.).
  // Treat as job success with warnings so cron/curl -f are not false negatives.
  if (body && typeof body === 'object' && body !== null && 'partialFailureError' in body) {
    const partial = (body as { partialFailureError?: { message?: string } }).partialFailureError;
    logLine(
      log,
      `Partial failure (some conversions rejected by Google Ads):\n${partial?.message || JSON.stringify(partial)}`,
    );
    return { ok: true, httpCode: 200, body, error: partial?.message || partial };
  }
  return { ok: true, httpCode: res.status, body };
}

export type EnhancedDateOverride = {
  start: string;
  end: string;
};

function parseIsoDate(value: string): string | null {
  const s = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) return null;
  return s;
}

/** Optional YYYY-MM-DD override (query ?start=&end= or env ENHANCED_WINDOW_START/END). */
export function resolveEnhancedDateRange(
  job: EnhancedJobConfig,
  override?: EnhancedDateOverride,
): { start: string; end: string } {
  const envStart = parseIsoDate(env('ENHANCED_WINDOW_START'));
  const envEnd = parseIsoDate(env('ENHANCED_WINDOW_END'));
  const start = parseIsoDate(override?.start || '') || envStart;
  const end = parseIsoDate(override?.end || '') || envEnd;
  if (start && end) {
    if (start > end) return { start: end, end: start };
    return { start, end };
  }
  return resolveDateWindow(job.dateWindow);
}

export async function runEnhancedJob(
  fileName: string,
  dateOverride?: EnhancedDateOverride,
): Promise<EnhancedRunResult> {
  const log: string[] = [];
  const job = getEnhancedJob(fileName);
  if (!job) {
    return { ok: false, status: 404, log: [`Unknown enhanced job: ${fileName}`], leadsQueued: 0 };
  }

  let domain = env('PIPEDRIVE_COMPANY_DOMAIN', env('ENHANCED_PIPEDRIVE_DOMAIN', 'connectgroup2'));
  if (domain && !domain.includes('.')) domain = `${domain}.pipedrive.com`;

  const apiToken = env('PIPEDRIVE_API_TOKEN', env('ENHANCED_PIPEDRIVE_API_TOKEN'));
  const customerId = env('GOOGLE_ADS_CUSTOMER_ID', env('ENHANCED_GOOGLE_ADS_CUSTOMER_ID', job.defaultCustomerId));
  const conversionAction = env(
    'GOOGLE_ADS_CONVERSION_ACTION',
    env('ENHANCED_GOOGLE_ADS_CONVERSION_ACTION', job.defaultConversionAction),
  );
  const developerToken = env('GOOGLE_ADS_DEVELOPER_TOKEN');
  const clientId = env('GOOGLE_ADS_CLIENT_ID');
  const clientSecret = env('GOOGLE_ADS_CLIENT_SECRET');
  const refreshToken = env('GOOGLE_ADS_REFRESH_TOKEN');
  const accessTokenHint = env('GOOGLE_ADS_ACCESS_TOKEN');

  if (!apiToken || !customerId || !clientId || !clientSecret || !refreshToken || !conversionAction || !developerToken) {
    return {
      ok: false,
      status: 500,
      leadsQueued: 0,
      log: [
        'Missing required env for enhanced conversion upload.',
        'Need: PIPEDRIVE_API_TOKEN, GOOGLE_ADS_CUSTOMER_ID (or job default), GOOGLE_ADS_DEVELOPER_TOKEN,',
        'GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_REFRESH_TOKEN,',
        'GOOGLE_ADS_CONVERSION_ACTION (or job default).',
      ],
    };
  }

  logLine(log, `Job: ${job.label} (${job.id})`);
  const { start, end } = resolveEnhancedDateRange(job, dateOverride);
  if (dateOverride?.start || dateOverride?.end || env('ENHANCED_WINDOW_START') || env('ENHANCED_WINDOW_END')) {
    logLine(log, `[BACKFILL] Using explicit window override: ${start} to ${end}`);
  }

  try {
    const leads = await fetchPipedriveDeals({
      domain,
      apiToken,
      job,
      startDate: start,
      endDate: end,
      log,
    });

    const upload = await uploadClickConversions({
      leads,
      customerId,
      conversionAction,
      developerToken,
      clientId,
      clientSecret,
      refreshToken,
      accessTokenHint,
      log,
    });

    if (!upload.ok) {
      logLine(log, `Error:\n${typeof upload.error === 'string' ? upload.error : JSON.stringify(upload.error, null, 2)}\nHTTP Code: ${upload.httpCode}`);
      return { ok: false, status: 500, log, leadsQueued: leads.length, upload: upload.body, error: upload.error };
    }

    if (upload.error) {
      logLine(
        log,
        `Conversions uploaded with partial Ads warnings (HTTP 200).\n${conversionAction}\nLeads sent: ${leads.length}`,
      );
    } else {
      logLine(log, `Conversions uploaded successfully!\n${conversionAction}\nLeads sent: ${leads.length}`);
    }
    return { ok: true, status: 200, log, leadsQueued: leads.length, upload: upload.body, error: upload.error };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logLine(log, `Error: ${message}`);
    return { ok: false, status: 500, log, leadsQueued: 0, error: message };
  }
}

/** HTML debug page matching the old PHP output shape (escaped). */
export function formatEnhancedHtml(result: EnhancedRunResult): string {
  const body = result.log.map((line) => `<pre>${escapeHtml(line)}</pre>`).join('\n');
  return `<!doctype html><html><head><meta charset="utf-8"><title>Enhanced conversion job</title></head><body>${body}</body></html>`;
}
