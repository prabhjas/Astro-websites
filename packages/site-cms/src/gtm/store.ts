import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export type GlobalGtmConfig = {
  headScript: string;
  bodyHtml: string;
  footerScript: string;
  updatedAt: string;
  updatedBy: string;
};

function configPath(rootDir: string): string {
  return join(rootDir, 'gtm.json');
}

/** Strip WP Rocket / lazy-load wrappers so snippets run on Astro. */
export function sanitiseGtmSnippet(html: string): string {
  if (!html) return '';
  return html
    .replace(/\stype\s*=\s*["']rocketlazyloadscript["']/gi, '')
    .replace(/\stype\s*=\s*["']text\/rocketlazyloadscript["']/gi, '')
    .replace(/\sdata-rocket-[a-z0-9_-]+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\sdata-wpr-[a-z0-9_-]+\s*=\s*["'][^"']*["']/gi, '')
    .trim();
}

export async function readGlobalGtmConfig(rootDir: string): Promise<GlobalGtmConfig | null> {
  try {
    const raw = await readFile(configPath(rootDir), 'utf8');
    return JSON.parse(raw) as GlobalGtmConfig;
  } catch {
    return null;
  }
}

export async function writeGlobalGtmConfig(
  rootDir: string,
  value: Omit<GlobalGtmConfig, 'updatedAt'> & { updatedAt?: string },
): Promise<GlobalGtmConfig> {
  const next: GlobalGtmConfig = {
    headScript: sanitiseGtmSnippet(value.headScript),
    bodyHtml: sanitiseGtmSnippet(value.bodyHtml),
    footerScript: sanitiseGtmSnippet(String((value as { footerScript?: string }).footerScript || '')),
    updatedBy: value.updatedBy,
    updatedAt: value.updatedAt || new Date().toISOString(),
  };
  const path = configPath(rootDir);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  return next;
}

function normaliseGtmId(raw: string): string {
  const id = String(raw || '').trim().toUpperCase();
  if (!id) return '';
  // Reject docs placeholders leaked from inline .env comments (GTM-AAAA / GTM-BBBB).
  if (/^GTM-(AAAA|BBBB|XXXX|XXXXXXX)$/.test(id)) return '';
  if (/^GTM-[A-Z0-9]+$/.test(id)) return id;
  return '';
}

function normaliseGa4Id(raw: string): string {
  const id = String(raw || '').trim().toUpperCase();
  if (!id) return '';
  if (/^G-[A-Z0-9]+$/.test(id)) return id;
  return '';
}

/** Split env lists: comma / whitespace / semicolon. Dedupes, preserves order. */
function parseIdList(raw: string, normalise: (v: string) => string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of String(raw || '').split(/[,;\s]+/)) {
    const id = normalise(part);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/** Standard GTM container snippets from PUBLIC_GTM_ID / GTM_CONTAINER_ID. */
export function snippetsFromGtmId(
  containerId: string,
): Pick<GlobalGtmConfig, 'headScript' | 'bodyHtml' | 'footerScript'> {
  const id = normaliseGtmId(containerId);
  if (!id) {
    return { headScript: '', bodyHtml: '', footerScript: '' };
  }
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

/** Standard GA4 gtag.js snippets from PUBLIC_GA4_ID / GA4_MEASUREMENT_ID. */
export function snippetsFromGa4Id(
  measurementId: string,
): Pick<GlobalGtmConfig, 'headScript' | 'bodyHtml' | 'footerScript'> {
  const id = normaliseGa4Id(measurementId);
  if (!id) {
    return { headScript: '', bodyHtml: '', footerScript: '' };
  }
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

/**
 * One gtag.js bootstrap + config for each measurement ID (shared dataLayer).
 * First ID loads gtag/js; later IDs only call gtag('config', …).
 */
export function snippetsFromGa4Ids(
  measurementIds: string[],
): Pick<GlobalGtmConfig, 'headScript' | 'bodyHtml' | 'footerScript'> {
  const ids = measurementIds.map(normaliseGa4Id).filter(Boolean);
  const unique = [...new Set(ids)];
  if (!unique.length) {
    return { headScript: '', bodyHtml: '', footerScript: '' };
  }
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
    headScript: parts.map((p) => p.headScript).filter(Boolean).join('\n'),
    bodyHtml: parts.map((p) => p.bodyHtml).filter(Boolean).join('\n'),
    footerScript: parts.map((p) => p.footerScript).filter(Boolean).join('\n'),
  };
}

function configHasSnippets(config: GlobalGtmConfig | null): boolean {
  if (!config) return false;
  return Boolean(
    sanitiseGtmSnippet(config.headScript || '') ||
      sanitiseGtmSnippet(config.bodyHtml || '') ||
      sanitiseGtmSnippet(config.footerScript || ''),
  );
}

/**
 * Resolve GTM container(s) and/or GA4 measurement ID(s) from env.
 * Lists: comma / space / semicolon separated.
 * A lone G-… in PUBLIC_GTM_ID is treated as GA4 for convenience.
 */
function snippetsFromEnvIds(): Pick<GlobalGtmConfig, 'headScript' | 'bodyHtml' | 'footerScript'> {
  const rawGtm = process.env.PUBLIC_GTM_ID || process.env.GTM_CONTAINER_ID || '';
  const rawGa4 =
    process.env.PUBLIC_GA4_ID || process.env.GA4_MEASUREMENT_ID || process.env.PUBLIC_GA_MEASUREMENT_ID || '';

  const gtmIds = parseIdList(rawGtm, normaliseGtmId);
  let ga4Ids = parseIdList(rawGa4, normaliseGa4Id);

  // Compat: G-… pasted into PUBLIC_GTM_ID when no dedicated GA4 list
  if (!ga4Ids.length && !gtmIds.length) {
    ga4Ids = parseIdList(rawGtm, normaliseGa4Id);
  }

  return mergeSnippets([
    ...gtmIds.map((id) => snippetsFromGtmId(id)),
    snippetsFromGa4Ids(ga4Ids),
  ]);
}

/**
 * Effective tags for the public runtime loader (and optional SSR inject).
 * Priority: FLOW/file (.data/.../gtm.json) → env snippets → PUBLIC_GTM_ID / PUBLIC_GA4_ID.
 */
export async function resolveEffectiveGtmConfig(rootDir: string): Promise<{
  headScript: string;
  bodyHtml: string;
  footerScript: string;
  source: 'file' | 'env-snippets' | 'env-id' | 'none';
}> {
  const file = await readGlobalGtmConfig(rootDir);
  if (configHasSnippets(file)) {
    return {
      headScript: sanitiseGtmSnippet(file!.headScript || ''),
      bodyHtml: sanitiseGtmSnippet(file!.bodyHtml || ''),
      footerScript: sanitiseGtmSnippet(file!.footerScript || ''),
      source: 'file',
    };
  }

  const envHead = sanitiseGtmSnippet(process.env.GTM_HEAD_SCRIPT || '');
  const envBody = sanitiseGtmSnippet(process.env.GTM_BODY_HTML || '');
  const envFooter = sanitiseGtmSnippet(process.env.GTM_FOOTER_SCRIPT || '');
  if (envHead || envBody || envFooter) {
    return {
      headScript: envHead,
      bodyHtml: envBody,
      footerScript: envFooter,
      source: 'env-snippets',
    };
  }

  const fromIds = snippetsFromEnvIds();
  if (fromIds.headScript || fromIds.bodyHtml || fromIds.footerScript) {
    return { ...fromIds, source: 'env-id' };
  }

  return { headScript: '', bodyHtml: '', footerScript: '', source: 'none' };
}
