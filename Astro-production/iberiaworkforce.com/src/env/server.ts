/**
 * Server-only environment configuration.
 * Import only from API routes and server-side services — never from client code.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export type ServerEnv = {
  leadStoreDir: string;
  leadStoreMaxFileBytes: number;
  pipedriveMaxRetryAttempts: number;
  pipedriveRequestTimeoutMs: number;
  dashboardPath: string;
  dashboardSessionSecret: string;
  dashboardSessionTtlMinutes: number;
  internalJobSecret: string;
  internalAdminDir: string;
  internalEnhancedLiveDir: string;
  internalUploadDir: string;
  internalUploadMaxFileBytes: number;
  dashboardUsers: Array<{
    email: string;
    role: 'super_admin' | 'developer' | 'viewer' | 'seo';
    passwordHash: string;
  }>;
  pipedriveApiToken: string;
  pipedriveCompanyDomain: string;
  pipedriveOwnerId: number;
  pipedriveStageId?: number;
  pipedrivePipelineId?: number;
  pipedrivePersonLabelIds: number[];
  pipedrivePersonVisibleTo: number;
  pipedriveLeadSourceId: number;
  websiteId: number;
  websiteName: string;
  formSource: string;
  formName: string;
  leadTitlePrefix: string;
  notificationEmails: string;
  fromEmail: string;
  fromName: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
  logLevel: string;
  fieldKeys: {
    message: string;
    source: string;
    website: string;
    leadSubmittedOn: string;
    userLandedOn: string;
    nationality: string;
    countryCode: string;
    companyName: string;
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
    campaignId: string;
    adgroupId: string;
    gclid: string;
    utmSource: string;
    utmMedium: string;
    utmCampaign: string;
    utmTerm: string;
    utmContent: string;
    fbclid: string;
    location: string;
    campaign: string;
  };
};

function required(name: string, value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return trimmed;
}

function optionalInt(value: string | undefined): number | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

function requiredInt(name: string, value: string | undefined): number {
  const n = optionalInt(value);
  if (n === undefined) {
    throw new Error(`Missing or invalid integer environment variable: ${name}`);
  }
  return n;
}

function parseIntList(value: string | undefined, fallback: number[]): number[] {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;
  return trimmed
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((n) => Number.isFinite(n));
}

function parseDashboardUsers(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return [];
  const allowedRoles = new Set(['super_admin', 'developer', 'viewer', 'seo']);
  try {
    const parsed = JSON.parse(trimmed) as Array<Record<string, unknown>>;
    return parsed
      .map((row) => ({
        email: String(row.email || '').trim().toLowerCase(),
        role: String(row.role || '').trim() as 'super_admin' | 'developer' | 'viewer' | 'seo',
        passwordHash: String(row.passwordHash || '').trim(),
      }))
      .filter((row) => row.email && row.passwordHash && allowedRoles.has(row.role));
  } catch {
    throw new Error('Invalid DASHBOARD_USERS_JSON value');
  }
}

let cached: ServerEnv | null = null;
let dotEnvLoaded = false;

function loadDotEnvFile(): void {
  if (dotEnvLoaded || typeof process === 'undefined') return;
  dotEnvLoaded = true;

  const envPath = join(process.cwd(), '.env');
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator < 0) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function readEnv(name: string): string | undefined {
  const fromProcess = typeof process !== 'undefined' ? process.env[name] : undefined;
  const metaEnv =
    typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env as Record<string, string | undefined>)
      : undefined;
  const fromMeta = metaEnv?.[name];
  const value = fromProcess ?? fromMeta;
  return typeof value === 'string' ? value : undefined;
}

/** Resolve INTERNAL_ADMIN_DIR without requiring Pipedrive secrets (safe for public SEO routes). */
export function resolveInternalAdminDir(): string {
  loadDotEnvFile();
  return readEnv('INTERNAL_ADMIN_DIR')?.trim() || '.data/internal-admin';
}

