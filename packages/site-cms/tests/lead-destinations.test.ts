import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  deriveDeliveryStatus,
  isDue,
  normaliseDeliveries,
} from '../src/leads/destinations/types.ts';
import { buildFlowEnvelope, serialiseFlowEnvelope } from '../src/leads/destinations/flow-envelope.ts';
import { assertHttpsBaseUrl } from '../src/leads/destinations/flow.ts';
import type { LeadSubmissionRecord } from '../src/leads/types.ts';

function record(overrides: Partial<LeadSubmissionRecord> = {}): LeadSubmissionRecord {
  return {
    id: 'id-1',
    publicId: '01853982-3d5a-4532-8c8a-f8236aecea3e',
    requestId: 'req-1',
    idempotencyKey: 'k',
    formId: 'contact-form',
    formName: 'Contact',
    submissionStatus: 'stored',
    deliveryStatus: 'pending',
    payload: { fullName: 'A Person', email: 'a@example.com', phone: '+971500000000', message: 'hello' },
    attributionPayload: {},
    firstTouchPayload: {},
    lastTouchPayload: {},
    landingPageUrl: '',
    submissionPageUrl: '',
    referrerUrl: '',
    gclid: 'G-1', gbraid: '', wbraid: '', fbclid: '', msclkid: '',
    campaignId: '', adgroupId: '', groupId: '', creativeId: '', keyword: '',
    matchtype: '', device: '', network: '', placement: '', target: '', source: '',
    utmSource: '', utmMedium: '', utmCampaign: '', utmTerm: '', utmContent: '',
    deliveryAttemptCount: 0,
    createdAt: '2026-09-03T10:00:00.000Z',
    updatedAt: '2026-09-03T10:00:00.000Z',
    ...overrides,
  } as LeadSubmissionRecord;
}

test('legacy records without a deliveries map are read as a pipedrive delivery', () => {
  const r = record({ deliveryStatus: 'delivered', deliveryAttemptCount: 1, pipedriveLeadId: 'L1', pipedrivePersonId: 42 });
  const d = normaliseDeliveries(r);
  assert.equal(d.pipedrive.status, 'delivered');
  assert.equal(d.pipedrive.externalId, 'L1');
  assert.equal(d.pipedrive.externalRefs?.personId, '42');
});

test('an already-delivered destination is NEVER re-sent (Pipedrive has no idempotency key)', () => {
  const delivered = { status: 'delivered' as const, attemptCount: 1, deliveredAt: '2026-09-03T10:00:00.000Z' };
  assert.equal(isDue(delivered, '2026-09-03T12:00:00.000Z'), false);
});

test('a scheduled retry is due only once its time has passed', () => {
  const scheduled = { status: 'retry_scheduled' as const, attemptCount: 1, nextRetryAt: '2026-09-03T11:00:00.000Z' };
  assert.equal(isDue(scheduled, '2026-09-03T10:59:00.000Z'), false);
  assert.equal(isDue(scheduled, '2026-09-03T11:00:01.000Z'), true);
});

test('a never-attempted destination is due', () => {
  assert.equal(isDue(undefined, '2026-09-03T10:00:00.000Z'), true);
});

test('a permanently failed destination is not retried', () => {
  assert.equal(isDue({ status: 'failed', attemptCount: 1 }, '2026-09-03T12:00:00.000Z'), false);
});

test('record status is delivered only when EVERY destination succeeded', () => {
  const both = { pipedrive: { status: 'delivered' as const, attemptCount: 1 }, flow: { status: 'delivered' as const, attemptCount: 1 } };
  assert.equal(deriveDeliveryStatus(both), 'delivered');

  const half = { pipedrive: { status: 'delivered' as const, attemptCount: 1 }, flow: { status: 'retry_scheduled' as const, attemptCount: 1 } };
  assert.notEqual(deriveDeliveryStatus(half), 'delivered');
  assert.equal(deriveDeliveryStatus(half), 'retry_scheduled');
});

test('envelope uses publicId as the idempotency key', () => {
  const e = buildFlowEnvelope(record(), { siteId: 'connectgroup' });
  assert.equal(e.idempotency_key, '01853982-3d5a-4532-8c8a-f8236aecea3e');
  assert.equal(e.site_id, 'connectgroup');
  assert.equal(e.schema_version, 1);
});

test('consent is OMITTED entirely — our checkbox is terms, not Google consent mode', () => {
  const e = buildFlowEnvelope(record({ payload: { consent: false } as never }), { siteId: 's' });
  assert.equal('consent' in e, false, 'sending consent:false would record a refusal that never happened');
});

test('empty fields are dropped rather than sent as blanks', () => {
  const e = buildFlowEnvelope(record(), { siteId: 's' });
  const campaign = e.campaign as Record<string, unknown> | undefined;
  assert.equal(campaign, undefined, 'all campaign fields were empty, so the group should be absent');
  assert.deepEqual(e.click_ids, { gclid: 'G-1' });
});

test('an oversize body is trimmed to fit rather than taking a permanent 413', () => {
  const big = record({ payload: { fullName: 'A', message: 'x'.repeat(40_000) } as never });
  const e = buildFlowEnvelope(big, { siteId: 's' });
  const { body, trimmed } = serialiseFlowEnvelope(e, 15360);
  assert.equal(trimmed, true);
  assert.ok(Buffer.byteLength(body, 'utf8') <= 15360, `body was ${Buffer.byteLength(body, 'utf8')} bytes`);
  assert.match(body, /message truncated/);
});

test('a normal body is not trimmed', () => {
  const { body, trimmed } = serialiseFlowEnvelope(buildFlowEnvelope(record(), { siteId: 's' }), 15360);
  assert.equal(trimmed, false);
  assert.ok(Buffer.byteLength(body, 'utf8') < 2000);
});

test('a non-https ingest URL is refused at start-up, not silently at runtime', () => {
  assert.throws(() => assertHttpsBaseUrl('http://flow.connectgroup.co'), /must be https/);
  assert.doesNotThrow(() => assertHttpsBaseUrl('https://flow.connectgroup.co'));
});

test('every destination skipped is the file-only mode, not a delivery', () => {
  assert.equal(deriveDeliveryStatus({ pipedrive: { status: 'skipped', attemptCount: 0 } }), 'skipped');
});

test('delivered alongside skipped still counts as delivered', () => {
  assert.equal(
    deriveDeliveryStatus({
      pipedrive: { status: 'skipped', attemptCount: 0 },
      flow: { status: 'delivered', attemptCount: 1 },
    }),
    'delivered',
  );
});

test('a skipped destination is re-evaluated, so credentials added later start delivering', () => {
  assert.equal(isDue({ status: 'skipped', attemptCount: 0 }, '2026-09-03T12:00:00.000Z'), true);
});
