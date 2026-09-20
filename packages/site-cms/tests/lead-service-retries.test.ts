import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { configureSiteCms, FEATURES_LEADS_ONLY, type LeadEnv, type PipedriveResult } from '../src/context.ts';
import { deliverStoredLead } from '../src/leads/service.ts';
import type { FileLeadStore } from '../src/leads/file-store.ts';
import type { DeliveryTrigger, DestinationDelivery, LeadDeliveryAttemptRecord, LeadSubmissionRecord } from '../src/leads/types.ts';

const FUTURE = '2099-01-01T00:00:00.000Z';
const PAST = '2000-01-01T00:00:00.000Z';

function record(overrides: Partial<LeadSubmissionRecord> = {}): LeadSubmissionRecord {
  return {
    id: 'synthetic-local-record',
    publicId: '01853982-3d5a-4532-8c8a-f8236aecea3e',
    requestId: 'synthetic-request',
    idempotencyKey: 'synthetic-browser-key',
    formId: 'synthetic-form',
    formName: 'Synthetic test',
    submissionStatus: 'stored',
    deliveryStatus: 'pending',
    deliveryAttemptCount: 0,
    payload: { fullName: 'Synthetic Contact', email: 'contact@example.invalid', message: 'Local test only' },
    attributionPayload: {}, firstTouchPayload: {}, lastTouchPayload: {},
    landingPageUrl: '', submissionPageUrl: '', referrerUrl: '',
    gclid: '', gbraid: '', wbraid: '', fbclid: '', msclkid: '',
    campaignId: '', adgroupId: '', groupId: '', creativeId: '', keyword: '',
    matchtype: '', device: '', network: '', placement: '', target: '', source: '',
    utmSource: '', utmMedium: '', utmCampaign: '', utmTerm: '', utmContent: '',
    createdAt: '2026-09-18T00:00:00.000Z', updatedAt: '2026-09-18T00:00:00.000Z',
    ...overrides,
  };
}

function harness(
  t: TestContext,
  extraEnv: Partial<LeadEnv> = {},
  pipedriveResult: PipedriveResult = { success: true, personId: 42, leadId: 'synthetic-pipedrive', retryable: false },
  flowStatus?: number,
) {
  // Never inherit destination settings from the shell running the test suite.
  const originalPipedriveEnabled = process.env.PIPEDRIVE_ENABLED;
  delete process.env.PIPEDRIVE_ENABLED;
  t.after(() => {
    if (originalPipedriveEnabled === undefined) delete process.env.PIPEDRIVE_ENABLED;
    else process.env.PIPEDRIVE_ENABLED = originalPipedriveEnabled;
  });
  const env: LeadEnv = {
    leadStoreDir: '/unused-synthetic-store', leadStoreMaxFileBytes: 1024,
    pipedriveApiToken: 'synthetic-token', pipedriveMaxRetryAttempts: 5,
    internalJobSecret: 'synthetic-internal-key', websiteId: 1,
    websiteName: 'Synthetic', formName: 'Synthetic',
    internalAdminDir: '/unused-synthetic-admin', internalUploadDir: '/unused-synthetic-uploads',
    internalUploadMaxFileBytes: 1024,
    flowEnabled: false, flowIngestUrl: 'https://flow.example.invalid',
    flowSiteId: 'synthetic', flowSiteDomain: 'site.example.invalid',
    flowToken: '', flowSigningSecret: '',
    ...extraEnv,
  };
  let pipedriveCalls = 0;
  const requests: Array<{ url: string; body: string }> = [];
  t.mock.method(globalThis, 'fetch', async (url: unknown, init?: RequestInit) => {
    requests.push({ url: String(url), body: String(init?.body ?? '') });
    if (flowStatus === undefined) throw new Error('Unexpected network request in synthetic test');
    return new Response(JSON.stringify(flowStatus < 300 ? { id: 'synthetic-flow' } : { reason: 'synthetic_rejection' }), { status: flowStatus });
  });
  configureSiteCms({
    siteId: 'synthetic', features: FEATURES_LEADS_ONLY, getLeadEnv: () => env,
    createPipedriveLead: async () => { pipedriveCalls++; return pipedriveResult; },
    sendFormNotification: async () => ({ sent: false, skipped: true }),
    logFormSuccess: () => {}, logPipedriveFailure: () => {}, logWarn: () => {},
  });
  const attempts: LeadDeliveryAttemptRecord[] = [];
  const saved: LeadSubmissionRecord[] = [];
  const store = {
    storeAttempt: async (attempt: LeadDeliveryAttemptRecord) => { attempts.push(attempt); },
    updateSubmission: async (submission: LeadSubmissionRecord) => { saved.push(submission); },
  } as unknown as FileLeadStore;
  return {
    requests, attempts, saved,
    pipedriveCalls: () => pipedriveCalls,
    deliver: (submission: LeadSubmissionRecord, trigger: DeliveryTrigger) =>
      deliverStoredLead(env, store, submission, 'synthetic-request', trigger),
  };
}