export function getServerEnv(): ServerEnv {
  if (cached) return cached;

  loadDotEnvFile();

  const env = new Proxy({} as Record<string, string | undefined>, {
    get(_target, prop: string) {
      return readEnv(prop);
    },
  });

  cached = {
    leadStoreDir: env.LEAD_STORE_DIR?.trim() || '.data/leads',
    leadStoreMaxFileBytes: optionalInt(env.LEAD_STORE_MAX_FILE_BYTES) ?? 10 * 1024 * 1024,
    pipedriveMaxRetryAttempts: optionalInt(env.PIPEDRIVE_MAX_RETRY_ATTEMPTS) ?? 5,
    pipedriveRequestTimeoutMs: optionalInt(env.PIPEDRIVE_REQUEST_TIMEOUT_MS) ?? 10_000,
    dashboardPath: env.DASHBOARD_PATH?.trim() || '/internal/operations',
    dashboardSessionSecret: env.DASHBOARD_SESSION_SECRET?.trim() || '',
    dashboardSessionTtlMinutes: optionalInt(env.DASHBOARD_SESSION_TTL_MINUTES) ?? 480,
    internalJobSecret: env.INTERNAL_JOB_SECRET?.trim() || '',
    internalAdminDir: env.INTERNAL_ADMIN_DIR?.trim() || '.data/internal-admin',
    internalEnhancedLiveDir: env.INTERNAL_ENHANCED_LIVE_DIR?.trim() || '.data/enhanced-live',
    internalUploadDir: env.INTERNAL_UPLOAD_DIR?.trim() || '.data/internal-uploads',
    internalUploadMaxFileBytes: optionalInt(env.INTERNAL_UPLOAD_MAX_FILE_BYTES) ?? 10 * 1024 * 1024,
    dashboardUsers: parseDashboardUsers(env.DASHBOARD_USERS_JSON),
    pipedriveApiToken: env.PIPEDRIVE_API_TOKEN?.trim() || '',
    pipedriveCompanyDomain: (
      env.PIPEDRIVE_COMPANY_DOMAIN ?? env.PIPEDRIVE_API_URL
    )?.trim() || 'connectgroup2',
    pipedriveOwnerId: optionalInt(env.PIPEDRIVE_OWNER_ID) ?? 0,
    pipedriveStageId: optionalInt(env.PIPEDRIVE_STAGE_ID),
    pipedrivePipelineId: optionalInt(env.PIPEDRIVE_PIPELINE_ID),
    pipedrivePersonLabelIds: parseIntList(env.PIPEDRIVE_PERSON_LABEL_IDS, []),
    pipedrivePersonVisibleTo: optionalInt(env.PIPEDRIVE_PERSON_VISIBLE_TO) ?? 3,
    pipedriveLeadSourceId: optionalInt(env.PIPEDRIVE_LEAD_SOURCE_ID ?? env.FORM_SOURCE) ?? 0,
    websiteId: optionalInt(env.WEBSITE_ID) ?? 0,
    websiteName: env.WEBSITE_NAME?.trim() || 'Iberia Workforce',
    formSource: env.FORM_SOURCE?.trim() || '',
    formName: env.FORM_NAME?.trim() || 'Iberia Workforce Contact Form',
    leadTitlePrefix: env.LEAD_TITLE_PREFIX?.trim() || 'Website lead — iberiaworkforce.com',
    notificationEmails: env.FORM_NOTIFICATION_EMAILS?.trim() || '',
    fromEmail: env.FORM_FROM_EMAIL?.trim() || '',
    fromName: env.FORM_FROM_NAME?.trim() || 'Iberia Workforce Form',
    smtpHost: env.SMTP_HOST?.trim() || '',
    smtpPort: optionalInt(env.SMTP_PORT) ?? 587,
    smtpSecure: String(env.SMTP_SECURE ?? '').toLowerCase() === 'true',
    smtpUser: env.SMTP_USER?.trim() || '',
    smtpPass: env.SMTP_PASS?.trim() || '',
    logLevel: env.LOG_LEVEL?.trim() || 'info',
    fieldKeys: {
      // Iberia: leave blank unless Pipedrive custom-field hashes are configured.
      message: env.PIPEDRIVE_FIELD_MESSAGE?.trim() || '',
      source: env.PIPEDRIVE_FIELD_SOURCE?.trim() || '',
      website: env.PIPEDRIVE_FIELD_WEBSITE?.trim() || '',
      leadSubmittedOn: env.PIPEDRIVE_FIELD_LEAD_SUBMITTED_ON?.trim() || '',
      userLandedOn: env.PIPEDRIVE_FIELD_USER_LANDED_ON?.trim() || '',
      nationality: env.PIPEDRIVE_FIELD_NATIONALITY?.trim() || '',
      countryCode: env.PIPEDRIVE_FIELD_COUNTRY_CODE?.trim() || '',
      companyName: env.PIPEDRIVE_FIELD_COMPANY_NAME?.trim() || '',
      professionSector: env.PIPEDRIVE_FIELD_PROFESSION_SECTOR?.trim() || '',
      locPhysicalMs: env.PIPEDRIVE_FIELD_LOC_PHYSICAL_MS?.trim() || '',
      locInterestMs: env.PIPEDRIVE_FIELD_LOC_INTEREST_MS?.trim() || '',
      adposition: env.PIPEDRIVE_FIELD_ADPOSITION?.trim() || '',
      targetId: env.PIPEDRIVE_FIELD_TARGET_ID?.trim() || '',
      placement: env.PIPEDRIVE_FIELD_PLACEMENT?.trim() || '',
      network: env.PIPEDRIVE_FIELD_NETWORK?.trim() || '',
      device: env.PIPEDRIVE_FIELD_DEVICE?.trim() || '',
      matchtype: env.PIPEDRIVE_FIELD_MATCHTYPE?.trim() || '',
      keyword: env.PIPEDRIVE_FIELD_KEYWORD?.trim() || '',
      creativeId: env.PIPEDRIVE_FIELD_CREATIVE_ID?.trim() || '',
      campaignId: env.PIPEDRIVE_FIELD_CAMPAIGN_ID?.trim() || '',
      adgroupId: env.PIPEDRIVE_FIELD_ADGROUP_ID?.trim() || '',
      gclid: env.PIPEDRIVE_FIELD_GCLID?.trim() || '',
      utmSource: env.PIPEDRIVE_FIELD_UTM_SOURCE?.trim() || '',
      utmMedium: env.PIPEDRIVE_FIELD_UTM_MEDIUM?.trim() || '',
      utmCampaign: env.PIPEDRIVE_FIELD_UTM_CAMPAIGN?.trim() || '',
      utmTerm: env.PIPEDRIVE_FIELD_UTM_TERM?.trim() || '',
      utmContent: env.PIPEDRIVE_FIELD_UTM_CONTENT?.trim() || '',
      fbclid: env.PIPEDRIVE_FIELD_FBCLID?.trim() || '',
      location: env.PIPEDRIVE_FIELD_LOCATION?.trim() || '',
      campaign: env.PIPEDRIVE_FIELD_CAMPAIGN?.trim() || '',
    },
  };

  return cached;
}

export function resetServerEnvCache(): void {
  cached = null;
  dotEnvLoaded = false;
}
