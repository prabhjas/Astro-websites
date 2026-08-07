#!/usr/bin/env node
/**
 * Download live individual author archive pages as cleaned HTML mirrors.
 * These are used by src/pages/author/[slug].astro for pixel parity.
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ORIGIN = 'https://emiratisationgateway.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

// Authors that appear on the live directory
const AUTHORS = [
  'nakul',
  'binju-t-r',
  'cheyne-hogan',
  'tanzyn-giovanna',
  'siva-rama-krishna',
  'dylan-wesley-wright',
  // Authors with posts but not on directory
  'liam-doherty',
  'timothy-patridge',
  'kate',
  'prabhjas',
  'muhammad-faieezvistaoutsourcing-com',
];

async function downloadImages(html) {
  const imgPattern = /\/wp-content\/uploads\/[^"'\s)]+\.(?:png|jpg|jpeg|webp|svg|gif)/gi;
  const images = new Set([...html.matchAll(imgPattern)].map(m => m[0]));
  let downloaded = 0;
  for (const imgPath of images) {
    const destPath = join(ROOT, 'public', imgPath);
    if (existsSync(destPath)) continue;
    try {
      const res = await fetch(`${ORIGIN}${imgPath}`, { headers: { 'User-Agent': UA } });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      mkdirSync(dirname(destPath), { recursive: true });
      writeFileSync(destPath, buf);
      downloaded++;
    } catch {}
  }
  return downloaded;
}

async function main() {
  const authorDir = join(ROOT, 'src/legacy/author');
  mkdirSync(authorDir, { recursive: true });
  
  let total = 0;
  let skipped = 0;
  
  for (const slug of AUTHORS) {
    const outPath = join(authorDir, `${slug}.cleaned.html`);
    
    const url = `${ORIGIN}/author/${slug}/`;
    console.log(`Fetching ${url}...`);
    
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!res.ok) {
        console.log(`  ${res.status} — skipping`);
        skipped++;
        continue;
      }
      
      let html = await res.text();
      console.log(`  ${html.length} bytes`);
      
      // Localize URLs
      html = html.replaceAll(`${ORIGIN}/`, '/');
      html = html.replaceAll(ORIGIN, '');
      
      // Remove WP scripts
      html = html.replace(/<script[^>]*src="[^"]*wp-includes[^"]*"[^>]*><\/script>/gi, '');
      html = html.replace(/<script[^>]*src="[^"]*wp-content\/plugins[^"]*"[^>]*><\/script>/gi, '');
      html = html.replace(/<script[^>]*src="[^"]*cdn-cgi[^"]*"[^>]*><\/script>/gi, '');
      
      writeFileSync(outPath, html, 'utf8');
      console.log(`  → ${outPath}`);
      
      // Download any missing images
      const imgCount = await downloadImages(html);
      if (imgCount) console.log(`  Downloaded ${imgCount} images`);
      
      total++;
    } catch (e) {
      console.log(`  ERROR: ${e.message}`);
      skipped++;
    }
  }
  
  console.log(`\nDone: ${total} saved, ${skipped} skipped`);
}

main().catch(console.error);
