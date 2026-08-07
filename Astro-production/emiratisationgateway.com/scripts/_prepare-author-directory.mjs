#!/usr/bin/env node
/**
 * Download live /author/ directory page as src/legacy/author.cleaned.html.
 * Also downloads author avatar images.
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ORIGIN = 'https://emiratisationgateway.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

async function downloadFile(url, destPath) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) { console.log(`  SKIP ${url} → ${res.status}`); return false; }
    const buf = Buffer.from(await res.arrayBuffer());
    const dir = dirname(destPath);
    mkdirSync(dir, { recursive: true });
    writeFileSync(destPath, buf);
    console.log(`  SAVED ${destPath} (${buf.length} bytes)`);
    return true;
  } catch (e) {
    console.log(`  ERROR ${url}: ${e.message}`);
    return false;
  }
}

async function main() {
  // 1. Download author directory page
  console.log('Fetching /author/ directory...');
  const res = await fetch(`${ORIGIN}/author/`, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Failed: ${res.status}`);
  let html = await res.text();
  console.log(`Got ${html.length} bytes`);

  // Localize URLs
  html = html.replaceAll(`${ORIGIN}/`, '/');
  html = html.replaceAll(ORIGIN, '');

  // Remove WP scripts
  html = html.replace(/<script[^>]*src="[^"]*wp-includes[^"]*"[^>]*><\/script>/gi, '');
  html = html.replace(/<script[^>]*src="[^"]*wp-content\/plugins[^"]*"[^>]*><\/script>/gi, '');
  html = html.replace(/<script[^>]*src="[^"]*cdn-cgi[^"]*"[^>]*><\/script>/gi, '');

  const outPath = join(ROOT, 'src/legacy/author.cleaned.html');
  writeFileSync(outPath, html, 'utf8');
  console.log(`Wrote ${outPath}`);

  // 2. Download author avatar images referenced in the page
  const avatarPattern = /\/wp-content\/uploads\/\d{4}\/\d{2}\/Author[^"'\s)]+/g;
  const avatars = new Set([...html.matchAll(avatarPattern)].map(m => m[0]));
  
  // Also get full-size versions (without -96x96 etc.)
  const fullSizeAvatars = new Set();
  for (const av of avatars) {
    fullSizeAvatars.add(av);
    // Also get the non-thumbnail version
    const full = av.replace(/-\d+x\d+\./, '.');
    fullSizeAvatars.add(full);
  }
  
  console.log(`\nDownloading ${fullSizeAvatars.size} avatar images...`);
  for (const imgPath of fullSizeAvatars) {
    const destPath = join(ROOT, 'public', imgPath);
    if (existsSync(destPath)) {
      console.log(`  EXISTS ${destPath}`);
      continue;
    }
    await downloadFile(`${ORIGIN}${imgPath}`, destPath);
  }
  
  // 3. Also download other images referenced in the author directory
  const imgPattern = /\/wp-content\/uploads\/[^"'\s)]+\.(?:png|jpg|jpeg|webp|svg|gif)/gi;
  const allImages = new Set([...html.matchAll(imgPattern)].map(m => m[0]));
  console.log(`\nChecking ${allImages.size} total images...`);
  let downloaded = 0;
  for (const imgPath of allImages) {
    const destPath = join(ROOT, 'public', imgPath);
    if (existsSync(destPath)) continue;
    const ok = await downloadFile(`${ORIGIN}${imgPath}`, destPath);
    if (ok) downloaded++;
  }
  console.log(`Downloaded ${downloaded} new images`);
}

main().catch(console.error);
