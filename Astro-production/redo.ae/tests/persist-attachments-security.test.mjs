import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, readdir, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { describe, it } from 'node:test';

import { persistBase64Attachments } from '../src/utils/form/persist-attachments.ts';

const PDF_BYTES = Buffer.from('%PDF-1.4\nsecurity regression fixture\n', 'utf8');
const VALID_ITEM = {
  name: 'quote.pdf',
  type: 'application/pdf',
  data: PDF_BYTES.toString('base64'),
};

describe('Redo attachment containment', () => {
  it('rejects traversal and encoded-separator submission IDs before filesystem I/O', async () => {
    for (const id of ['../escape', '..\\escape', 'nested/escape', '%2e%2e%2fescape', 'abc%2Fdef']) {
      const rootDir = await mkdtemp(join(tmpdir(), 'redo-attachment-id-'));
      await assert.rejects(persistBase64Attachments(rootDir, id, [VALID_ITEM]), /Invalid publicId/, id);
      assert.deepEqual(await readdir(rootDir), [], id);
    }
  });

  it('validates every attachment before creating a directory', async () => {
    const rootDir = await mkdtemp(join(tmpdir(), 'redo-attachment-preflight-'));
    const result = await persistBase64Attachments(rootDir, 'public-1', [
      VALID_ITEM,
      { ...VALID_ITEM, name: 'payload.exe' },
    ]);

    assert.match(result.error || '', /Allowed file types/);
    await assert.rejects(access(join(rootDir, 'attachments')));
  });

  it('rejects malformed base64 before creating a directory', async () => {
    const rootDir = await mkdtemp(join(tmpdir(), 'redo-attachment-base64-'));
    const result = await persistBase64Attachments(rootDir, 'public-1', [
      { ...VALID_ITEM, data: 'not-valid-base64!' },
    ]);

    assert.equal(result.error, 'Invalid file upload data.');
    await assert.rejects(access(join(rootDir, 'attachments')));
  });

  it('rejects malformed attachment entries before creating a directory', async () => {
    const rootDir = await mkdtemp(join(tmpdir(), 'redo-attachment-shape-'));
    const result = await persistBase64Attachments(rootDir, 'public-1', [null]);

    assert.equal(result.error, 'Invalid file upload data.');
    await assert.rejects(access(join(rootDir, 'attachments')));
  });

  it('stores a legitimate upload within its canonical submission directory', async () => {
    const rootDir = await mkdtemp(join(tmpdir(), 'redo-attachment-valid-'));
    const id = '550e8400-e29b-41d4-a716-446655440000';
    const result = await persistBase64Attachments(rootDir, id, [
      { ...VALID_ITEM, name: '../../quote.pdf' },
    ]);

    assert.equal(result.error, undefined);
    assert.equal(result.attachments.length, 1);
    const expectedDir = join(rootDir, 'attachments', id);
    const rel = relative(expectedDir, result.attachments[0].storedPath);
    assert.equal(rel.startsWith('..'), false);
    assert.deepEqual(await readFile(result.attachments[0].storedPath), PDF_BYTES);
    assert.equal((await stat(expectedDir)).mode & 0o777, 0o750);
    assert.equal((await stat(result.attachments[0].storedPath)).mode & 0o777, 0o640);
  });
});
