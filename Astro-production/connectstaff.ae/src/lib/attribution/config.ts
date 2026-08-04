export const ATTRIBUTION_RETENTION_DAYS = 90;

export const ATTRIBUTION_PRIMARY_KEYS = [
  'gclid',
  'gbraid',
  'wbraid',
  'fbclid',
  'msclkid',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'campaign_id',
  'adgroup_id',
  'group_id',
  'creative_id',
  'keyword',
  'matchtype',
  'device',
  'network',
  'placement',
  'target',
  'adposition',
  'loc_physical_ms',
  'loc_interest_ms',
  'gad_source',
  'source',
] as const;

export type AttributionKey = (typeof ATTRIBUTION_PRIMARY_KEYS)[number];

export const ATTRIBUTION_KEY_ALIASES: Record<AttributionKey, string[]> = {
  gclid: ['gclid'],
  gbraid: ['gbraid'],
  wbraid: ['wbraid'],
  fbclid: ['fbclid'],
  msclkid: ['msclkid'],
  utm_source: ['utm_source'],
  utm_medium: ['utm_medium'],
  utm_campaign: ['utm_campaign'],
  utm_term: ['utm_term'],
  utm_content: ['utm_content'],
  campaign_id: ['campaign_id', 'campaignid', 'gad_campaignid', 'campaign'],
  adgroup_id: ['adgroup_id', 'adgroupid'],
  group_id: ['group_id', 'groupid'],
  creative_id: ['creative_id', 'creativeid', 'creative'],
  keyword: ['keyword', 'kw', 'q', 'utm_term'],
  matchtype: ['matchtype'],
  device: ['device'],
  network: ['network'],
  placement: ['placement', 'displayad'],
  target: ['target', 'targetid', 'target_id'],
  adposition: ['adposition', 'ad_position'],
  loc_physical_ms: ['loc_physical_ms', 'locphysicalms'],
  loc_interest_ms: ['loc_interest_ms', 'locinterestms'],
  gad_source: ['gad_source', 'gadsource'],
  source: ['source'],
};

export type AttributionValues = Partial<Record<AttributionKey, string>> & {
  referrer?: string;
  landing_page_url?: string;
  submission_page_url?: string;
  form_id?: string;
  form_name?: string;
  first_visit_at?: string;
  latest_visit_at?: string;
};

export const ATTRIBUTION_STORAGE_KEYS = {
  firstTouch: 'cg_attr_first_touch_v1',
  lastTouch: 'cg_attr_last_touch_v1',
  initialUrl: 'cg_initial_url_v1',
  latestUrl: 'cg_latest_url_v1',
} as const;

export const ATTRIBUTION_COOKIE_KEYS: AttributionKey[] = [
  'gclid',
  'gbraid',
  'wbraid',
  'fbclid',
  'msclkid',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'campaign_id',
  'adgroup_id',
  'creative_id',
  'keyword',
  'gad_source',
];
