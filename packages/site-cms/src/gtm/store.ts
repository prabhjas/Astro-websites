import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { sanitizeGtmHtml } from '../security/sanitize-html.js';

const GTM_ID_PATTERN = /^GTM-[A-Z0-9]{4,20}$/;
const GA4_ID_PATTERN = /^G-[A-Z0-9]{5,20}$/;
const MAX_IDS_PER_KIND = 10;
const MAX_ID_INPUT_BYTES = 2_048;

export type GlobalGtmConfig = {
  /** Version 2 configs are generated only from validated gtmIds / ga4Ids. */
  schemaVersion?: 2;
  gtmIds?: string[];
  ga4Ids?: string[];
  headScript: string;
  bodyHtml: string;
  footerScript: string;
  updatedAt: string;
  updatedBy: string;
};

export type GlobalGtmWriteInput = {
  gtmIds?: string | readonly string[];
  ga4Ids?: string | readonly string[];
  updatedAt?: string;
  updatedBy: string;
  /** Legacy fields are accepted by the type only so callers receive a safe runtime rejection. */
  headScript?: string;
  bodyHtml?: string;
  footerScript?: string;
};

export class GtmConfigValidationError extends Error {
  readonly code = 'INVALID_GTM_CONFIG';

  constructor(message: string) {
    super(message);
    this.name = 'GtmConfigValidationError';
  }
}

function configPath(rootDir: string): string {
  return join(rootDir, 'gtm.json');
}

/**
 * Compatibility sanitizer for environment-provided snippets. It must not be
 * used to authorize persisted CMS writes; JavaScript cannot be made safe with
 * string replacements.
 */
