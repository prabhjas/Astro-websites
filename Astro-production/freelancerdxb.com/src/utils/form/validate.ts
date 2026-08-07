import { isMeaningfulValue } from './remove-empty';

export type ContactFormInput = {
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  message?: string;
  company?: string;
  location?: string;
  country?: string;
  city?: string;
  postcode?: string;
  campaign?: string;
  campaignId?: string;
  leadSource?: string;
  formName?: string;
  formSource?: string;
  pageUrl?: string;
  referrerUrl?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
  fbclid?: string;
  msclkid?: string;
  nationality?: string;
  countryCode?: string;
  professionSector?: string;
  locPhysicalMs?: string;
  locInterestMs?: string;
  adposition?: string;
  targetId?: string;
  placement?: string;
  network?: string;
  device?: string;
  matchtype?: string;
  keyword?: string;
  creativeId?: string;
  adgroupId?: string;
  groupId?: string;
  target?: string;
  source?: string;
  firstTouchPayload?: string;
  lastTouchPayload?: string;
  firstVisitAt?: string;
  latestVisitAt?: string;
  landingPageUrl?: string;
  submissionPageUrl?: string;
  formId?: string;
  submissionId?: string;
  consent?: string | boolean;
  honeypot?: string;
  submittedAt?: string;
};

export type NormalisedContactForm = {
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string;
  company: string;
  location: string;
  country: string;
  city: string;
  postcode: string;
  campaign: string;
  campaignId: string;
  leadSource: string;
  formName: string;
  formSource: string;
  pageUrl: string;
  referrerUrl: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm: string;
  utmContent: string;
  gclid: string;
  gbraid: string;
  wbraid: string;
  fbclid: string;
  msclkid: string;
  nationality: string;
  countryCode: string;
  professionSector: string;
  locPhysicalMs: string;
  locInterestMs: string;
  adposition: string;
  targetId: string;
  placement: string;
  network: string;
  device: string;
  matchtype: string;
  keyword: string;
  creativeId: string;
  adgroupId: string;
  groupId: string;
  target: string;
  source: string;
  firstTouchPayload: string;
  lastTouchPayload: string;
  firstVisitAt: string;
  latestVisitAt: string;
  landingPageUrl: string;
  submissionPageUrl: string;
  formId: string;
  submissionId: string;
  consent: boolean;
  submittedAt: string;
};

export type ValidationResult =
  | { valid: true; data: NormalisedContactForm }
  | { valid: false; message: string; errors: Record<string, string> };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
/** Letters (any language) and spaces only — no digits or punctuation. */
const NAME_RE = /^[\p{L}\p{M}]+(?:\s+[\p{L}\p{M}]+)*$/u;

function containsLink(value: string): boolean {
  if (!value) return false;
  return (
    /https?:\/\//i.test(value) ||
    /www\./i.test(value) ||
    /\[[^\]]+\]\([^)]+\)/.test(value) ||
    /<\s*a\s/i.test(value) ||
    /(^|[\s/])[a-z0-9.-]+\.(com|net|org|io|co|info|biz|xyz|online|site|ru|cn)([/\s?]|$)/i.test(value)
  );
}

function containsHtml(value: string): boolean {
  return /<\s*\/?\s*[a-z][^>]*>/i.test(value);
}

function looksLikeSpamText(value: string): boolean {
  if (!value) return false;
  if (containsLink(value) || containsHtml(value)) return true;
  // Long runs of the same character, or mostly non-letter noise
  if (/(.)\1{7,}/.test(value)) return true;
  const letters = value.replace(/[^\p{L}]/gu, '');
  if (value.length >= 20 && letters.length / value.length < 0.35) return true;
  return false;
}

