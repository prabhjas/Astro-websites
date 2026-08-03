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

const EMAIL_RE = /^[a-z0-9](?:[a-z0-9._%+-]*[a-z0-9])?@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z]{2,})+$/i;
/** Letters, spaces, apostrophes and hyphens only — no dots (blocks xyz.com). */
const NAME_RE = /^[\p{L}]+(?:[\s'-]+[\p{L}]+)*$/u;
/** Matches hostnames / domains like xyz.com or foo.co.uk */
const DOMAIN_LIKE_RE = /\b[\p{L}\d][\p{L}\d-]*\.[\p{L}]{2,}(?:\.[\p{L}]{2,})*\b/iu;

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

export function isValidPersonName(value: string): boolean {
  const name = value.trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 100) return false;
  if (/@/.test(name) || /\d/.test(name) || /\./.test(name)) return false;
  if (/https?:\/\//i.test(name) || /www\./i.test(name)) return false;
  if (DOMAIN_LIKE_RE.test(name)) return false;
  if (!NAME_RE.test(name)) return false;
  if (!/[\p{L}]/u.test(name)) return false;
  return true;
}

export function isValidEmailAddress(value: string): boolean {
  const email = value.trim().toLowerCase();
  if (!email || email.length > 254) return false;
  // Require a real mailbox — reject bare domains like "xyz.com"
  if (!email.includes('@')) return false;
  if (!EMAIL_RE.test(email)) return false;
  if (email.includes('..')) return false;
  const [local, domain] = email.split('@');
  if (!local || !domain) return false;
  if (local.startsWith('.') || local.endsWith('.')) return false;
  if (!domain.includes('.')) return false;
  return true;
}

export function isValidPhoneNumber(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
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
  const nameValue = data.fullName || [data.firstName, data.lastName].filter(Boolean).join(' ').trim();

  if (!isMeaningfulValue(nameValue)) {
    errors.name = 'Your name is required.';
  } else if (!isValidPersonName(nameValue)) {
    errors.name = 'Please enter a valid name.';
  }

  if (!isMeaningfulValue(data.email)) {
    errors.email = 'A valid email address is required.';
  } else if (!isValidEmailAddress(data.email)) {
    errors.email = 'Please enter a valid email address.';
  }

  if (!isMeaningfulValue(data.phone)) {
    errors.phone = 'A valid phone number is required.';
  } else if (!isValidPhoneNumber(data.phone)) {
    errors.phone = 'Please enter a valid phone number.';
  }

  if (!isMeaningfulValue(data.message)) {
    errors.message = 'A message is required.';
  }

  if (Object.keys(errors).length > 0) {
    return {
      valid: false,
      message: 'Please provide all required information.',
      errors,
    };
  }

  return { valid: true, data };
}
