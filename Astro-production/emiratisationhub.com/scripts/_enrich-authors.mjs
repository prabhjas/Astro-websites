/**
 * Enrich author JSON with live avatars/names after migrate-posts-from-legacy.
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const AUTHORS_DIR = join(ROOT, 'src/content/authors');
const ORIGIN = 'https://emiratisationhub.com';
const IMAGES_DIR = join(ROOT, 'public/images/authors');

const FEATURED = {
  nakul: { name: 'Nakul', avatar: '/wp-content/uploads/2024/05/cropped-8.png' },
  'binju-t-r': { name: 'Binju T. R', avatar: '/wp-content/uploads/2024/05/cropped-6.png' },
  'cheyne-hogan': { name: 'Cheyne Hogan', avatar: '/wp-content/uploads/2024/05/cropped-9.png' },
  'tanzyn-giovanna': { name: 'Tanzyn Giovanna', avatar: '/wp-content/uploads/2024/05/cropped-5-2-1.png' },
  'siva-rama': { name: 'Siva Rama Krishna', avatar: '/images/authors/siva-rama.jpg' },
  'dylan-wesley': { name: 'Dylan Wesley Wright', avatar: '/wp-content/uploads/2024/05/cropped-1-1.png' },
};

mkdirSync(AUTHORS_DIR, { recursive: true });
mkdirSync(IMAGES_DIR, { recursive: true });

async function download(url, dest) {
  if (existsSync(dest) && readFileSync(dest).length > 50) return true;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', Referer: `${ORIGIN}/` },
  });
  if (!res.ok) return false;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 40) return false;
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, buf);
  return true;
}

// Localize gravatar for siva-rama
const sivaLive = await (await fetch(`${ORIGIN}/author/siva-rama/`)).text();
const gravatar = sivaLive.match(/https:\/\/secure\.gravatar\.com\/avatar\/[^"'\s]+/)?.[0];
if (gravatar) {
  const ok = await download(gravatar.replace(/s=\d+/, 's=500'), join(IMAGES_DIR, 'siva-rama.jpg'));
  console.log('siva gravatar', ok ? 'ok' : 'fail');
}

const known = new Set([
  ...Object.keys(FEATURED),
  ...(existsSync(AUTHORS_DIR)
    ? readdirSync(AUTHORS_DIR).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''))
    : []),
]);

for (const slug of known) {
  const path = join(AUTHORS_DIR, `${slug}.json`);
  const existing = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {};
  const featured = FEATURED[slug] || {};
  const name = featured.name || existing.name || slug;
  const avatarSrc = featured.avatar || existing.avatar?.src || '';
  const author = {
    slug,
    name,
    title: existing.title || '',
    bio: existing.bio || '',
    avatar: avatarSrc ? { src: avatarSrc, alt: name } : existing.avatar || null,
    social: existing.social || [],
    canonical: `${ORIGIN}/author/${slug}/`,
    description: existing.description || `${name} — Author at Emiratisation Hub`,
    og: {
      title: `${name} | Author at Emiratisation Hub`,
      description: existing.description || `${name} — Author at Emiratisation Hub`,
      image: avatarSrc ? `${ORIGIN}${avatarSrc}` : undefined,
      type: 'profile',
    },
    sourceUrl: `${ORIGIN}/author/${slug}/`,
    migratedAt: existing.migratedAt || new Date().toISOString(),
  };
  writeFileSync(path, JSON.stringify(author, null, 2) + '\n');
  console.log('author', slug);
}
