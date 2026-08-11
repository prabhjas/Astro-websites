#!/usr/bin/env node
/**
 * Phase 02 scaffold helper — copy Full CMS peer (theuaegate) into
 * theuaegate.com without wiping Phase 01 source/ + public/ mirrors.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PEER = join(ROOT, '..', 'theuaegate.com');
const SITE = ROOT;

const SKIP_DIRS = new Set(['node_modules', 'dist', '.data', '.astro', 'source', 'public']);
const SKIP_FILES = new Set(['.env', '.env.prod', '.env.local']);

function copyTree(src, dest) {
  if (!existsSync(src)) return;
  mkdirSync(dest, { recursive: true });
  for (const name of readdirSync(src)) {
    if (SKIP_DIRS.has(name) || SKIP_FILES.has(name)) continue;
    const from = join(src, name);
    const to = join(dest, name);
    const st = statSync(from);
    if (st.isDirectory()) copyTree(from, to);
    else cpSync(from, to);
  }
}

function ensurePeerPublicJs() {
  const peerJs = join(PEER, 'public', 'js');
  const siteJs = join(SITE, 'public', 'js');
  if (!existsSync(peerJs)) return;
  mkdirSync(siteJs, { recursive: true });
  for (const name of readdirSync(peerJs)) {
    const from = join(peerJs, name);
    const to = join(siteJs, name);
    if (!existsSync(to)) {
      cpSync(from, to, { recursive: true });
    }
  }
}

function main() {
  if (!existsSync(join(PEER, 'package.json'))) {
    throw new Error(`Peer package missing: ${PEER}`);
  }
  // Preserve Phase 01 inventory if present
  const invPath = join(SITE, 'src', 'data', 'sitemap-inventory.json');
  const invBackup = existsSync(invPath) ? readFileSync(invPath, 'utf8') : null;

  console.log('Copying peer scaffold (no source/, no public/)…');
  copyTree(PEER, SITE);
  ensurePeerPublicJs();

  if (invBackup) {
    mkdirSync(join(SITE, 'src', 'data'), { recursive: true });
    writeFileSync(invPath, invBackup);
    console.log('Restored sitemap-inventory.json');
  }

  // Drop peer CFS legacy cleaned HTML (wrong domain)
  const legacy = join(SITE, 'src', 'legacy');
  if (existsSync(legacy)) {
    for (const name of readdirSync(legacy)) {
      if (name.endsWith('.cleaned.html') || name.endsWith('.assets.json')) {
        rmSync(join(legacy, name), { force: true });
      }
    }
    // nested law/
    const lawDir = join(legacy, 'law');
    if (existsSync(lawDir)) rmSync(lawDir, { recursive: true, force: true });
    console.log('Cleared peer legacy cleaned HTML');
  }

  for (const dir of [join(SITE, 'src/content/blog'), join(SITE, 'src/content/authors')]) {
    if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  }

  console.log('Scaffold copy done. Run rebrand-from-cfs.mjs next.');
}

main();
