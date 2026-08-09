import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createSiteScopedInternalJobAuthHeaders,
  getInternalJobSecretIssue,
  internalJson,
  isInternalJobAuthorized,
  verifySiteScopedInternalJobRequest,
} from '../src/auth/internal-job.ts';

const STRONG_SECRET = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const SITE_ID = 'example-site';
const SCOPE = 'gtm:write';

async function signedRequest(args: {
  body?: string;
  contentType?: string;
  nonce: string;
  timestamp?: number;
  url?: string;
  method?: string;
  secret?: string;
}): Promise<Request> {
  const request = new Request(args.url || 'https://example.test/api/internal/gtm/save', {
    method: args.method || 'POST',
    body: args.body ?? 'gtmIds=GTM-ABCDEFG',
    headers: { 'content-type': args.contentType || 'application/x-www-form-urlencoded' },
  });
  const authHeaders = await createSiteScopedInternalJobAuthHeaders(request, {
    secret: args.secret || STRONG_SECRET,
    siteId: SITE_ID,
    scope: SCOPE,
    timestamp: args.timestamp,
    nonce: args.nonce,
  });
  authHeaders.forEach((value, name) => request.headers.set(name, value));
  return request;
}

test('strong-secret validation rejects weak and documented placeholder material', () => {
  assert.equal(getInternalJobSecretIssue(''), 'missing');
  assert.equal(getInternalJobSecretIssue('short-shared-secret'), 'too-short');
  assert.equal(getInternalJobSecretIssue('change-me-to-a-unique-production-secret-1234'), 'placeholder');
  assert.equal(getInternalJobSecretIssue('a'.repeat(32)), 'repeated-character');
  assert.equal(getInternalJobSecretIssue(STRONG_SECRET), null);
});

test('legacy authentication remains backward compatible', () => {
  const request = new Request('https://example.test/api/internal/leads', {
    headers: { authorization: 'Bearer legacy-secret' },
  });
  assert.equal(isInternalJobAuthorized(request, 'legacy-secret'), true);
  assert.equal(isInternalJobAuthorized(request, 'different-secret'), false);

  const rawAuthorization = new Request('https://example.test/api/internal/leads', {
    headers: { authorization: 'legacy-secret' },
  });
  assert.equal(isInternalJobAuthorized(rawAuthorization, 'legacy-secret'), true);

  const validLegacyHeaderWithUnrelatedBearer = new Request(
    'https://example.test/api/internal/leads',
    {
      headers: {
        authorization: 'Bearer unrelated-credential',
        'x-internal-job-secret': 'legacy-secret',
      },
    },
  );
  assert.equal(isInternalJobAuthorized(validLegacyHeaderWithUnrelatedBearer, 'legacy-secret'), true);
});

test('internal JSON responses retain no-store and noindex protections', () => {
  const response = internalJson({ success: true });
  assert.equal(response.headers.get('cache-control'), 'no-store, private');
  assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive, nosnippet');
});

test('site-scoped signature binds site, method, path/query, body, timestamp, and nonce', async () => {
  const timestamp = Math.floor(Date.now() / 1_000);
  const request = await signedRequest({ nonce: 'nonce-0000000000000001', timestamp });
  assert.equal(new URL(request.url).pathname, '/api/internal/gtm/save');
  assert.deepEqual(
    await verifySiteScopedInternalJobRequest(request, {
      secret: STRONG_SECRET,
      siteId: SITE_ID,
      scope: SCOPE,
    }),
    { authorized: true },
  );

  const replay = await verifySiteScopedInternalJobRequest(request, {
    secret: STRONG_SECRET,
    siteId: SITE_ID,
    scope: SCOPE,
  });
  assert.deepEqual(replay, { authorized: false, reason: 'replay' });

  const pathSigned = await signedRequest({ nonce: 'nonce-0000000000000002', timestamp });
  const changedPath = new Request('https://example.test/api/internal/gtm/save?changed=1', {
    method: 'POST',
    body: 'gtmIds=GTM-ABCDEFG',
    headers: pathSigned.headers,
  });
  assert.deepEqual(
    await verifySiteScopedInternalJobRequest(changedPath, {
      secret: STRONG_SECRET,
      siteId: SITE_ID,
      scope: SCOPE,
    }),
    { authorized: false, reason: 'invalid-signature' },
  );

  const bodySigned = await signedRequest({ nonce: 'nonce-0000000000000003', timestamp });
  const changedBody = new Request(bodySigned.url, {
    method: 'POST',
    body: 'gtmIds=GTM-ATTACKER',
    headers: bodySigned.headers,
  });
  assert.deepEqual(
    await verifySiteScopedInternalJobRequest(changedBody, {
      secret: STRONG_SECRET,
      siteId: SITE_ID,
      scope: SCOPE,
    }),
    { authorized: false, reason: 'invalid-signature' },
  );

  const contentTypeSigned = await signedRequest({ nonce: 'nonce-0000000000000006', timestamp });
  const changedContentType = new Request(contentTypeSigned.url, {
    method: 'POST',
    body: 'gtmIds=GTM-ABCDEFG',
    headers: contentTypeSigned.headers,
  });
  changedContentType.headers.set('content-type', 'application/json');
  assert.deepEqual(
    await verifySiteScopedInternalJobRequest(changedContentType, {
      secret: STRONG_SECRET,
      siteId: SITE_ID,
      scope: SCOPE,
    }),
    { authorized: false, reason: 'invalid-signature' },
  );
});

