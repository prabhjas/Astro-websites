/** GET-only retirement checks: never consume response bodies or follow arbitrary redirects. */
const REDIRECTS = new Set([301, 302, 303, 307, 308]);
const ALLOWED_PATHS = new Set(['/api/internal/leads', '/api/internal/export-leads',
  '/api/internal/leads/retirement-probe-not-a-real-enquiry', '/api/internal/retry-lead']);

export const RETIRED_LEAD_READ_PATHS = Object.freeze([
  '/api/internal/leads',
  '/api/internal/leads/',
  '/api/internal/leads?limit=1',
  '/api/internal/leads/?limit=1',
  '/api/internal/export-leads',
  '/api/internal/export-leads/',
  '/api/internal/export-leads?format=json',
  '/api/internal/export-leads/?format=json',
  '/api/internal/export-leads?format=csv',
  '/api/internal/export-leads/?format=csv',
  '/api/internal/leads/retirement-probe-not-a-real-enquiry',
  '/api/internal/leads/retirement-probe-not-a-real-enquiry/',
  '/api/internal/retry-lead',
  '/api/internal/retry-lead/',
]);

export async function probeRetiredLeadRead(base, path, {
  headers = {}, fetchImpl = fetch, timeoutMs = 10000,
} = {}) {
  const root = new URL(base);
  const target = new URL(path, root);
  const statuses = [];
  const result = (pass, reason) => ({ path, pass, statuses, reason });
  if (!['http:', 'https:'].includes(root.protocol) || root.username || root.password ||
      target.origin !== root.origin || target.username || target.password || target.hash ||
      !ALLOWED_PATHS.has(target.pathname.replace(/\/$/, ''))) {
    throw new TypeError('Expected an exact retired lead-read path on the supplied origin');
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000) {
    throw new TypeError('timeoutMs must be between 1 and 60000');
  }
  const requestStatus = async (url) => {
    const response = await fetchImpl(url, {
      method: 'GET', redirect: 'manual', headers, signal: AbortSignal.timeout(timeoutMs),
    });
    const status = response.status;
    const location = response.headers.get('location');
    // A still-live endpoint may return the whole store. Never read or log its body.
    try { await response.body?.cancel(); } catch { /* Status evidence remains usable. */ }
    statuses.push(status);
    return { status, location };
  };
  try {
    const first = await requestStatus(target);
    if (first.status === 404) return result(true, 'direct-404');
    const canonical = `${target.pathname}/${target.search}`;
    if (target.pathname.endsWith('/') || !REDIRECTS.has(first.status) || first.location !== canonical) {
      return result(false, 'expected-404-or-exact-canonical-slash-redirect');
    }
    const second = await requestStatus(new URL(canonical, root));
    return second.status === 404
      ? result(true, 'canonical-slash-redirect-to-404')
      : result(false, 'canonical-target-not-404');
  } catch {
    // Do not expose transport errors that might include credentials or response data.
    return result(false, 'request-failed');
  }
}