export function sanitiseGtmSnippet(html: string): string {
  if (!html) return '';
  return sanitizeGtmHtml(
    html
      .replace(/\stype\s*=\s*["']rocketlazyloadscript["']/gi, '')
      .replace(/\stype\s*=\s*["']text\/rocketlazyloadscript["']/gi, '')
      .replace(/\sdata-rocket-[a-z0-9_-]+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/\sdata-wpr-[a-z0-9_-]+\s*=\s*["'][^"']*["']/gi, ''),
  );
}

/** Raw reader for the authenticated admin GET route and migration tooling. */
export async function readStoredGlobalGtmConfig(rootDir: string): Promise<GlobalGtmConfig | null> {
  try {
    const raw = await readFile(configPath(rootDir), 'utf8');
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as GlobalGtmConfig) : null;
  } catch {
    return null;
  }
}

function splitIdInput(input: string | readonly string[] | undefined): string[] {
  const values = Array.isArray(input) ? input : [input || ''];
  const joined = values.map((value) => String(value || '')).join(',');
  if (Buffer.byteLength(joined, 'utf8') > MAX_ID_INPUT_BYTES) {
    throw new GtmConfigValidationError('Analytics ID input is too large.');
  }
  return joined
    .split(/[,;\s]+/)
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);
}

function parseAnalyticsIds(
  input: string | readonly string[] | undefined,
  kind: 'gtm' | 'ga4',
): string[] {
  const pattern = kind === 'gtm' ? GTM_ID_PATTERN : GA4_ID_PATTERN;
  const label = kind === 'gtm' ? 'GTM container' : 'GA4 measurement';
  const seen = new Set<string>();
  for (const id of splitIdInput(input)) {
    if (!pattern.test(id)) throw new GtmConfigValidationError(`Invalid ${label} ID.`);
    seen.add(id);
  }
  if (seen.size > MAX_IDS_PER_KIND) {
    throw new GtmConfigValidationError(`At most ${MAX_IDS_PER_KIND} ${label} IDs are allowed.`);
  }
  return [...seen];
}

function normaliseGtmId(raw: string): string {
  const id = String(raw || '').trim().toUpperCase();
  return GTM_ID_PATTERN.test(id) ? id : '';
}

function normaliseGa4Id(raw: string): string {
  const id = String(raw || '').trim().toUpperCase();
  return GA4_ID_PATTERN.test(id) ? id : '';
}

/** Standard GTM container snippets from a validated container ID. */
export function snippetsFromGtmId(
  containerId: string,
): Pick<GlobalGtmConfig, 'headScript' | 'bodyHtml' | 'footerScript'> {
  const id = normaliseGtmId(containerId);
  if (!id) return { headScript: '', bodyHtml: '', footerScript: '' };

  const headScript = `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${id}');</script>
<!-- End Google Tag Manager -->`;
  const bodyHtml = `<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${id}"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->`;
  return { headScript, bodyHtml, footerScript: '' };
}

/** Standard GA4 gtag.js snippets from a validated measurement ID. */
export function snippetsFromGa4Id(
  measurementId: string,
): Pick<GlobalGtmConfig, 'headScript' | 'bodyHtml' | 'footerScript'> {
  const id = normaliseGa4Id(measurementId);
  if (!id) return { headScript: '', bodyHtml: '', footerScript: '' };

  const headScript = `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${id}');
</script>`;
  return { headScript, bodyHtml: '', footerScript: '' };
}

/** One gtag.js bootstrap + config for each measurement ID (shared dataLayer). */
export function snippetsFromGa4Ids(
  measurementIds: string[],
): Pick<GlobalGtmConfig, 'headScript' | 'bodyHtml' | 'footerScript'> {
  const ids = measurementIds.map(normaliseGa4Id).filter(Boolean);
  const unique = [...new Set(ids)];
  if (!unique.length) return { headScript: '', bodyHtml: '', footerScript: '' };

  const primary = unique[0];
  const configs = unique.map((id) => `  gtag('config', '${id}');`).join('\n');
  const headScript = `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${primary}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
${configs}
</script>`;
  return { headScript, bodyHtml: '', footerScript: '' };
}

function mergeSnippets(
  parts: Array<Pick<GlobalGtmConfig, 'headScript' | 'bodyHtml' | 'footerScript'>>,
): Pick<GlobalGtmConfig, 'headScript' | 'bodyHtml' | 'footerScript'> {
  return {
    headScript: parts.map((part) => part.headScript).filter(Boolean).join('\n'),
    bodyHtml: parts.map((part) => part.bodyHtml).filter(Boolean).join('\n'),
    footerScript: parts.map((part) => part.footerScript).filter(Boolean).join('\n'),
  };
}

function cleanUpdatedBy(raw: string): string {
  return String(raw || 'internal-job')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, 128) || 'internal-job';
}

function materialiseConfig(args: {
  gtmIds: string[];
  ga4Ids: string[];
  updatedBy: string;
  updatedAt?: string;
}): GlobalGtmConfig {
  const snippets = mergeSnippets([
    ...args.gtmIds.map((id) => snippetsFromGtmId(id)),
    snippetsFromGa4Ids(args.ga4Ids),
  ]);
  return {
    schemaVersion: 2,
    gtmIds: args.gtmIds,
    ga4Ids: args.ga4Ids,
    ...snippets,
    updatedBy: cleanUpdatedBy(args.updatedBy),
    updatedAt: args.updatedAt || new Date().toISOString(),
  };
}

function normalizeMarkupForComparison(raw: string): string {
  return String(raw || '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
}

function extractLegacyIds(config: GlobalGtmConfig): { gtmIds: string[]; ga4Ids: string[] } {
  const markup = `${String(config.headScript || '')}\n${String(config.bodyHtml || '')}\n${String(config.footerScript || '')}`;
  const gtmIds = [...markup.matchAll(/\bGTM-[A-Z0-9]{4,20}\b/g)].map((match) => match[0]);
  const ga4Ids = [...markup.matchAll(/\bG-[A-Z0-9]{5,20}\b/g)].map((match) => match[0]);
  return {
    gtmIds: [...new Set(gtmIds)],
    ga4Ids: [...new Set(ga4Ids)],
  };
}

/**
 * Convert a stored config into executable, canonical markup.
 *
 * Version 2 ignores stored HTML and regenerates it from IDs. Legacy markup is
 * executable only when it exactly matches snippets generated by this module
 * (apart from newline style/trailing whitespace). Arbitrary legacy content
 * remains available to the authenticated raw reader for manual migration.
 */
export function getSafeRuntimeGtmConfig(config: GlobalGtmConfig | null): GlobalGtmConfig | null {
  if (!config) return null;
  const updatedBy = cleanUpdatedBy(config.updatedBy);
  const updatedAt = String(config.updatedAt || '');

  if (config.schemaVersion === 2 || Array.isArray(config.gtmIds) || Array.isArray(config.ga4Ids)) {
    try {
      return materialiseConfig({
        gtmIds: parseAnalyticsIds(config.gtmIds || [], 'gtm'),
        ga4Ids: parseAnalyticsIds(config.ga4Ids || [], 'ga4'),
        updatedBy,
        updatedAt,
      });
    } catch {
      return null;
    }
  }

  const ids = extractLegacyIds(config);
  let canonical: GlobalGtmConfig;
  try {
    canonical = materialiseConfig({ ...ids, updatedBy, updatedAt });
  } catch {
    return null;
  }
  const fields: Array<keyof Pick<GlobalGtmConfig, 'headScript' | 'bodyHtml' | 'footerScript'>> = [
    'headScript',
    'bodyHtml',
    'footerScript',
  ];
  const matches = fields.every(
    (field) => normalizeMarkupForComparison(config[field]) === normalizeMarkupForComparison(canonical[field]),
  );
  return matches ? canonical : null;
}

/** Safe runtime reader used by site layouts and runtime-gtm endpoints. */
export async function readGlobalGtmConfig(rootDir: string): Promise<GlobalGtmConfig | null> {
  return getSafeRuntimeGtmConfig(await readStoredGlobalGtmConfig(rootDir));
}

/** Persist only structured IDs; non-empty legacy script fields always fail. */
export async function writeGlobalGtmConfig(
  rootDir: string,
  value: GlobalGtmWriteInput,
): Promise<GlobalGtmConfig> {
  if ([value.headScript, value.bodyHtml, value.footerScript].some((field) => String(field || '').trim())) {
    throw new GtmConfigValidationError(
      'Raw GTM/analytics HTML is no longer accepted. Submit structured gtmIds and ga4Ids.',
    );
  }

  const next = materialiseConfig({
    gtmIds: parseAnalyticsIds(value.gtmIds, 'gtm'),
    ga4Ids: parseAnalyticsIds(value.ga4Ids, 'ga4'),
    updatedBy: value.updatedBy,
    updatedAt: value.updatedAt,
  });
  const path = configPath(rootDir);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  return next;
}

/** Split env lists: comma / whitespace / semicolon. Dedupes, preserves order. */
function parseEnvIdList(raw: string, normalise: (value: string) => string): string[] {
  const seen = new Set<string>();
  for (const part of String(raw || '').split(/[,;\s]+/)) {
    const id = normalise(part);
    if (id) seen.add(id);
  }
  return [...seen];
}

function snippetsFromEnvIds(): Pick<GlobalGtmConfig, 'headScript' | 'bodyHtml' | 'footerScript'> {
  const rawGtm = process.env.PUBLIC_GTM_ID || process.env.GTM_CONTAINER_ID || '';
  const rawGa4 =
    process.env.PUBLIC_GA4_ID || process.env.GA4_MEASUREMENT_ID || process.env.PUBLIC_GA_MEASUREMENT_ID || '';
  const gtmIds = parseEnvIdList(rawGtm, normaliseGtmId);
  let ga4Ids = parseEnvIdList(rawGa4, normaliseGa4Id);
  if (!ga4Ids.length && !gtmIds.length) ga4Ids = parseEnvIdList(rawGtm, normaliseGa4Id);
  return mergeSnippets([...gtmIds.map((id) => snippetsFromGtmId(id)), snippetsFromGa4Ids(ga4Ids)]);
}

/**
 * Effective tags for public runtime injection.
 * Priority: safe file config -> env snippets -> env IDs -> none.
 */
export async function resolveEffectiveGtmConfig(rootDir: string): Promise<{
  headScript: string;
  bodyHtml: string;
  footerScript: string;
  source: 'file' | 'env-snippets' | 'env-id' | 'none';
}> {
  const file = await readGlobalGtmConfig(rootDir);
  if (file && (file.headScript || file.bodyHtml || file.footerScript)) {
    return {
      headScript: file.headScript,
      bodyHtml: file.bodyHtml,
      footerScript: file.footerScript,
      source: 'file',
    };
  }

  // Environment snippets are deploy-time trusted configuration, not CMS input.
  const envHead = sanitiseGtmSnippet(process.env.GTM_HEAD_SCRIPT || '');
  const envBody = sanitiseGtmSnippet(process.env.GTM_BODY_HTML || '');
  const envFooter = sanitiseGtmSnippet(process.env.GTM_FOOTER_SCRIPT || '');
  if (envHead || envBody || envFooter) {
    return { headScript: envHead, bodyHtml: envBody, footerScript: envFooter, source: 'env-snippets' };
  }

  const fromIds = snippetsFromEnvIds();
  if (fromIds.headScript || fromIds.bodyHtml || fromIds.footerScript) {
    return { ...fromIds, source: 'env-id' };
  }
  return { headScript: '', bodyHtml: '', footerScript: '', source: 'none' };
}