for (const trigger of ['manual_retry', 'bulk_retry'] as const) {
  for (const status of ['failed', 'dead_letter', 'retry_scheduled'] as const) {
    test(`${trigger} reattempts ${status}, including an exhausted count or future delay`, async (t) => {
      const h = harness(t);
      const original = record({ deliveries: { pipedrive: { status, attemptCount: 5, nextRetryAt: FUTURE } } });
      const updated = await h.deliver(original, trigger);
      assert.equal(h.pipedriveCalls(), 1);
      assert.equal(updated.deliveries?.pipedrive.status, 'delivered');
      assert.equal(updated.deliveries?.pipedrive.attemptCount, 6);
      assert.equal(updated.publicId, original.publicId);
      assert.deepEqual(updated.payload, original.payload);
      assert.equal(h.attempts[0]?.triggerType, trigger);
      assert.equal(h.saved.length, 1);
      assert.equal(h.requests.length, 0);
    });
  }
}

test('an explicit retry also works for a legacy failed record without a deliveries map', async (t) => {
  const h = harness(t);
  const updated = await h.deliver(record({ deliveryStatus: 'failed', deliveryAttemptCount: 1 }), 'manual_retry');
  assert.equal(h.pipedriveCalls(), 1);
  assert.equal(updated.deliveryStatus, 'delivered');
  assert.equal(updated.deliveryAttemptCount, 2);
  assert.equal(updated.pipedriveLeadId, 'synthetic-pipedrive');
});

const automaticSkips: Array<[string, DestinationDelivery]> = [
  ['permanent failure', { status: 'failed', attemptCount: 1 }],
  ['dead letter', { status: 'dead_letter', attemptCount: 5 }],
  ['future retry', { status: 'retry_scheduled', attemptCount: 1, nextRetryAt: FUTURE }],
  ['exhausted scheduled retry', { status: 'retry_scheduled', attemptCount: 5, nextRetryAt: PAST }],
  ['exhausted pending attempt', { status: 'pending', attemptCount: 5 }],
];
for (const [name, delivery] of automaticSkips) {
  test(`automatic retry skips ${name} while delivering the other destination`, async (t) => {
    const h = harness(t, { flowEnabled: true, flowToken: 'synthetic-token', flowSigningSecret: 'synthetic-signing-secret' }, undefined, 201);
    const original = record({ deliveries: { pipedrive: delivery } });
    const updated = await h.deliver(original, 'automatic_retry');
    assert.equal(h.pipedriveCalls(), 0);
    assert.deepEqual(updated.deliveries?.pipedrive, delivery);
    assert.equal(updated.deliveries?.flow.status, 'delivered');
    assert.equal(h.requests.length, 1);
    assert.equal(h.requests[0].url, 'https://flow.example.invalid/api/sales/leads');
    assert.equal(JSON.parse(h.requests[0].body).idempotency_key, original.publicId);
    assert.deepEqual(h.attempts.map((a) => a.destination), ['flow']);
  });
}

