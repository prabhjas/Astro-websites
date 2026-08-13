import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  parseEnhancedDateQuery,
  parseIsoDate,
  resolveEnhancedDateRange,
  utcToday,
} from '../src/lib/enhanced/dates.ts';

const DEFAULT = { start: '2026-08-11', end: '2026-08-13' };

describe('parseIsoDate', () => {
  it('accepts a real UTC calendar day', () => {
    assert.equal(parseIsoDate('2026-08-06'), '2026-08-06');
  });

  it('rejects impossible and non-ISO values', () => {
    assert.equal(parseIsoDate('2026-08-32'), null);
    assert.equal(parseIsoDate('08-06-2026'), null);
    assert.equal(parseIsoDate(''), null);
  });
});

describe('parseEnhancedDateQuery', () => {
  it('returns undefined when no date params', () => {
    assert.equal(parseEnhancedDateQuery(new URLSearchParams('')), undefined);
  });

  it('reads date, start/end, and from/to aliases', () => {
    assert.deepEqual(parseEnhancedDateQuery(new URLSearchParams('date=2026-08-06')), {
      date: '2026-08-06',
      start: undefined,
      end: undefined,
    });
    assert.deepEqual(parseEnhancedDateQuery(new URLSearchParams('from=2026-08-06&to=2026-08-10')), {
      date: undefined,
      start: '2026-08-06',
      end: '2026-08-10',
    });
  });
});

describe('resolveEnhancedDateRange', () => {
  it('uses the default 2-day window when nothing is passed', () => {
    const got = resolveEnhancedDateRange(DEFAULT);
    assert.deepEqual(got, { start: '2026-08-11', end: '2026-08-13', source: 'default' });
  });

  it('treats date= as a single day', () => {
    const got = resolveEnhancedDateRange(DEFAULT, { date: '2026-08-06' });
    assert.deepEqual(got, { start: '2026-08-06', end: '2026-08-06', source: 'override' });
  });

  it('uses an inclusive start/end range', () => {
    const got = resolveEnhancedDateRange(DEFAULT, { start: '2026-08-06', end: '2026-08-10' });
    assert.deepEqual(got, { start: '2026-08-06', end: '2026-08-10', source: 'override' });
  });

  it('open start runs through today UTC', () => {
    const got = resolveEnhancedDateRange(DEFAULT, { start: '2026-08-06' });
    assert.equal(got.source, 'override');
    assert.equal(got.start, '2026-08-06');
    assert.equal(got.end, utcToday());
  });

  it('end-only is that single day', () => {
    const got = resolveEnhancedDateRange(DEFAULT, { end: '2026-08-10' });
    assert.deepEqual(got, { start: '2026-08-10', end: '2026-08-10', source: 'override' });
  });

  it('does not silently fall back on an invalid date', () => {
    const got = resolveEnhancedDateRange(DEFAULT, { date: '2026-13-40' });
    assert.equal(got.source, 'override');
    assert.match(String(got.error), /Invalid date=/);
  });

  it('lets query date win over env window', () => {
    const got = resolveEnhancedDateRange(
      DEFAULT,
      { date: '2026-08-01' },
      '2026-07-01',
      '2026-07-31',
    );
    assert.deepEqual(got, { start: '2026-08-01', end: '2026-08-01', source: 'override' });
  });
});
