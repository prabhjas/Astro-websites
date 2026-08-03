import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { normaliseAttribution } from '../src/lib/attribution/server.ts';
import { FileLeadStore } from '../src/lib/leads/file-store.ts';
import { getNextRetryAt } from '../src/lib/leads/retry-policy.ts';

describe('normaliseAttribution', () => {
  it('normalises supported attribution keys and metadata', () => {
    const result = normaliseAttribution({
      gclid: 'abc123',
      campaignid: 'cmp-1',
      adgroupid: 'grp-2',
      creative: 'cr-3',
      initial_url: 'https://example.com/landing',
      page_url: 'https://example.com/contact',
      referrer_url: 'https://google.com',
      form_id: 'lead-form',
    });

    assert.equal(result.gclid, 'abc123');
    assert.equal(result.campaign_id, 'cmp-1');
    assert.equal(result.adgroup_id, 'grp-2');
    assert.equal(result.creative_id, 'cr-3');
    assert.equal(result.landing_page_url, 'https://example.com/landing');
    assert.equal(result.submission_page_url, 'https://example.com/contact');
    assert.equal(result.referrer, 'https://google.com');
    assert.equal(result.form_id, 'lead-form');
  });
});

describe('retry policy', () => {
  it('returns a future retry time for known attempt counts', () => {
    const now = Date.UTC(2026, 0, 1, 0, 0, 0);
    const next = getNextRetryAt(1, now);
    assert.equal(next, '2026-01-01T00:01:00.000Z');
  });
});

describe('FileLeadStore', () => {
  it('stores and reloads lead state', async () => {
    const rootDir = await mkdtemp(join(tmpdir(), 'astro-leads-'));
    const store = new FileLeadStore({ rootDir, maxFileBytes: 1024 });

    const record = {
      id: 'internal-1',
      publicId: 'public-1',
      requestId: 'req-1',
      idempotencyKey: 'public-1',
      formId: 'contact-form',
      formName: 'Contact Form',
      submissionStatus: 'stored',
      deliveryStatus: 'pending',
      payload: {
        fullName: 'Jane Doe',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        phone: '+971501234567',
        message: 'Hello',
        company: '',
        location: '',
        country: '',
        city: '',
        postcode: '',
        campaign: '',
        campaignId: '',
        leadSource: '',
        formName: 'Contact Form',
        formSource: '',
        pageUrl: '',
        referrerUrl: '',
        utmSource: '',
        utmMedium: '',
        utmCampaign: '',
        utmTerm: '',
        utmContent: '',
        gclid: '',
        gbraid: '',
        wbraid: '',
        fbclid: '',
        msclkid: '',
        nationality: '',
        countryCode: '',
        professionSector: '',
        locPhysicalMs: '',
        locInterestMs: '',
        adposition: '',
        targetId: '',
        placement: '',
        network: '',
        device: '',
        matchtype: '',
        keyword: '',
        creativeId: '',
        adgroupId: '',
        groupId: '',
        target: '',
        source: '',
        firstTouchPayload: '',
        lastTouchPayload: '',
        firstVisitAt: '',
        latestVisitAt: '',
        landingPageUrl: '',
        submissionPageUrl: '',
        formId: 'contact-form',
        submissionId: 'public-1',
        consent: false,
        submittedAt: '2026-07-28T00:00:00.000Z',
      },
      attributionPayload: {},
      firstTouchPayload: {},
      lastTouchPayload: {},
      landingPageUrl: '',
      submissionPageUrl: '',
      referrerUrl: '',
      gclid: '',
      gbraid: '',
      wbraid: '',
      fbclid: '',
      msclkid: '',
      campaignId: '',
      adgroupId: '',
      groupId: '',
      creativeId: '',
      keyword: '',
      matchtype: '',
      device: '',
      network: '',
      placement: '',
      target: '',
      source: '',
      utmSource: '',
      utmMedium: '',
      utmCampaign: '',
      utmTerm: '',
      utmContent: '',
      deliveryAttemptCount: 0,
      createdAt: '2026-07-28T00:00:00.000Z',
      updatedAt: '2026-07-28T00:00:00.000Z',
    };

    await store.storeSubmission(record);
    const loaded = await store.getSubmission('public-1');

    assert.ok(loaded);
    assert.equal(loaded?.publicId, 'public-1');

    const stateDir = await readdir(join(rootDir, 'state'));
    assert.equal(stateDir.includes('public-1.json'), true);

    const monthDir = await readdir(join(rootDir, 'submissions', '2026-07'));
    assert.equal(monthDir.length, 1);
    const logContents = await readFile(join(rootDir, 'submissions', '2026-07', monthDir[0]), 'utf8');
    assert.match(logContents, /lead_submission_stored/);
  });
});
