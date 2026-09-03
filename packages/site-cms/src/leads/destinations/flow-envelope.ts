import type { LeadSubmissionRecord } from '../types.js';

/**
 * Maps a stored lead into Flow's ingest envelope.
 *
 * Deliberately NOT the Pipedrive payload shape: that is built from per-account
 * custom-field hashes, which are unreadable and break silently if a field is
 * recreated. This envelope is self-describing and versioned.
 *
 * `consent` is omitted on purpose. Our forms carry a terms-agreement checkbox,
 * not Google consent-mode signals, and it defaults to false when absent. Flow
 * treats an omitted key as "never asked" and `false` as "refused" — sending our
 * checkbox would record a refusal that never happened, and that feeds the later
 * offline-conversion upload.
 */

export const FLOW_SCHEMA_VERSION = 1;

type Json = Record<string, unknown>;

function clean(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const s = String(value).trim();
  return s.length ? s : undefined;
}

/** Drop empty members so the body stays small and Flow stores no blank fields. */
function compact(object: Json): Json | undefined {
  const out: Json = {};
  for (const [k, v] of Object.entries(object)) {
    if (v === undefined || v === null) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v as Json).length === 0) continue;
    out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

export type FlowEnvelopeOptions = {
  siteId: string;
  siteDomain?: string;
  /** Flow's ceiling. The body is trimmed to fit rather than risk a permanent 413. */
  maxBodyBytes?: number;
};

export function buildFlowEnvelope(record: LeadSubmissionRecord, options: FlowEnvelopeOptions): Json {
  const p = (record.payload || {}) as Json;
  const first = record.firstTouchPayload || {};
  const last = record.lastTouchPayload || {};

  const envelope: Json = {
    schema_version: FLOW_SCHEMA_VERSION,
    idempotency_key: record.publicId,
    site_id: options.siteId,
    site_domain: options.siteDomain,
    submitted_at: clean(p.submittedAt) || record.createdAt,
    form: compact({
      id: record.formId,
      name: record.formName,
      source: clean(p.formSource),
    }),
    contact: compact({
      full_name: clean(p.fullName),
      first_name: clean(p.firstName),
      last_name: clean(p.lastName),
      email: clean(p.email),
      phone: clean(p.phone),
      country_code: clean(p.countryCode),
      nationality: clean(p.nationality),
      company: clean(p.company),
      location: clean(p.location),
      profession_sector: clean(p.professionSector),
      message: clean(p.message),
    }),
    attribution: compact({
      first_touch: compact({ ...first }),
      last_touch: compact({ ...last }),
      landing_page_url: clean(record.landingPageUrl),
      submission_page_url: clean(record.submissionPageUrl),
      referrer_url: clean(record.referrerUrl),
    }),
    click_ids: compact({
      gclid: clean(record.gclid),
      gbraid: clean(record.gbraid),
      wbraid: clean(record.wbraid),
      fbclid: clean(record.fbclid),
      msclkid: clean(record.msclkid),
    }),
    campaign: compact({
      utm_source: clean(record.utmSource),
      utm_medium: clean(record.utmMedium),
      utm_campaign: clean(record.utmCampaign),
      utm_term: clean(record.utmTerm),
      utm_content: clean(record.utmContent),
      campaign_id: clean(record.campaignId),
      adgroup_id: clean(record.adgroupId),
      creative_id: clean(record.creativeId),
      keyword: clean(record.keyword),
      matchtype: clean(record.matchtype),
      device: clean(record.device),
      network: clean(record.network),
      placement: clean(record.placement),
    }),
    // consent: deliberately omitted - see the note above.
  };

  return compact(envelope) as Json;
}

/**
 * Serialise once, and only once: the signature is taken over these exact bytes,
 * so the caller must send this string rather than re-encoding the object.
 *
 * Our contact route accepts bodies up to 32 KB but Flow's ceiling is 15,360 and
 * an oversize body is a permanent 413. Rather than lose the lead, the visitor's
 * message is trimmed until the envelope fits, and the fact is recorded in the
 * body so nobody later mistakes a trimmed message for what was typed.
 */
export function serialiseFlowEnvelope(envelope: Json, maxBodyBytes = 15360): { body: string; trimmed: boolean } {
  let body = JSON.stringify(envelope);
  if (Buffer.byteLength(body, 'utf8') <= maxBodyBytes) return { body, trimmed: false };

  const contact = (envelope.contact as Json | undefined) ?? undefined;
  if (!contact || typeof contact.message !== 'string') return { body, trimmed: false };

  const NOTICE = '\n[message truncated to fit the ingest limit]';
  const message = String(contact.message);

  // Measure rather than estimate: JSON escaping and the added flag both change
  // the encoded length, so a fixed byte reserve is wrong by an amount that
  // depends on the message's own content.
  const build = (keep: number): string =>
    JSON.stringify({
      ...envelope,
      contact: { ...contact, message: message.slice(0, keep) + NOTICE },
      message_truncated: true,
    });

  let low = 0;
  let high = message.length;
  let best = build(0);
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const candidate = build(mid);
    if (Buffer.byteLength(candidate, 'utf8') <= maxBodyBytes) {
      best = candidate;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return { body: best, trimmed: true };
}
