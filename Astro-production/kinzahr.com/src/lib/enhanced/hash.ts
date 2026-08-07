import { createHash } from 'node:crypto';

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function normalizeEmail(email: string): string {
  const raw = String(email || '').trim().toLowerCase();
  if (!raw.includes('@')) return '';
  const parts = raw.split('@');
  if (parts.length !== 2) return '';
  let [local, domain] = parts;
  if (!local || !domain) return '';
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    local = local.replace(/\./g, '').replace(/\+.*/, '');
  }
  return `${local}@${domain}`;
}

export function hashEmail(email: string): string {
  const normalized = normalizeEmail(email);
  return normalized ? sha256(normalized) : '';
}

export function normalizePhone(phone: string, countryCode = '971'): string {
  const raw = String(phone || '').trim();
  if (!raw) return '';
  const hasLeadingPlus = raw.startsWith('+');
  let digits = raw.replace(/\D+/g, '');
  if (!digits) return '';
  if (digits.startsWith('00')) return `+${digits.slice(2)}`;
  if (hasLeadingPlus) return `+${digits}`;
  if (digits.startsWith(countryCode)) return `+${digits}`;
  if (digits.startsWith('0')) return `+${countryCode}${digits.slice(1)}`;
  return `+${countryCode}${digits}`;
}

export function hashPhone(phone: string): string {
  const normalized = normalizePhone(phone);
  return normalized ? sha256(normalized) : '';
}

export function normalizeNamePart(namePart: string): string {
  let value = String(namePart || '').trim().toLowerCase();
  if (!value) return '';
  value = value.replace(/[^\p{L}\p{N}\s]/gu, '');
  value = value.replace(/\s+/g, ' ').trim();
  return value;
}

export function splitName(fullName: string): [string, string] {
  const name = String(fullName || '').trim();
  if (!name) return ['', ''];
  const parts = name.split(/\s+/).filter(Boolean);
  if (!parts.length) return ['', ''];
  const first = parts[0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1] || '' : '';
  return [first, last];
}

export function hashNamePart(namePart: string): string {
  const normalized = normalizeNamePart(namePart);
  return normalized ? sha256(normalized) : '';
}
