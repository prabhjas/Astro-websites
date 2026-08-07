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

/**
 * Load KEY=VALUE lines from a dotenv file.
 * When `override` is true, values replace process.env (used for `.env.webdev`
 * so webdev can fix secrets without root write access to `.env.prod`).
 */
function applyDotEnvPath(envPath: string, override: boolean): void {
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
    if (!key) continue;
    if (override || process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function loadDotEnvFile(): void {
  if (dotEnvLoaded || typeof process === 'undefined') return;
  dotEnvLoaded = true;
  // systemd EnvironmentFile (.env.prod) is already in process.env.
  applyDotEnvPath(join(process.cwd(), '.env'), false);
  // Optional webdev-owned overrides (gitignored) — wins over placeholders in .env.prod.
  applyDotEnvPath(join(process.cwd(), '.env.webdev'), true);
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
    pipedriveApiToken: required('PIPEDRIVE_API_TOKEN', env.PIPEDRIVE_API_TOKEN),
    pipedriveCompanyDomain: required(
      'PIPEDRIVE_COMPANY_DOMAIN',
      env.PIPEDRIVE_COMPANY_DOMAIN ?? env.PIPEDRIVE_API_URL,
    ),
    pipedriveOwnerId: requiredInt('PIPEDRIVE_OWNER_ID', env.PIPEDRIVE_OWNER_ID),
    pipedriveStageId: optionalInt(env.PIPEDRIVE_STAGE_ID),
    pipedrivePipelineId: optionalInt(env.PIPEDRIVE_PIPELINE_ID),
    pipedrivePersonLabelIds: parseIntList(env.PIPEDRIVE_PERSON_LABEL_IDS, [5]),
    pipedrivePersonVisibleTo: optionalInt(env.PIPEDRIVE_PERSON_VISIBLE_TO) ?? 3,
    pipedriveLeadSourceId: requiredInt('PIPEDRIVE_LEAD_SOURCE_ID', env.PIPEDRIVE_LEAD_SOURCE_ID ?? env.FORM_SOURCE),
    websiteId: requiredInt('WEBSITE_ID', env.WEBSITE_ID),
    websiteName: env.WEBSITE_NAME?.trim() || 'Connect Zone',
    formSource: env.FORM_SOURCE?.trim() || '270',
    formName: env.FORM_NAME?.trim() || 'Connect Zone Contact Form',
    leadTitlePrefix: env.LEAD_TITLE_PREFIX?.trim() || 'AD Connect Zone',
    notificationEmails: env.FORM_NOTIFICATION_EMAILS?.trim() || '',
    fromEmail: env.FORM_FROM_EMAIL?.trim() || '',
    fromName: env.FORM_FROM_NAME?.trim() || 'Connect Zone',
    smtpHost: env.SMTP_HOST?.trim() || '',
    smtpPort: optionalInt(env.SMTP_PORT) ?? 587,
    smtpSecure: String(env.SMTP_SECURE ?? '').toLowerCase() === 'true',
    smtpUser: env.SMTP_USER?.trim() || '',
    smtpPass: env.SMTP_PASS?.trim() || '',
    logLevel: env.LOG_LEVEL?.trim() || 'info',
    fieldKeys: {
      message: env.PIPEDRIVE_FIELD_MESSAGE?.trim() || '3a108ee6cdcaad880546876dd524bfa9aa686da7',
      source: env.PIPEDRIVE_FIELD_SOURCE?.trim() || '296a2c3746355d2b33b7ff392bd038199eaf9665',
      website: env.PIPEDRIVE_FIELD_WEBSITE?.trim() || 'af2182f3f2ee03a51c7dcfd898951a268787343c',
      leadSubmittedOn:
        env.PIPEDRIVE_FIELD_LEAD_SUBMITTED_ON?.trim() || '1b6c5556b8f2796d4a87d842248152f78384ac37',
      userLandedOn:
        env.PIPEDRIVE_FIELD_USER_LANDED_ON?.trim() || 'da1c7e07576ae835e0cf337b831ab2db59d64707',
      nationality: env.PIPEDRIVE_FIELD_NATIONALITY?.trim() || 'ef20fc32751f00f294ca3c35003b908ba0ad42a4',
      countryCode: env.PIPEDRIVE_FIELD_COUNTRY_CODE?.trim() || '4c0ac56cd5cca4ff7d5996b692608d5b82ea9dc6',
      companyName: env.PIPEDRIVE_FIELD_COMPANY_NAME?.trim() || 'b311a9a442b96abcecc6fbd254b977287a54feac',
      professionSector:
        env.PIPEDRIVE_FIELD_PROFESSION_SECTOR?.trim() || 'fa0d863f0fdfdbb2a7b39519208841b18b256006',
      locPhysicalMs: env.PIPEDRIVE_FIELD_LOC_PHYSICAL_MS?.trim() || '872ba697d4548d943f25d247fa955ac99407d7a5',
      locInterestMs: env.PIPEDRIVE_FIELD_LOC_INTEREST_MS?.trim() || '7d77301b889aa6f07f8858bf5662c450fc36b4d9',
      adposition: env.PIPEDRIVE_FIELD_ADPOSITION?.trim() || '3dcaf84909978d5167a9bab13e754eccfc6d39d1',
      targetId: env.PIPEDRIVE_FIELD_TARGET_ID?.trim() || '04057083817af90abe314fd48f0f856ea52652c0',
      placement: env.PIPEDRIVE_FIELD_PLACEMENT?.trim() || '53d1db8286116e3a52f6bb5ad28c6cfab5b170ac',
      network: env.PIPEDRIVE_FIELD_NETWORK?.trim() || 'e2ea3701d1c42e64ea160bd0c74989996475c51d',
      device: env.PIPEDRIVE_FIELD_DEVICE?.trim() || '9c13a77c0d5cb7f5bdb1a3c63d784d88b5555029',
      matchtype: env.PIPEDRIVE_FIELD_MATCHTYPE?.trim() || '416eeb319125d90c7a0b9b37fdf7576bc9eae70b',
      keyword: env.PIPEDRIVE_FIELD_KEYWORD?.trim() || '48a9a6f7ff7347062221a840ff955bae94b19d5e',
      creativeId: env.PIPEDRIVE_FIELD_CREATIVE_ID?.trim() || 'cb7ffc625c3a3e6c1b04e9b1d9860559f0ecd480',
      campaignId: env.PIPEDRIVE_FIELD_CAMPAIGN_ID?.trim() || 'b8da9d1e02468bc3b9e62958fd86a1fa61d4c215',
      adgroupId: env.PIPEDRIVE_FIELD_ADGROUP_ID?.trim() || 'c8b52df3a6c58f5ecf129b2c73db8830b5c5167e',
      gclid: env.PIPEDRIVE_FIELD_GCLID?.trim() || 'd3a15df8cde497d2eb39515f9488f681440cca92',
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
