import type { DeliveryStatus, LeadSubmissionRecord } from './types';

export function getDeliveryStatusCount(records: LeadSubmissionRecord[], status: DeliveryStatus): number {
  return records.filter((record) => record.deliveryStatus === status).length;
}

export function formatDateTime(value?: string): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function getLeadDisplayName(record: LeadSubmissionRecord): string {
  const fullName = record.payload.fullName?.trim();
  if (fullName) return fullName;
  const joinedName = [record.payload.firstName, record.payload.lastName].filter(Boolean).join(' ').trim();
  if (joinedName) return joinedName;
  return record.payload.email || record.payload.phone || record.publicId;
}

export function getLeadSecondaryDetail(record: LeadSubmissionRecord): string {
  const parts = [
    record.formName || record.payload.formName,
    record.payload.email,
    record.payload.phone,
  ].filter((part) => Boolean(part && String(part).trim()));
  return parts.length ? parts.join(' · ') : '-';
}

export function getDeliveryStatusLabel(status: DeliveryStatus): string {
  switch (status) {
    case 'delivered':
      return 'Delivered to Pipedrive';
    case 'skipped':
      return 'Stored locally (Pipedrive skipped)';
    case 'retry_scheduled':
      return 'Retry scheduled';
    case 'failed':
      return 'Failed';
    case 'dead_letter':
      return 'Manual review needed';
    case 'manually_resolved':
      return 'Manually resolved';
    case 'processing':
      return 'Processing';
    default:
      return 'Pending';
  }
}

export function matchesLeadQuery(record: LeadSubmissionRecord, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [
    record.publicId,
    record.formName,
    getLeadDisplayName(record),
    record.payload.email,
    record.payload.phone,
    record.payload.company,
    record.payload.message,
    record.payload.location,
    record.payload.country,
    record.payload.city,
    record.payload.nationality,
    record.payload.campaign,
    record.payload.leadSource,
    record.utmCampaign,
    record.utmSource,
    record.utmMedium,
    record.lastErrorMessage,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(q));
}

export function toLeadCsv(records: LeadSubmissionRecord[]): string {
  const headers = [
    'submission_id',
    'created_at',
    'delivery_status',
    'delivery_status_label',
    'pipedrive_lead_id',
    'pipedrive_person_id',
    'delivered_at',
    'last_attempt_at',
    'next_retry_at',
    'attempt_count',
    'form_name',
    'full_name',
    'first_name',
    'last_name',
    'name',
    'email',
    'phone',
    'message',
    'company',
    'location',
    'country',
    'city',
    'postcode',
    'nationality',
    'country_code',
    'profession_sector',
    'campaign',
    'campaign_id',
    'lead_source',
    'form_source',
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'gclid',
    'gbraid',
    'wbraid',
    'fbclid',
    'msclkid',
    'adgroup_id',
    'group_id',
    'creative_id',
    'keyword',
    'matchtype',
    'device',
    'network',
    'placement',
    'target',
    'source',
    'referrer_url',
    'landing_page_url',
    'submission_page_url',
    'submitted_at',
    'last_error_code',
    'last_error',
  ];
  const rows = records.map((record) => [
    record.publicId,
    record.createdAt,
    record.deliveryStatus,
    getDeliveryStatusLabel(record.deliveryStatus),
    record.pipedriveLeadId || '',
    String(record.pipedrivePersonId ?? ''),
    record.deliveredAt || '',
    record.lastAttemptAt || '',
    record.nextRetryAt || '',
    String(record.deliveryAttemptCount),
    record.formName,
    record.payload.fullName,
    record.payload.firstName,
    record.payload.lastName,
    getLeadDisplayName(record),
    record.payload.email,
    record.payload.phone,
    record.payload.message,
    record.payload.company,
    record.payload.location,
    record.payload.country,
    record.payload.city,
    record.payload.postcode,
    record.payload.nationality,
    record.payload.countryCode,
    record.payload.professionSector,
    record.payload.campaign,
    record.payload.campaignId,
    record.payload.leadSource,
    record.payload.formSource,
    record.utmSource,
    record.utmMedium,
    record.utmCampaign,
    record.utmTerm,
    record.utmContent,
    record.gclid,
    record.gbraid,
    record.wbraid,
    record.fbclid,
    record.msclkid,
    record.adgroupId,
    record.groupId,
    record.creativeId,
    record.keyword,
    record.matchtype,
    record.device,
    record.network,
    record.placement,
    record.target,
    record.source,
    record.referrerUrl,
    record.landingPageUrl,
    record.submissionPageUrl,
    record.payload.submittedAt,
    record.lastErrorCode || '',
    record.lastErrorMessage || '',
  ]);
  return [headers, ...rows]
    .map((row) =>
      row
        .map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`)
        .join(','),
    )
    .join('\n');
}

export function toLeadJson(records: LeadSubmissionRecord[]): string {
  return JSON.stringify(records, null, 2);
}