test('site-scoped signature preserves case-sensitive Content-Type boundary values', async () => {
  const timestamp = Math.floor(Date.now() / 1_000);
  const boundary = 'AstroBoundaryCaseSensitive123';
  const body = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="gtmIds"',
    '',
    'GTM-ABCDEFG',
    `--${boundary}--`,
    '',
  ].join('\r\n');
  const signed = await signedRequest({
    body,
    contentType: `multipart/form-data; boundary=${boundary}`,
    nonce: 'nonce-0000000000000007',
    timestamp,
  });
  assert.deepEqual(
    await verifySiteScopedInternalJobRequest(signed, {
      secret: STRONG_SECRET,
      siteId: SITE_ID,
      scope: SCOPE,
    }),
    { authorized: true },
  );
  const changedBoundaryCase = new Request(signed.url, {
    method: signed.method,
    body,
    headers: signed.headers,
  });
  changedBoundaryCase.headers.set(
    'content-type',
    `multipart/form-data; boundary=${boundary.toLowerCase()}`,
  );

  assert.deepEqual(
    await verifySiteScopedInternalJobRequest(changedBoundaryCase, {
      secret: STRONG_SECRET,
      siteId: SITE_ID,
      scope: SCOPE,
    }),
    { authorized: false, reason: 'invalid-signature' },
  );
});

test('site-scoped signatures are accepted only from Authorization bearer', async () => {
  const timestamp = Math.floor(Date.now() / 1_000);
  const signed = await signedRequest({ nonce: 'nonce-0000000000000008', timestamp });
  const signature = signed.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  signed.headers.delete('authorization');
  signed.headers.set('x-internal-job-secret', signature);

  assert.deepEqual(
    await verifySiteScopedInternalJobRequest(signed, {
      secret: STRONG_SECRET,
      siteId: SITE_ID,
      scope: SCOPE,
    }),
    { authorized: false, reason: 'invalid-signature' },
  );
});

test('site-scoped authentication rejects weak secrets, wrong sites, and expired signatures', async () => {
  const timestamp = Math.floor(Date.now() / 1_000);
  const valid = await signedRequest({ nonce: 'nonce-0000000000000004', timestamp });

  assert.deepEqual(
    await verifySiteScopedInternalJobRequest(valid, {
      secret: 'short-shared-secret',
      siteId: SITE_ID,
      scope: SCOPE,
    }),
    { authorized: false, reason: 'weak-secret' },
  );

  assert.deepEqual(
    await verifySiteScopedInternalJobRequest(valid, {
      secret: STRONG_SECRET,
      siteId: 'other-site',
      scope: SCOPE,
    }),
    { authorized: false, reason: 'invalid-site' },
  );

  const expiredTimestamp = timestamp - 301;
  const expired = await signedRequest({ nonce: 'nonce-0000000000000005', timestamp: expiredTimestamp });
  assert.deepEqual(
    await verifySiteScopedInternalJobRequest(expired, {
      secret: STRONG_SECRET,
      siteId: SITE_ID,
      scope: SCOPE,
    }),
    { authorized: false, reason: 'expired' },
  );
});
