/**
 * @connect/site-cms — shared Connect Group site CMS (leads + machine auth).
 * Each Astro site configures deps once, then mounts thin API route re-exports.
 */
export type {
  SiteCmsFeatures,
  SiteCmsDeps,
  LeadEnv,
  PipedriveResult,
  ContactPayload,
  PostsAdapter,
  TaxonomyAdapter,
} from './context.js';
export {
  configureSiteCms,
  getSiteCms,
  getLeadEnv,
  isSiteCmsConfigured,
  FEATURES_LEADS_ONLY,
  FEATURES_FULL_CMS,
} from './context.js';

export { getPostsAdapter, getTaxonomyAdapter } from './adapters.js';

export {
  isInternalJobAuthorized,
  internalJsonHeaders,
  internalJson,
  requireInternalJobAuth,
} from './auth/internal-job.js';

export { applyInternalNoIndexHeaders } from './security/internal-response.js';

export { FileLeadStore } from './leads/file-store.js';
export { deliverStoredLead } from './leads/service.js';
export {
  matchesLeadQuery,
  toLeadCsv,
  toLeadJson,
  getLeadDisplayName,
  getLeadSecondaryDetail,
  formatDateTime,
  getDeliveryStatusCount,
} from './leads/dashboard.js';
export { getNextRetryAt } from './leads/retry-policy.js';
export type {
  LeadSubmissionRecord,
  LeadDeliveryAttemptRecord,
  DeliveryTrigger,
  DeliveryStatus,
  SubmissionStatus,
} from './leads/types.js';

export { sanitizeCmsHtml, sanitizeMirrorHtml, sanitizeGtmHtml } from './security/sanitize-html.js';
