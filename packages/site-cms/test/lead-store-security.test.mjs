import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, readdir, readFile, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';

import { FileLeadStore } from '../src/leads/file-store.ts';
import { isValidPublicId, resolveContainedPath } from '../src/leads/public-id.ts';

const INVALID_IDS = [
  '../escape',
  '..\\escape',
  'nested/escape',
  'nested\\escape',
  '%2e%2e%2fescape',
  'abc%2Fdef',
  'abc%5cdef',
  '.',
  '..',
  '/absolute',
  ' leading-space',
  'trailing-space ',
  'unicode-é',
  'a'.repeat(129),
];

function record(publicId, createdAt = '2026-08-09T00:00:00.000Z') {
  return {
    id: `internal-${publicId}`,
    publicId,
    createdAt,
    updatedAt: createdAt,
    deliveryStatus: 'pending',
  };
}

describe('public ID validation', () => {
  it('accepts UUID, browser fallback, and existing legacy ID shapes', () => {
    for (const id of [
      '550e8400-e29b-41d4-a716-446655440000',
      '1786291200000-a1b2c3d4',
      'public-1',
      'lead_ABC-123',
    ]) {
      assert.equal(isValidPublicId(id), true, id);
    }
  });

  it('rejects traversal, encoded separators, path syntax, and overlong IDs', () => {
    for (const id of INVALID_IDS) assert.equal(isValidPublicId(id), false, id);
  });

  it('rejects canonical paths outside the supplied base', () => {
    const base = join(tmpdir(), 'lead-base');
    assert.equal(resolveContainedPath(base, 'state', 'public-1.json'), join(base, 'state', 'public-1.json'));
    assert.throws(() => resolveContainedPath(base, '..', 'escape.json'), /escapes/);
    assert.throws(() => resolveContainedPath(base, join(tmpdir(), 'escape.json')), /escapes/);
  });
});

describe('FileLeadStore containment', () => {
  it('does not read a state file through a traversal ID', async () => {
    const rootDir = await mkdtemp(join(tmpdir(), 'lead-read-containment-'));
    await writeFile(join(rootDir, 'escape.json'), JSON.stringify(record('escape')), 'utf8');
    const store = new FileLeadStore({ rootDir, maxFileBytes: 1024 });

    for (const id of INVALID_IDS) {
      assert.equal(await store.getSubmission(id), null, id);
      assert.deepEqual(await store.listAttempts(id), [], id);
    }
  });

  it('rejects invalid IDs before creating logs or state files', async () => {
    const rootDir = await mkdtemp(join(tmpdir(), 'lead-write-containment-'));
    const store = new FileLeadStore({ rootDir, maxFileBytes: 1024 });

    for (const id of INVALID_IDS) {
      await assert.rejects(store.storeSubmission(record(id)), /Invalid publicId/, id);
      await assert.rejects(store.updateSubmission(record(id)), /Invalid publicId/, id);
      await assert.rejects(
        store.storeAttempt({ publicId: id, createdAt: '2026-08-09T00:00:00.000Z' }),
        /Invalid publicId/,
        id,
      );
    }

    assert.deepEqual(await readdir(rootDir), []);
    await assert.rejects(access(join(dirname(rootDir), 'escape.json')));
  });

  it('rejects malicious and non-canonical timestamps before creating log paths', async () => {
    const rootDir = await mkdtemp(join(tmpdir(), 'lead-date-containment-'));
    const store = new FileLeadStore({ rootDir, maxFileBytes: 1024 });
    const publicId = 'public-1';

    for (const timestamp of [
      '../../../../outside',
      '../2026-08-09',
      '2026-08-09',
      '2026-02-30T00:00:00.000Z',
      '2026-08-09T00:00:00Z',
    ]) {
      await assert.rejects(store.storeSubmission(record(publicId, timestamp)), /Invalid createdAt/, timestamp);
      await assert.rejects(
        store.updateSubmission({ ...record(publicId), updatedAt: timestamp }),
        /Invalid updatedAt/,
        timestamp,
      );
      await assert.rejects(
        store.storeAttempt({ publicId, createdAt: timestamp }),
        /Invalid createdAt/,
        timestamp,
      );
    }

    assert.deepEqual(await readdir(rootDir), []);
  });

  it('does not follow pre-existing state or log symlinks', async () => {
    const rootDir = await mkdtemp(join(tmpdir(), 'lead-symlink-containment-'));
    const outsideDir = await mkdtemp(join(tmpdir(), 'lead-symlink-outside-'));
    const outsideState = join(outsideDir, 'public-1.json');
    const outsideLog = join(outsideDir, 'events.ndjson');
    await writeFile(outsideState, JSON.stringify(record('public-1')), 'utf8');
    await writeFile(outsideLog, 'outside\n', 'utf8');
    await mkdir(join(rootDir, 'state'), { recursive: true });
    await mkdir(join(rootDir, 'submissions', '2026-08'), { recursive: true });
    await symlink(outsideState, join(rootDir, 'state', 'public-1.json'));
    await symlink(
      outsideLog,
      join(rootDir, 'submissions', '2026-08', 'submissions-2026-08-09-001.ndjson'),
    );

    const store = new FileLeadStore({ rootDir, maxFileBytes: 1024 });
    assert.equal(await store.getSubmission('public-1'), null);
    assert.deepEqual(await store.listSubmissions(), []);
    await store.storeSubmission(record('public-2'));

    assert.equal(await readFile(outsideLog, 'utf8'), 'outside\n');
    assert.equal((await store.getSubmission('public-2'))?.publicId, 'public-2');
  });

  it('stores and reloads legitimate IDs inside state', async () => {
    const rootDir = await mkdtemp(join(tmpdir(), 'lead-legitimate-'));
    const store = new FileLeadStore({ rootDir, maxFileBytes: 1024 });
    const id = '550e8400-e29b-41d4-a716-446655440000';

    await store.storeSubmission(record(id));
    assert.equal((await store.getSubmission(id))?.publicId, id);
    const raw = await readFile(join(rootDir, 'state', `${id}.json`), 'utf8');
    assert.equal(JSON.parse(raw).publicId, id);
    assert.equal((await stat(join(rootDir, 'state'))).mode & 0o777, 0o750);
    assert.equal((await stat(join(rootDir, 'state', `${id}.json`))).mode & 0o777, 0o640);
    assert.equal((await stat(join(rootDir, 'submissions'))).mode & 0o777, 0o750);
  });
});
