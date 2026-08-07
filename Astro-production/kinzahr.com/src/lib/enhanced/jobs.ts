/**
 * Per-script job defaults ported from enhanced/*.php.
 * Env overrides (GOOGLE_ADS_CUSTOMER_ID / GOOGLE_ADS_CONVERSION_ACTION) still win when set,
 * but leave them unset when hosting multiple brand scripts on one origin.
 */

export type EnhancedDateWindow =
  | { kind: 'last_n_days'; days: number }
  | { kind: 'last_n_months'; months: number };

export type EnhancedJobConfig = {
  /** URL basename including .php for cron compatibility */
  id: string;
  label: string;
  defaultCustomerId: string;
  defaultConversionAction: string;
  domainFieldValue: number;
  /** Optional Pipedrive stage custom-field filter */
  stageFieldValue?: number;
  dateWindow: EnhancedDateWindow;
};

export const FIELD_DOMAIN_ID = 'af2182f3f2ee03a51c7dcfd898951a268787343c';
export const FIELD_GCLID = 'd3a15df8cde497d2eb39515f9488f681440cca92';
export const FIELD_STAGE_ID = '2bf691138808151f3d2c838e0a81350ebe4e89ce';

const JOBS: EnhancedJobConfig[] = [
  {
    id: 'kinzahr.php',
    label: 'Kinza HR',
    defaultCustomerId: '7861417556',
    defaultConversionAction: 'customers/7861417556/conversionActions/6867057737',
    domainFieldValue: 173,
    // 12h cron: 2-day lookback (overlap beats missing a delayed deal / timezone edge).
    dateWindow: { kind: 'last_n_days', days: 2 },
  },
  {
    id: 'cfm.php',
    label: 'Connect FM',
    defaultCustomerId: '9134507535',
    defaultConversionAction: 'customers/9134507535/conversionActions/7536020852',
    domainFieldValue: 5214,
    dateWindow: { kind: 'last_n_days', days: 2 },
  },
  {
    id: 'chr.php',
    label: 'Connect HR',
    defaultCustomerId: '7813294713',
    defaultConversionAction: 'customers/7813294713/conversionActions/6777387272',
    domainFieldValue: 172,
    dateWindow: { kind: 'last_n_days', days: 2 },
  },
  {
    id: 'ib.php',
    label: 'Iberia',
    defaultCustomerId: '6795321807',
    defaultConversionAction: 'customers/6795321807/conversionActions/7060825869',
    domainFieldValue: 374,
    dateWindow: { kind: 'last_n_days', days: 2 },
  },
  {
    id: 'cr.php',
    label: 'Connect Resources (B2C)',
    defaultCustomerId: '5193058564',
    defaultConversionAction: 'customers/5193058564/conversionActions/6771944810',
    domainFieldValue: 160,
    stageFieldValue: 5100,
    dateWindow: { kind: 'last_n_days', days: 2 },
  },
  {
    id: 'crnew.php',
    label: 'Connect Resources (B2C) — same window as cr.php (kept for old cron URL)',
    defaultCustomerId: '5193058564',
    defaultConversionAction: 'customers/5193058564/conversionActions/6771944810',
    domainFieldValue: 160,
    stageFieldValue: 5100,
    dateWindow: { kind: 'last_n_days', days: 2 },
  },
  {
    id: 'crb2b.php',
    label: 'Connect Resources (B2B)',
    defaultCustomerId: '5193058564',
    defaultConversionAction: 'customers/5193058564/conversionActions/7065011011',
    domainFieldValue: 160,
    stageFieldValue: 5099,
    dateWindow: { kind: 'last_n_days', days: 2 },
  },
  {
    id: 'crb2bnew.php',
    label: 'Connect Resources (B2B) — same window as crb2b.php (kept for old cron URL)',
    defaultCustomerId: '5193058564',
    defaultConversionAction: 'customers/5193058564/conversionActions/7065011011',
    domainFieldValue: 160,
    stageFieldValue: 5099,
    dateWindow: { kind: 'last_n_days', days: 2 },
  },
];

const BY_ID = new Map(JOBS.map((job) => [job.id, job]));

export function listEnhancedJobs(): EnhancedJobConfig[] {
  return [...JOBS];
}

export function getEnhancedJob(fileName: string): EnhancedJobConfig | null {
  const name = String(fileName || '').trim().toLowerCase();
  return BY_ID.get(name) || null;
}

export function resolveDateWindow(window: EnhancedDateWindow): { start: string; end: string } {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  if (window.kind === 'last_n_days') {
    start.setDate(start.getDate() - window.days);
  } else {
    start.setMonth(start.getMonth() - window.months);
  }
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end) };
}
