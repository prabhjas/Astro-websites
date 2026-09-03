import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { test } from 'node:test';

import {
  buildFlowSignedString,
  flowSigningHeaders,
  sha256Hex,
  signFlowRequest,
  FLOW_SIGNATURE_HEADER,
  FLOW_TIMESTAMP_HEADER,
} from '../src/leads/destinations/flow-signing.ts';

const SECRET = 'flwsig_test_secret_value';
const PATH = '/api/sales/leads';

test('body digest of the empty string matches the published SHA-256 constant', () => {
  assert.equal(sha256Hex(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
});

test('canonical string has exactly the shape the Flow spec documents', () => {
  const signed = buildFlowSignedString('1756843600', 'post', PATH, 'abc123');
  assert.equal(signed, 'v1:1756843600:POST:/api/sales/leads:abc123');
});

test('signature matches Flow’s own published Node reference implementation', () => {
  const envelope = { idempotency_key: 'cr-2026-09-02-0001', site_id: 'connectresources' };
  const body = JSON.stringify(envelope);
  const ts = 1756843600;

  // Reference implementation, transcribed verbatim from docs/SALES_LEAD_INTAKE_API.md 4b.
  const digest = crypto.createHash('sha256').update(body, 'utf8').digest('hex');
  const signedString = `v1:${ts}:POST:/api/sales/leads:${digest}`;
  const expected = crypto.createHmac('sha256', SECRET).update(signedString, 'utf8').digest('hex');

  const actual = signFlowRequest({ secret: SECRET, method: 'POST', pathWithQuery: PATH, body, nowSeconds: ts });

  assert.equal(actual.bodyDigest, digest);
  assert.equal(actual.signedString, signedString);
  assert.equal(actual.signature, `v1=${expected}`);
});

test('one changed byte in the body produces a different signature', () => {
  const ts = 1756843600;
  const a = signFlowRequest({ secret: SECRET, method: 'POST', pathWithQuery: PATH, body: '{"a":1}', nowSeconds: ts });
  const b = signFlowRequest({ secret: SECRET, method: 'POST', pathWithQuery: PATH, body: '{"a":2}', nowSeconds: ts });
  assert.notEqual(a.signature, b.signature);
});

test('the timestamp is inside the signature, so a captured request cannot be re-dated', () => {
  const body = '{"a":1}';
  const a = signFlowRequest({ secret: SECRET, method: 'POST', pathWithQuery: PATH, body, nowSeconds: 1756843600 });
  const b = signFlowRequest({ secret: SECRET, method: 'POST', pathWithQuery: PATH, body, nowSeconds: 1756843601 });
  assert.notEqual(a.signature, b.signature);
});

test('query string is part of the signed path', () => {
  const ts = 1756843600;
  const a = signFlowRequest({ secret: SECRET, method: 'GET', pathWithQuery: '/api/sales/leads/reconcile?since=2026-09-01T00:00:00Z', nowSeconds: ts });
  const b = signFlowRequest({ secret: SECRET, method: 'GET', pathWithQuery: '/api/sales/leads/reconcile?since=2026-09-02T00:00:00Z', nowSeconds: ts });
  assert.notEqual(a.signature, b.signature);
  // A GET signs the digest of the empty string.
  assert.equal(a.bodyDigest, sha256Hex(''));
});

test('headers carry the exact names Flow expects', () => {
  const signed = signFlowRequest({ secret: SECRET, method: 'POST', pathWithQuery: PATH, body: '{}', nowSeconds: 1756843600 });
  const headers = flowSigningHeaders(signed);
  assert.equal(headers[FLOW_TIMESTAMP_HEADER], '1756843600');
  assert.match(headers[FLOW_SIGNATURE_HEADER], /^v1=[0-9a-f]{64}$/);
});

test('refuses an absolute URL, which would sign the wrong string', () => {
  assert.throws(
    () => signFlowRequest({ secret: SECRET, method: 'POST', pathWithQuery: 'https://flow.connectgroup.co/api/sales/leads', body: '{}' }),
    /must be a path/,
  );
});

test('refuses an empty signing secret rather than sending an unsigned-but-present header', () => {
  assert.throws(() => signFlowRequest({ secret: '', method: 'POST', pathWithQuery: PATH, body: '{}' }), /required/);
});