for (const trigger of ['initial', 'automatic_retry', 'manual_retry', 'bulk_retry'] as const) {
  for (const status of ['delivered', 'manually_resolved'] as const) {
    test(`${trigger} never resends ${status} destinations`, async (t) => {
      const h = harness(t, { flowEnabled: true, flowToken: 'synthetic-token', flowSigningSecret: 'synthetic-signing-secret' });
      const settled: DestinationDelivery = { status, attemptCount: 1, externalId: 'existing-destination-id' };
      const updated = await h.deliver(record({ deliveries: { pipedrive: settled, flow: settled } }), trigger);
      assert.equal(h.pipedriveCalls(), 0);
      assert.equal(h.requests.length, 0);
      assert.equal(h.attempts.length, 0);
      assert.deepEqual(updated.deliveries, { pipedrive: settled, flow: settled });
    });
  }
}

for (const [name, extraEnv] of [
  ['disabled', { flowEnabled: false, flowToken: 'synthetic-token', flowSigningSecret: 'synthetic-signing-secret' }],
  ['missing token', { flowEnabled: true, flowSigningSecret: 'synthetic-signing-secret' }],
  ['missing signing secret', { flowEnabled: true, flowToken: 'synthetic-token' }],
  ['missing both credentials', { flowEnabled: true }],
] as const) {
  test(`FLOW ${name} sends nothing and preserves Pipedrive and the local record`, async (t) => {
    const h = harness(t, extraEnv);
    const original = record();
    const updated = await h.deliver(original, 'initial');
    assert.equal(h.pipedriveCalls(), 1);
    assert.equal(h.requests.length, 0);
    assert.equal(updated.deliveryStatus, 'delivered');
    assert.equal(updated.pipedriveLeadId, 'synthetic-pipedrive');
    assert.equal(updated.pipedrivePersonId, 42);
    assert.equal(updated.publicId, original.publicId);
    assert.deepEqual(updated.payload, original.payload);
    assert.deepEqual(h.attempts.map((a) => a.destination), ['pipedrive']);
    assert.equal(h.saved[0], updated);
    if (extraEnv.flowEnabled) {
      assert.equal(updated.deliveries?.flow.status, 'skipped');
      assert.equal(updated.deliveries?.flow.attemptCount, 0);
      assert.equal(updated.deliveries?.flow.nextRetryAt, undefined);
    } else assert.equal(updated.deliveries?.flow, undefined);
  });
}

test('credentialless upgrade preserves a Pipedrive transient-failure retry', async (t) => {
  const h = harness(t, {}, { success: false, retryable: true, errorCode: 'synthetic_unavailable', error: 'Synthetic outage', statusCode: 503 });
  const updated = await h.deliver(record(), 'initial');
  assert.equal(h.pipedriveCalls(), 1);
  assert.equal(h.requests.length, 0);
  assert.equal(updated.deliveryStatus, 'retry_scheduled');
  assert.ok(updated.nextRetryAt);
  assert.equal(updated.deliveryAttemptCount, 1);
});

test('legacy delivered Pipedrive records keep their IDs and are not re-sent on manual retry', async (t) => {
  const h = harness(t);
  const updated = await h.deliver(record({ deliveryStatus: 'delivered', deliveryAttemptCount: 1, pipedriveLeadId: 'existing-lead', pipedrivePersonId: 7 }), 'manual_retry');
  assert.equal(h.pipedriveCalls(), 0);
  assert.equal(h.requests.length, 0);
  assert.equal(updated.pipedriveLeadId, 'existing-lead');
  assert.equal(updated.pipedrivePersonId, 7);
});

test('a FLOW permanent rejection is not automatically retried', async (t) => {
  const h = harness(t, { flowEnabled: true, flowToken: 'synthetic-token', flowSigningSecret: 'synthetic-signing-secret' }, undefined, 400);
  const failed = await h.deliver(record(), 'initial');
  assert.equal(failed.deliveries?.flow.status, 'failed');
  assert.equal(h.requests.length, 1);
  await h.deliver(failed, 'automatic_retry');
  assert.equal(h.requests.length, 1);
  assert.equal(h.pipedriveCalls(), 1);
});
