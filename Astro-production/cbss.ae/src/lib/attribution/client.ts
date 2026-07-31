import {
  ATTRIBUTION_COOKIE_KEYS,
  ATTRIBUTION_KEY_ALIASES,
  ATTRIBUTION_PRIMARY_KEYS,
  ATTRIBUTION_RETENTION_DAYS,
  ATTRIBUTION_STORAGE_KEYS,
  type AttributionKey,
  type AttributionValues,
} from './config';

function getAllParams(): URLSearchParams {
  const q = new URLSearchParams(window.location.search || '');
  const h = new URLSearchParams((window.location.hash || '').replace(/^#\??/, ''));
  const combined = new URLSearchParams();

  q.forEach((value, key) => combined.set(key, value));
  h.forEach((value, key) => {
    if (!combined.has(key)) combined.set(key, value);
  });

  return combined;
}

function sanitiseValue(value: unknown, maxLength = 512): string {
  if (value === null || value === undefined) return '';
  return String(value).trim().replace(/[\x00-\x1F\x7F]/g, '').slice(0, maxLength);
}

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function setCookie(name: string, value: string, days: number): void {
  if (!value) return;
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax${secure}`;
}

function getCookie(name: string): string {
  const nameEq = `${name}=`;
  const parts = document.cookie.split(';');
  for (const raw of parts) {
    const c = raw.trim();
    if (c.startsWith(nameEq)) return decodeURIComponent(c.slice(nameEq.length));
  }
  return '';
}

function setStorageValue(key: string, value: AttributionValues): void {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function getStorageValue(key: string): AttributionValues {
  return safeJsonParse<AttributionValues>(window.localStorage.getItem(key)) || {};
}

function getParamValue(params: URLSearchParams, key: AttributionKey): string {
  const aliases = ATTRIBUTION_KEY_ALIASES[key] || [key];
  for (const alias of aliases) {
    const value = sanitiseValue(params.get(alias));
    if (value) return value;
  }
  return '';
}

function extractCurrentAttribution(params: URLSearchParams, formId?: string, formName?: string): AttributionValues {
  const now = new Date().toISOString();
  const values: AttributionValues = {
    landing_page_url: sanitiseValue(window.location.href, 2000),
    submission_page_url: sanitiseValue(window.location.href, 2000),
    referrer: sanitiseValue(document.referrer || '', 2000),
    form_id: sanitiseValue(formId, 200),
    form_name: sanitiseValue(formName, 200),
    latest_visit_at: now,
  };

  for (const key of ATTRIBUTION_PRIMARY_KEYS) {
    const value = getParamValue(params, key);
    if (value) values[key] = value;
  }

  return values;
}

function mergeFirstTouch(previous: AttributionValues, current: AttributionValues): AttributionValues {
  const next: AttributionValues = { ...previous };
  const firstVisitAt = previous.first_visit_at || current.latest_visit_at || new Date().toISOString();

  next.first_visit_at = firstVisitAt;
  next.latest_visit_at = current.latest_visit_at || previous.latest_visit_at || firstVisitAt;
  next.landing_page_url = previous.landing_page_url || current.landing_page_url;
  next.referrer = previous.referrer || current.referrer;
  next.form_id = previous.form_id || current.form_id;
  next.form_name = previous.form_name || current.form_name;

  for (const key of ATTRIBUTION_PRIMARY_KEYS) {
    const previousValue = previous[key];
    const currentValue = current[key];
    if (previousValue) next[key] = previousValue;
    else if (currentValue) next[key] = currentValue;
  }

  return next;
}

function mergeLastTouch(previous: AttributionValues, current: AttributionValues): AttributionValues {
  const next: AttributionValues = { ...previous, ...current };
  next.first_visit_at = previous.first_visit_at || current.first_visit_at || current.latest_visit_at || new Date().toISOString();
  next.latest_visit_at = current.latest_visit_at || new Date().toISOString();
  next.landing_page_url = previous.landing_page_url || current.landing_page_url;
  next.submission_page_url = current.submission_page_url || previous.submission_page_url;
  next.referrer = current.referrer || previous.referrer;
  return next;
}

function persistCookies(values: AttributionValues): void {
  for (const key of ATTRIBUTION_COOKIE_KEYS) {
    const value = values[key];
    if (value) setCookie(`cg_attr_${key}`, value, ATTRIBUTION_RETENTION_DAYS);
  }
  if (values.landing_page_url) setCookie('cg_attr_landing_page_url', values.landing_page_url, ATTRIBUTION_RETENTION_DAYS);
  if (values.first_visit_at) setCookie('cg_attr_first_visit_at', values.first_visit_at, ATTRIBUTION_RETENTION_DAYS);
  if (values.latest_visit_at) setCookie('cg_attr_latest_visit_at', values.latest_visit_at, ATTRIBUTION_RETENTION_DAYS);
}

function hydrateFromCookies(values: AttributionValues): AttributionValues {
  const next: AttributionValues = { ...values };
  for (const key of ATTRIBUTION_COOKIE_KEYS) {
    if (!next[key]) {
      const value = getCookie(`cg_attr_${key}`);
      if (value) next[key] = value;
    }
  }
  if (!next.landing_page_url) next.landing_page_url = getCookie('cg_attr_landing_page_url') || next.landing_page_url;
  if (!next.first_visit_at) next.first_visit_at = getCookie('cg_attr_first_visit_at') || next.first_visit_at;
  if (!next.latest_visit_at) next.latest_visit_at = getCookie('cg_attr_latest_visit_at') || next.latest_visit_at;
  return next;
}

export function captureAttribution(formId?: string, formName?: string): {
  firstTouch: AttributionValues;
  lastTouch: AttributionValues;
} {
  const params = getAllParams();
  const current = extractCurrentAttribution(params, formId, formName);

  const storedFirst = hydrateFromCookies(getStorageValue(ATTRIBUTION_STORAGE_KEYS.firstTouch));
  const storedLast = hydrateFromCookies(getStorageValue(ATTRIBUTION_STORAGE_KEYS.lastTouch));

  const firstTouch = mergeFirstTouch(storedFirst, current);
  const lastTouch = mergeLastTouch(storedLast, current);

  setStorageValue(ATTRIBUTION_STORAGE_KEYS.firstTouch, firstTouch);
  setStorageValue(ATTRIBUTION_STORAGE_KEYS.lastTouch, lastTouch);
  persistCookies(firstTouch);
  persistCookies(lastTouch);

  if (!window.sessionStorage.getItem(ATTRIBUTION_STORAGE_KEYS.initialUrl)) {
    window.sessionStorage.setItem(
      ATTRIBUTION_STORAGE_KEYS.initialUrl,
      firstTouch.landing_page_url || window.location.href,
    );
  }
  window.sessionStorage.setItem(
    ATTRIBUTION_STORAGE_KEYS.latestUrl,
    lastTouch.submission_page_url || window.location.href,
  );

  return { firstTouch, lastTouch };
}

export function populateAttributionFields(
  form: HTMLFormElement,
  firstTouch: AttributionValues,
  lastTouch: AttributionValues,
): void {
  const setHidden = (name: string, value: string) => {
    let input = form.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`);
    if (!input) {
      input = document.createElement('input');
      input.setAttribute('type', 'hidden');
      input.setAttribute('name', name);
      form.appendChild(input);
    }
    input.value = value || '';
  };

  const lastReferrer = lastTouch.referrer || document.referrer || '';
  const landing = firstTouch.landing_page_url || window.sessionStorage.getItem(ATTRIBUTION_STORAGE_KEYS.initialUrl) || '';
  const pageUrl = window.location.href;

  setHidden('initial_url', landing);
  setHidden('page_url', pageUrl);
  setHidden('submission_page_url', pageUrl);
  setHidden('referrer_url', lastReferrer);
  setHidden('first_visit_at', firstTouch.first_visit_at || '');
  setHidden('latest_visit_at', lastTouch.latest_visit_at || '');
  setHidden('landing_page_url', landing);
  setHidden('form_id', form.id || '');

  for (const key of ATTRIBUTION_PRIMARY_KEYS) {
    setHidden(key, lastTouch[key] || firstTouch[key] || '');
  }

  setHidden('first_touch_payload', JSON.stringify(firstTouch));
  setHidden('last_touch_payload', JSON.stringify(lastTouch));
}
