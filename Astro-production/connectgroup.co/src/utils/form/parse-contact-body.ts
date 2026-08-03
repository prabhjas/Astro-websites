import type { ContactFormInput } from './validate';
import { isMeaningfulValue } from './remove-empty';

function findFieldValue(raw: Record<string, FormDataEntryValue>, prefix: string): string | undefined {
  if (raw[prefix] && typeof raw[prefix] === 'string') return raw[prefix];
  for (const [key, value] of Object.entries(raw)) {
    if (key.startsWith(prefix) && typeof value === 'string' && isMeaningfulValue(value)) {
      return value;
    }
  }
  return undefined;
}

function findCountryCode(raw: Record<string, FormDataEntryValue>): string | undefined {
  for (const [key, value] of Object.entries(raw)) {
    if (key.includes('country-code') && typeof value === 'string' && isMeaningfulValue(value)) {
      return value;
    }
  }
  return undefined;
}

function buildMessage(
  get: (key: string) => string | undefined,
): string | undefined {
  const message = get('message') ?? get('your-message');
  const subject = get('your-subject') ?? get('subject');
  if (subject && message) return `Subject: ${subject}\n\n${message}`;
  if (subject) return `Subject: ${subject}`;
  return message;
}

export function parseContactFormBody(
  raw: Record<string, FormDataEntryValue>,
  arrays: Record<string, string[]> = {},
): ContactFormInput {
  const get = (key: string) => {
    const value = raw[key];
    return typeof value === 'string' ? value : undefined;
  };

  const experience = arrays.experience?.filter(Boolean).join(', ');

  return {
    name: get('name') ?? get('full-name') ?? get('full_name') ?? get('your-name'),
    firstName: get('firstName') ?? get('first_name'),
    lastName: get('lastName') ?? get('last_name'),
    email: get('email') ?? get('your-email'),
    phone: get('phone') ?? findFieldValue(raw, 'phonetext'),
    message: buildMessage(get),
    company: get('company'),
    location: get('location') ?? get('countrytext-787'),
    country: get('country') ?? get('countrytext-787'),
    city: get('city'),
    postcode: get('postcode'),
    campaign: get('campaign') ?? get('your-subject'),
    campaignId: get('campaignId') ?? get('campaign_id') ?? get('campaignid') ?? get('gad_campaignid'),
    leadSource: get('leadSource') ?? get('lead_source'),
    formName: get('formName') ?? get('form_name'),
    formSource: get('formSource') ?? get('form_source'),
    pageUrl: get('pageUrl') ?? get('page_url'),
    referrerUrl: get('referrerUrl') ?? get('referrer_url') ?? get('initial_url'),
    utmSource: get('utmSource') ?? get('utm_source'),
    utmMedium: get('utmMedium') ?? get('utm_medium'),
    utmCampaign: get('utmCampaign') ?? get('utm_campaign'),
    utmTerm: get('utmTerm') ?? get('utm_term'),
    utmContent: get('utmContent') ?? get('utm_content'),
    gclid: get('gclid'),
    gbraid: get('gbraid'),
    wbraid: get('wbraid'),
    fbclid: get('fbclid'),
    msclkid: get('msclkid'),
    nationality: get('nationality'),
    countryCode: get('countryCode') ?? get('country_code') ?? get('phone-country-code') ?? findCountryCode(raw),
    professionSector: get('professionSector') ?? get('profession_sector') ?? experience,
    locPhysicalMs: get('locPhysicalMs') ?? get('loc_physical_ms') ?? get('locphysicalms'),
    locInterestMs: get('locInterestMs') ?? get('loc_interest_ms') ?? get('locinterestms'),
    adposition: get('adposition') ?? get('ad_position'),
    targetId: get('targetId') ?? get('target_id') ?? get('targetid') ?? get('target'),
    placement: get('placement'),
    network: get('network'),
    device: get('device'),
    matchtype: get('matchtype'),
    keyword: get('keyword') ?? get('kw') ?? get('q'),
    creativeId: get('creativeId') ?? get('creative_id') ?? get('creativeid') ?? get('creative'),
    adgroupId: get('adgroupId') ?? get('adgroup_id') ?? get('adgroupid'),
    groupId: get('groupId') ?? get('group_id') ?? get('groupid'),
    target: get('target') ?? get('targetid') ?? get('target_id'),
    source: get('source') ?? get('gad_source') ?? get('gadsource'),
    firstTouchPayload: get('firstTouchPayload') ?? get('first_touch_payload'),
    lastTouchPayload: get('lastTouchPayload') ?? get('last_touch_payload'),
    firstVisitAt: get('firstVisitAt') ?? get('first_visit_at'),
    latestVisitAt: get('latestVisitAt') ?? get('latest_visit_at'),
    landingPageUrl: get('landingPageUrl') ?? get('landing_page_url') ?? get('initial_url'),
    submissionPageUrl: get('submissionPageUrl') ?? get('submission_page_url') ?? get('page_url'),
    formId: get('formId') ?? get('form_id'),
    submissionId: get('submissionId') ?? get('submission_id'),
    consent: get('consent'),
    honeypot: get('website') ?? get('honeypot'),
    submittedAt: get('submittedAt') ?? get('submitted_at'),
  };
}
