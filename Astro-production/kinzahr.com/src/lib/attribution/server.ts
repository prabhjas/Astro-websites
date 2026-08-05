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

/** Fill empty form tracking fields from attribution (URL / first-last touch). */
export function mergeAttributionIntoContactForm<T extends Record<string, unknown>>(
  form: T,
  ...sources: Array<AttributionValues | null | undefined>
): T {
  const pick = (attrKey: AttributionKey, ...formKeys: string[]) => {
    for (const key of formKeys) {
      const current = form[key];
      if (typeof current === 'string' && current.trim()) return;
    }
    for (const source of sources) {
      if (!source) continue;
      const value = source[attrKey];
      if (typeof value === 'string' && value.trim()) {
        (form as Record<string, unknown>)[formKeys[0]] = value;
        return;
      }
    }
  };

  pick('gclid', 'gclid');
  pick('gbraid', 'gbraid');
  pick('wbraid', 'wbraid');
  pick('fbclid', 'fbclid');
  pick('msclkid', 'msclkid');
  pick('utm_source', 'utmSource');
  pick('utm_medium', 'utmMedium');
  pick('utm_campaign', 'utmCampaign');
  pick('utm_term', 'utmTerm');
  pick('utm_content', 'utmContent');
  pick('campaign_id', 'campaignId');
  pick('adgroup_id', 'adgroupId');
  pick('group_id', 'groupId');
  pick('creative_id', 'creativeId');
  pick('keyword', 'keyword');
  pick('matchtype', 'matchtype');
  pick('device', 'device');
  pick('network', 'network');
  pick('placement', 'placement');
  pick('target', 'targetId', 'target');
  pick('target', 'target');
  pick('adposition', 'adposition');
  pick('loc_physical_ms', 'locPhysicalMs');
  pick('loc_interest_ms', 'locInterestMs');
  pick('gad_source', 'source');
  pick('source', 'source');

  if (!(form as { targetId?: string }).targetId && (form as { target?: string }).target) {
    (form as Record<string, unknown>).targetId = (form as { target?: string }).target;
  }

  return form;
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
