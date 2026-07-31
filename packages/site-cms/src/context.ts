/** Per-site feature bind for the shared CMS package. */

export type PostsAdapter = {
  listAllPosts: () => any[];
  getPost: (slug: string) => any | null;
  deletePostPermanently: (slug: string) => void;
  movePostToTrash: (slug: string) => void;
  restorePostFromTrash: (slug: string) => void;
  createOrUpdatePost: (args: any) => any;
  getUploadDestinationPath: (fileName: string) => { filePath: string; publicUrl: string };
  normalizeTagsCsv: (tagsCsv: string) => Array<{ name: string; slug: string }>;
};

export type TaxonomyAdapter = {
  listCategoryTerms: (includeTrash: boolean, q?: string) => any[];
  listTagTerms: (includeTrash: boolean, q?: string) => any[];
  upsertCategory: (args: any) => any;
  upsertTag: (args: any) => any;
  moveCategoryToTrash: (slug: string) => void;
  restoreCategoryFromTrash: (slug: string) => void;
  deleteCategoryPermanently: (slug: string) => void;
  moveTagToTrash: (slug: string) => void;
  restoreTagFromTrash: (slug: string) => void;
  deleteTagPermanently: (slug: string) => void;
  getAllTagTerms: () => any[];
};

export type SiteCmsFeatures = {
  leads: boolean;
  posts: boolean;
  redirects: boolean;
  gtm: boolean;
  seo: boolean;
  uploads: boolean;
  phpFiles: boolean;
};

export const FEATURES_LEADS_ONLY: SiteCmsFeatures = {
  leads: true,
  posts: false,
  redirects: false,
  gtm: false,
  seo: false,
  uploads: false,
  phpFiles: false,
};

export const FEATURES_FULL_CMS: SiteCmsFeatures = {
  leads: true,
  posts: true,
  redirects: true,
  gtm: true,
  seo: true,
  uploads: true,
  phpFiles: true,
};

/** Env shape shared CMS handlers need (sites map from getServerEnv). */
export type LeadEnv = {
  leadStoreDir: string;
  leadStoreMaxFileBytes: number;
  pipedriveMaxRetryAttempts: number;
  internalJobSecret: string;
  websiteId: number;
  websiteName: string;
  formName: string;
  internalAdminDir: string;
  internalUploadDir: string;
  internalUploadMaxFileBytes: number;
  internalEnhancedLiveDir?: string;
  publicSiteUrl?: string;
  [key: string]: unknown;
};

export type ContactPayload = Record<string, unknown> & {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  message?: string;
  company?: string;
  campaign?: string;
  formName?: string;
  pageUrl?: string;
};

export type PipedriveResult =
  | { success: true; personId: number; leadId: string; retryable: false }
  | {
      success: false;
      statusCode?: number;
      error: string;
      retryable: boolean;
      errorCode: string;
    };

export type EmailNotificationResult = {
  sent: boolean;
  skipped: boolean;
};

export type SiteCmsDeps = {
  siteId: string;
  features: SiteCmsFeatures;
  getLeadEnv: () => LeadEnv;
  createPipedriveLead: (env: LeadEnv, payload: ContactPayload) => Promise<PipedriveResult>;
  sendFormNotification: (env: LeadEnv, payload: ContactPayload) => Promise<EmailNotificationResult>;
  logFormSuccess: (fields: Record<string, unknown>) => void;
  logPipedriveFailure: (fields: Record<string, unknown>) => void;
  logWarn: (event: string, fields?: Record<string, unknown>) => void;
  /** Required when features.posts — Evolution / SP Heavy register their store modules. */
  posts?: PostsAdapter;
  taxonomy?: TaxonomyAdapter;
};

let deps: SiteCmsDeps | null = null;

export function configureSiteCms(next: SiteCmsDeps): void {
  deps = next;
}

export function getSiteCms(): SiteCmsDeps {
  if (!deps) {
    throw new Error(
      '@connect/site-cms is not configured. Call configureSiteCms() from the site (e.g. src/cms.ts) before handling requests.',
    );
  }
  return deps;
}

export function isSiteCmsConfigured(): boolean {
  return deps !== null;
}

export function getLeadEnv(): LeadEnv {
  return getSiteCms().getLeadEnv();
}
