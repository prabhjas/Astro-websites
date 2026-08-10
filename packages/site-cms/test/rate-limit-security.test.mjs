import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getClientIp,
  isRateLimited,
  resetRateLimitStore,
} from '../src/http/rate-limit.ts';

test('enforces the existing five-request window and expires stale keys', () => {
  const originalNow = Date.now;
  let now = 1_000_000;
  Date.now = () => now;
  try {
    resetRateLimitStore();
    for (let index = 0; index < 5; index += 1) assert.equal(isRateLimited('client-1'), false);
    assert.equal(isRateLimited('client-1'), true);
    now += 60_001;
    assert.equal(isRateLimited('client-1'), false);
  } finally {
    Date.now = originalNow;
    resetRateLimitStore();
  }
});

test('bounds distributed keys and evicts the least recently used bucket', () => {
  const originalNow = Date.now;
  Date.now = () => 2_000_000;
  try {
    resetRateLimitStore();
    for (let index = 0; index < 5; index += 1) assert.equal(isRateLimited('oldest'), false);
    assert.equal(isRateLimited('oldest'), true);
    for (let index = 0; index < 10_000; index += 1) isRateLimited(`distributed-${index}`);
    assert.equal(isRateLimited('oldest'), false);
  } finally {
    Date.now = originalNow;
    resetRateLimitStore();
  }
});

test('rotating keys at capacity do not force a full expiry sweep per request', () => {
  const originalNow = Date.now;
  Date.now = () => 2_500_000;
  try {
    resetRateLimitStore();
    for (let index = 0; index < 10_000; index += 1) isRateLimited(`fill-${index}`);
    const originalIterator = Map.prototype[Symbol.iterator];
    let fullSweeps = 0;
    Map.prototype[Symbol.iterator] = function mapIterator() {
      fullSweeps += 1;
      return originalIterator.call(this);
    };
    try {
      for (let index = 0; index < 1_000; index += 1) isRateLimited(`rotate-${index}`);
    } finally {
      Map.prototype[Symbol.iterator] = originalIterator;
    }

    assert.equal(fullSweeps, 0);
  } finally {
    Date.now = originalNow;
    resetRateLimitStore();
  }
});

test('caps untrusted proxy keys before retaining them', () => {
  const longValue = '1'.repeat(512);
  const request = new Request('https://example.test/contact', {
    headers: { 'x-forwarded-for': `${longValue}, 203.0.113.10` },
  });
  assert.equal(getClientIp(request).length, 128);
});
