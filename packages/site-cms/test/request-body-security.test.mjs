import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isRequestBodyTooLargeError,
  readRequestBodyLimited,
  replayRequestWithBody,
  requestWithLimitedBody,
} from '../src/http/request-body.ts';

test('streams and concatenates a legitimate body within the byte limit', async () => {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('{"name":'));
      controller.enqueue(new TextEncoder().encode('"Ada"}'));
      controller.close();
    },
  });
  const request = new Request('https://example.test/contact', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: stream,
    duplex: 'half',
  });

  const result = await readRequestBodyLimited(request, 64);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(new TextDecoder().decode(result.bytes), '{"name":"Ada"}');

  const replay = replayRequestWithBody(request, result.bytes);
  assert.deepEqual(await replay.json(), { name: 'Ada' });
});

test('cancels a chunked body as soon as the limit is exceeded', async () => {
  let pulls = 0;
  let cancelled = false;
  const stream = new ReadableStream({
    pull(controller) {
      pulls += 1;
      controller.enqueue(new Uint8Array(8));
    },
    cancel() {
      cancelled = true;
    },
  }, { highWaterMark: 0 });
  const request = new Request('https://example.test/contact', {
    method: 'POST',
    body: stream,
    duplex: 'half',
  });

  const result = await readRequestBodyLimited(request, 15);
  assert.deepEqual(result, { ok: false, reason: 'too_large' });
  assert.equal(cancelled, true);
  assert.equal(pulls, 2);
});

test('preserves multipart parsing after a limited streaming read', async () => {
  const source = new FormData();
  source.set('name', 'Ada');
  source.set('message', 'Hello');
  const original = new Request('https://example.test/contact', { method: 'POST', body: source });
  const result = await readRequestBodyLimited(original, 4_096);
  assert.equal(result.ok, true);
  if (!result.ok) return;

  const parsed = await replayRequestWithBody(original, result.bytes).formData();
  assert.equal(parsed.get('name'), 'Ada');
  assert.equal(parsed.get('message'), 'Hello');
});

test('rejects invalid limits before reading', async () => {
  const request = new Request('https://example.test/contact', { method: 'POST', body: 'x' });
  await assert.rejects(() => readRequestBodyLimited(request, -1), /maxBytes/);
});

test('limits a parser stream without read-then-replay buffering', async () => {
  let cancelled = false;
  const stream = new ReadableStream({
    pull(controller) {
      controller.enqueue(new Uint8Array(8));
    },
    cancel() {
      cancelled = true;
    },
  }, { highWaterMark: 0 });
  const request = new Request('https://example.test/contact', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: stream,
    duplex: 'half',
  });

  const limitedRequest = requestWithLimitedBody(request, 15);
  await assert.rejects(
    () => limitedRequest.arrayBuffer(),
    (error) => isRequestBodyTooLargeError(error),
  );
  assert.equal(cancelled, true);
});

test('rejects an oversized declared length before consuming its body', () => {
  const request = new Request('https://example.test/contact', {
    method: 'POST',
    headers: { 'content-length': '65' },
    body: 'small',
  });
  assert.throws(
    () => requestWithLimitedBody(request, 64),
    (error) => isRequestBodyTooLargeError(error),
  );
});
