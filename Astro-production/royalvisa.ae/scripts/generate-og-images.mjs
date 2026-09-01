/**
 * Royal Visa OG image generator (fleet-adapted).
 *
 * Reads src/content/blog/*.json (not Astro Content Collections).
 * Uses sharp — prefer catalog dep after Aaron AP-08; until then resolves
 * from the monorepo .pnpm store when present.
 *
 * Usage: node scripts/generate-og-images.mjs
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const FLEET_ROOT = path.resolve(ROOT, '../..');
const BLOG_DIR = path.join(ROOT, 'src/content/blog');
const OUT_DIR = path.join(ROOT, 'public/og');

const BRAND = {
  bg: '#0b7242',
  accent: '#c9a227',
  name: 'Royal Visa',
};

async function loadSharp() {
  try {
    return (await import('sharp')).default;
  } catch {
    /* fall through — resolve from fleet pnpm store */
  }
  const pnpm = path.join(FLEET_ROOT, 'node_modules/.pnpm');
  const entries = await fs.readdir(pnpm);
  const sharpDir = entries.find((e) => e.startsWith('sharp@0.'));
  if (!sharpDir) {
    throw new Error(
      'sharp not found. Aaron must add catalog sharp (AP-08), or run from a laptop install that has Astro’s transitive sharp in .pnpm.',
    );
  }
  const pkgJson = path.join(pnpm, sharpDir, 'node_modules/sharp/package.json');
  const require = createRequire(pkgJson);
  return require('sharp');
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapTitle(title, maxChars = 54) {
  const t = String(title || 'Royal Visa').trim();
  if (t.length <= maxChars) return [t];
  const words = t.split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = w;
      if (lines.length >= 2) break;
    } else {
      line = next;
    }
  }
  if (line && lines.length < 3) lines.push(line);
  if (lines.join(' ').length < t.length) {
    const last = lines[lines.length - 1];
    lines[lines.length - 1] = `${last.slice(0, Math.max(0, maxChars - 1))}…`;
  }
  return lines.slice(0, 3);
}

async function generateOGImage(sharp, title, relPath) {
  const lines = wrapTitle(title);
  const textSvg = lines
    .map(
      (line, i) =>
        `<text x="120" y="${280 + i * 64}" font-size="48" font-weight="bold" fill="white" font-family="Arial, Helvetica, sans-serif">${escapeXml(line)}</text>`,
    )
    .join('\n');

  const svg = `
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${BRAND.bg};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${BRAND.accent};stop-opacity:0.25" />
        </linearGradient>
      </defs>
      <rect fill="url(#grad)" width="1200" height="630"/>
      <rect x="60" y="80" width="1080" height="470" fill="none" stroke="${BRAND.accent}" stroke-width="2" opacity="0.55"/>
      <line x1="120" y1="65" x2="280" y2="65" stroke="${BRAND.accent}" stroke-width="3" opacity="0.9"/>
      ${textSvg}
      <text x="120" y="570" font-size="24" fill="${BRAND.accent}" font-family="Arial, Helvetica, sans-serif" font-weight="600">${escapeXml(BRAND.name)}</text>
    </svg>
  `;

  const fullPath = path.join(OUT_DIR, `${relPath}.png`);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await sharp(Buffer.from(svg)).png().toFile(fullPath);
  return fullPath;
}

export async function generateAllOGImages() {
  const sharp = await loadSharp();
  console.log('Generating Royal Visa OG images…\n');
  await fs.mkdir(path.join(OUT_DIR, 'blog'), { recursive: true });

  await generateOGImage(sharp, 'UAE Visa Services & Immigration Support', 'default');
  console.log('  ✓ default.png');

  const files = (await fs.readdir(BLOG_DIR)).filter((f) => f.endsWith('.json'));
  let ok = 0;
  let skip = 0;
  for (const file of files) {
    try {
      const data = JSON.parse(await fs.readFile(path.join(BLOG_DIR, file), 'utf8'));
      const slug = String(data.slug || file.replace(/\.json$/, '')).replace(/^\/|\/$/g, '');
      const title = data.title || slug;
      await generateOGImage(sharp, title, `blog/${slug}`);
      console.log(`  ✓ blog/${slug}.png`);
      ok++;
    } catch (err) {
      console.warn(`  ⚠ ${file}:`, err instanceof Error ? err.message : err);
      skip++;
    }
  }

  console.log(`\nDone. Generated blog=${ok} skipped=${skip} → public/og/`);
  return { ok, skip };
}

const isDirect =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isDirect) {
  await generateAllOGImages();
}
