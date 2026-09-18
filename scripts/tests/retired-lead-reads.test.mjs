import test from 'node:test';
import assert from 'node:assert/strict';
import { RETIRED_LEAD_READ_PATHS, probeRetiredLeadRead } from '../lib/retired-lead-reads.mjs';

const BASE = 'https://site.example';
function stub(steps) {
  const calls = [];
  const cancellations = [];
  const fetchImpl = async (url, options) => {
    const step = steps[calls.length];
    calls.push({ url: String(url), options });
    assert.ok(step, 'No unexpected third request');
    if (step.error) throw new Error('untrusted transport detail');
    return {
      status: step.status,
      headers: new Headers(step.location ? { location: step.location } : {}),
      body: { async cancel() { cancellations.push(true); } },
      text() { throw new Error('Response body must not be read'); },
      json() { throw new Error('Response body must not be read'); },
    };
  };
  return { fetchImpl, calls, cancellations };
}

test('every retired endpoint spelling and export format accepts a direct 404', async () => {
  assert.equal(RETIRED_LEAD_READ_PATHS.length, 14);
  for (const path of RETIRED_LEAD_READ_PATHS) {
    const s = stub([{ status: 404 }]);
    const r = await probeRetiredLeadRead(BASE, path, s);
    assert.equal(r.pass, true, path);
    assert.deepEqual(r.statuses, [404]);
    assert.equal(s.calls[0].options.method, 'GET');
    assert.equal(s.calls[0].options.redirect, 'manual');
    assert.ok(s.calls[0].options.signal);
    assert.equal(s.cancellations.length, 1);
  }
});

test('only one exact same-origin canonical-slash redirect is accepted', async () => {
  for (const status of [301, 302, 303, 307, 308]) {
    const s = stub([{ status, location: '/api/internal/export-leads/?format=json' }, { status: 404 }]);
    const headers = { Authorization: 'Bearer synthetic-test-value' };
    const r = await probeRetiredLeadRead(BASE, '/api/internal/export-leads?format=json', { ...s, headers });
    assert.equal(r.pass, true);
    assert.deepEqual(r.statuses, [status, 404]);
    assert.equal(s.calls[1].url, `${BASE}/api/internal/export-leads/?format=json`);
    assert.equal(s.calls[1].options.headers, headers);
    assert.equal(s.cancellations.length, 2);
  }
});

test('live, denied, removed-with-wrong-status, and server-error responses all fail', async () => {
  for (const status of [200, 204, 401, 403, 410, 500]) {
    const s = stub([{ status }]);
    assert.equal((await probeRetiredLeadRead(BASE, '/api/internal/leads/', s)).pass, false);
    assert.equal(s.cancellations.length, 1);
  }
});

test('unsafe or altered redirects are rejected without following or forwarding auth', async () => {
  for (const location of [
    'https://other.example/api/internal/leads/', '//other.example/api/internal/leads/',
    `${BASE}/api/internal/leads/`, '/elsewhere/', '/api/internal/leads/',
    '/api/internal/leads/?limit=2', '/api/internal/leads/?limit=1&extra=1',
  ]) {
    const s = stub([{ status: 301, location }]);
    assert.equal((await probeRetiredLeadRead(BASE, '/api/internal/leads?limit=1', s)).pass, false);
    assert.equal(s.calls.length, 1);
  }
});

test('slash-suffixed paths cannot redirect and canonical targets must be 404', async () => {
  const slash = stub([{ status: 301, location: '/api/internal/leads//' }]);
  assert.equal((await probeRetiredLeadRead(BASE, '/api/internal/leads/', slash)).pass, false);
  assert.equal(slash.calls.length, 1);
  for (const status of [200, 403, 301, 410, 500]) {
    const s = stub([{ status: 301, location: '/api/internal/leads/' }, { status, location: '/api/internal/leads/' }]);
    assert.equal((await probeRetiredLeadRead(BASE, '/api/internal/leads', s)).pass, false);
    assert.equal(s.calls.length, 2);
  }
});

test('request failures produce only bounded non-sensitive evidence', async () => {
  const s = stub([{ error: true }]);
  assert.deepEqual(await probeRetiredLeadRead(BASE, '/api/internal/leads', s), {
    path: '/api/internal/leads', pass: false, statuses: [], reason: 'request-failed',
  });
});

test('rejects unrelated targets, embedded base credentials, and invalid timeout configuration', async () => {
  for (const path of ['/api/internal/leads/id', '/api/internal/gtm/', 'https://other.example/api/internal/leads', '/api/internal/leads#fragment']) {
    await assert.rejects(probeRetiredLeadRead(BASE, path), TypeError);
  }
  await assert.rejects(probeRetiredLeadRead('https://user:pass@site.example', '/api/internal/leads'), TypeError);
  await assert.rejects(probeRetiredLeadRead(BASE, 'https://user:pass@site.example/api/internal/leads'), TypeError);
  await assert.rejects(probeRetiredLeadRead(BASE, '/api/internal/leads', { timeoutMs: Infinity }), TypeError);
});
