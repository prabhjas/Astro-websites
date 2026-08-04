import {
  ATTRIBUTION_KEY_ALIASES,
  ATTRIBUTION_PRIMARY_KEYS,
  type AttributionKey,
  type AttributionValues,
} from './config';

function sanitiseAttributionValue(value: unknown, maxLength = 512): string {
  if (value === null || value === undefined) return '';
  return String(value).trim().replace(/[\x00-\x1F\x7F]/g, '').slice(0, maxLength);
}

function sanitiseUrl(value: unknown): string {
  return sanitiseAttributionValue(value, 2000);
}

function pickAttributionValue(source: Record<string, unknown>, key: AttributionKey): string {
  const aliases = ATTRIBUTION_KEY_ALIASES[key] || [key];
  for (const alias of aliases) {
    const value = sanitiseAttributionValue(source[alias]);
    if (value) return value;
  }
  return '';
}

export function normaliseAttribution(source: Record<string, unknown>): AttributionValues {
  const values: AttributionValues = {};
  for (const key of ATTRIBUTION_PRIMARY_KEYS) {
    const value = pickAttributionValue(source, key);
    if (value) values[key] = value;
  }

  const referrer = sanitiseUrl(source.referrer ?? source.referrer_url);
  const landingPageUrl = sanitiseUrl(source.landing_page_url ?? source.initial_url);
  const submissionPageUrl = sanitiseUrl(source.submission_page_url ?? source.page_url);
  const formId = sanitiseAttributionValue(source.form_id, 200);
  const formName = sanitiseAttributionValue(source.form_name, 200);
  const firstVisitAt = sanitiseAttributionValue(source.first_visit_at, 100);
  const latestVisitAt = sanitiseAttributionValue(source.latest_visit_at, 100);

  if (referrer) values.referrer = referrer;
  if (landingPageUrl) values.landing_page_url = landingPageUrl;
  if (submissionPageUrl) values.submission_page_url = submissionPageUrl;
  if (formId) values.form_id = formId;
  if (formName) values.form_name = formName;
  if (firstVisitAt) values.first_visit_at = firstVisitAt;
  if (latestVisitAt) values.latest_visit_at = latestVisitAt;

  return values;
}

export function deriveAttributionFromRequest(request: Request): AttributionValues {
  const referer = request.headers.get('referer') || '';
  return normaliseAttribution({
    referrer: request.headers.get('origin') || '',
    referrer_url: referer,
    submission_page_url: referer,
  });
}

/** Pull Ads/UTM query params from a page URL when form hidden fields were empty. */
export function attributionFromPageUrl(pageUrl: string | undefined): AttributionValues {
  if (!pageUrl) return {};
  try {
    const url = new URL(pageUrl, 'http://localhost');
    const source: Record<string, unknown> = {
      landing_page_url: pageUrl,
      submission_page_url: pageUrl,
    };
    for (const key of ATTRIBUTION_PRIMARY_KEYS) {
      const aliases = ATTRIBUTION_KEY_ALIASES[key] || [key];
      for (const alias of aliases) {
        const value = sanitiseAttributionValue(url.searchParams.get(alias));
        if (value) {
          source[key] = value;
          break;
        }
      }
    }
    return normaliseAttribution(source);
  } catch {
    return {};
  }
}

