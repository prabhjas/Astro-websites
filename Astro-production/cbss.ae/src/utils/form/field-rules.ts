/**
 * Shared contact-form field rules used by server validation.
 * Keep client-side regexes in SiteScripts in sync with these helpers.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
/** Letters (incl. accents), spaces, apostrophe, hyphen only */
const PERSON_NAME_RE = /^[\p{L}][\p{L}\s'.-]{1,79}$/u;
const PHONE_RE = /^\+?[\d\s().-]{7,25}$/;
const URL_RE =
  /(?:https?:\/\/|www\.|\/\/)|(?:[a-z0-9-]+\.)+(?:com|net|org|io|co|ae|uk|info|biz|xyz|online|site|app|dev|me|tv|cc|ru|cn|in|pk|sa|de|fr|es|it|nl|ca|au|us)(?:\/|\b)|(?:mailto:|ftp:)/i;

export function containsUrlOrLink(value: string): boolean {
  const text = String(value || '').trim();
  if (!text) return false;
  return URL_RE.test(text);
}

export function isValidPersonName(value: string): boolean {
  const name = String(value || '').trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 80) return false;
  if (containsUrlOrLink(name)) return false;
  if (/\d/.test(name)) return false;
  if (!PERSON_NAME_RE.test(name)) return false;
  // Reject repeated spam characters / nonsense
  if (/(.)\1{4,}/.test(name)) return false;
  return true;
}

export function isValidEmail(value: string): boolean {
  const email = String(value || '').trim().toLowerCase();
  if (!email || email.length > 254) return false;
  if (/\s/.test(email) || email.includes('..')) return false;
  return EMAIL_RE.test(email);
}

export function isValidPhone(value: string): boolean {
  const phone = String(value || '').trim();
  if (!phone) return false;
  // Numbers only — reject letters/text; allow common phone punctuation.
  if (/[a-zA-Z]/.test(phone)) return false;
  if (/[^\d\s+().-]/.test(phone)) return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

export function isValidFreeText(value: string, opts?: { required?: boolean; maxLength?: number }): {
  ok: boolean;
  message?: string;
} {
  const text = String(value || '').trim();
  const required = opts?.required ?? false;
  const maxLength = opts?.maxLength ?? 5000;
  if (!text) {
    return required ? { ok: false, message: 'This field is required.' } : { ok: true };
  }
  if (text.length > maxLength) {
    return { ok: false, message: `Must be ${maxLength} characters or fewer.` };
  }
  if (containsUrlOrLink(text)) {
    return { ok: false, message: 'Links and URLs are not allowed.' };
  }
  return { ok: true };
}

export const FIELD_RULES = {
  EMAIL_RE,
  PERSON_NAME_RE,
  PHONE_RE,
  URL_RE,
};