function sanitiseString(value: unknown, maxLength = 500): string {
  if (value === null || value === undefined) return '';
  const str = String(value).trim().replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  return str.slice(0, maxLength);
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

export function normaliseFormData(input: ContactFormInput): NormalisedContactForm {
  const name = sanitiseString(input.name, 200);
  const explicitFirst = sanitiseString(input.firstName, 100);
  const explicitLast = sanitiseString(input.lastName, 100);
  const derived = splitName(name);
  const firstName = explicitFirst || derived.firstName;
  const lastName = explicitLast || derived.lastName;
  const fullName = name || [firstName, lastName].filter(Boolean).join(' ').trim();

  return {
    fullName,
    firstName,
    lastName,
    email: sanitiseString(input.email, 254).toLowerCase(),
    phone: sanitiseString(input.phone, 30),
    message: sanitiseString(input.message, 5000),
    company: sanitiseString(input.company, 200),
    location: sanitiseString(input.location, 200),
    country: sanitiseString(input.country, 100),
    city: sanitiseString(input.city, 100),
    postcode: sanitiseString(input.postcode, 20),
    campaign: sanitiseString(input.campaign, 200),
    campaignId: sanitiseString(input.campaignId, 100),
    leadSource: sanitiseString(input.leadSource, 100),
    formName: sanitiseString(input.formName, 200),
    formSource: sanitiseString(input.formSource, 100),
    pageUrl: sanitiseString(input.pageUrl, 2000),
    referrerUrl: sanitiseString(input.referrerUrl, 2000),
    utmSource: sanitiseString(input.utmSource, 200),
    utmMedium: sanitiseString(input.utmMedium, 200),
    utmCampaign: sanitiseString(input.utmCampaign, 200),
    utmTerm: sanitiseString(input.utmTerm, 200),
    utmContent: sanitiseString(input.utmContent, 200),
    gclid: sanitiseString(input.gclid, 200),
    gbraid: sanitiseString(input.gbraid, 200),
    wbraid: sanitiseString(input.wbraid, 200),
    fbclid: sanitiseString(input.fbclid, 200),
    msclkid: sanitiseString(input.msclkid, 200),
    nationality: sanitiseString(input.nationality, 100),
    countryCode: sanitiseString(input.countryCode, 10),
    professionSector: sanitiseString(input.professionSector, 200),
    locPhysicalMs: sanitiseString(input.locPhysicalMs, 200),
    locInterestMs: sanitiseString(input.locInterestMs, 200),
    adposition: sanitiseString(input.adposition, 200),
    targetId: sanitiseString(input.targetId, 200),
    placement: sanitiseString(input.placement, 200),
    network: sanitiseString(input.network, 200),
    device: sanitiseString(input.device, 200),
    matchtype: sanitiseString(input.matchtype, 200),
    keyword: sanitiseString(input.keyword, 200),
    creativeId: sanitiseString(input.creativeId, 200),
    adgroupId: sanitiseString(input.adgroupId, 200),
    groupId: sanitiseString(input.groupId, 200),
    target: sanitiseString(input.target, 200),
    source: sanitiseString(input.source, 200),
    firstTouchPayload: sanitiseString(input.firstTouchPayload, 8000),
    lastTouchPayload: sanitiseString(input.lastTouchPayload, 8000),
    firstVisitAt: sanitiseString(input.firstVisitAt, 100),
    latestVisitAt: sanitiseString(input.latestVisitAt, 100),
    landingPageUrl: sanitiseString(input.landingPageUrl, 2000),
    submissionPageUrl: sanitiseString(input.submissionPageUrl, 2000),
    formId: sanitiseString(input.formId, 200),
    submissionId: sanitiseString(input.submissionId, 200),
    consent: input.consent === true || input.consent === 'true' || input.consent === '1' || input.consent === 'on',
    submittedAt: sanitiseString(input.submittedAt, 50) || new Date().toISOString(),
  };
}

export function validateContactForm(input: ContactFormInput): ValidationResult {
  if (isMeaningfulValue(input.honeypot)) {
    return {
      valid: false,
      message: 'Please provide all required information.',
      errors: { form: 'Submission rejected.' },
    };
  }

  const data = normaliseFormData(input);
  const errors: Record<string, string> = {};
  const rejectLinksMsg = 'Links are not allowed in this field.';

  if (!isMeaningfulValue(data.fullName) && !isMeaningfulValue(data.firstName)) {
    errors.name = 'Full name is required.';
  } else {
    const nameToCheck = data.fullName || [data.firstName, data.lastName].filter(Boolean).join(' ');
    if (containsLink(nameToCheck) || containsHtml(nameToCheck)) {
      errors.name = rejectLinksMsg;
    } else if (!NAME_RE.test(nameToCheck)) {
      errors.name = 'Full name must contain only letters and spaces.';
    }
  }

  if (!isMeaningfulValue(data.email)) {
    errors.email = 'Email is required.';
  } else if (!EMAIL_RE.test(data.email) || /\s/.test(data.email)) {
    errors.email = 'Please enter a valid email address.';
  } else if (containsHtml(data.email)) {
    errors.email = rejectLinksMsg;
  }

  const phoneDigits = data.phone.replace(/\D/g, '');
  if (!isMeaningfulValue(data.phone) || !phoneDigits) {
    errors.phone = 'Phone number is required.';
  }

  // Message is optional on Freelancer DXB CF7 (label says Optional).
  if (isMeaningfulValue(data.message)) {
    if (containsLink(data.message) || containsHtml(data.message)) {
      errors.message = rejectLinksMsg;
    } else if (looksLikeSpamText(data.message)) {
      errors.message = 'Please enter a valid message without links or spam content.';
    }
  }

  // Company is required when the form includes a company field (contact/service forms).
  // Blog sidebar forms omit the field — leave optional in that case.
  if (input.company !== undefined) {
    if (!isMeaningfulValue(data.company)) {
      errors.company = 'Company name is required.';
    } else if (containsLink(data.company) || containsHtml(data.company)) {
      errors.company = rejectLinksMsg;
    }
  }

  for (const [field, value] of [
    ['location', data.location],
    ['country', data.country],
    ['city', data.city],
    ['campaign', data.campaign],
  ] as const) {
    if (value && (containsLink(value) || containsHtml(value))) {
      errors[field] = rejectLinksMsg;
    }
  }

  if (Object.keys(errors).length > 0) {
    const linkBlocked = Object.values(errors).some((msg) => msg === rejectLinksMsg);
    return {
      valid: false,
      message: linkBlocked
        ? 'Links and HTML are not allowed in form fields.'
        : 'Please provide all required information.',
      errors,
    };
  }

  return { valid: true, data };
}
