import { mkdir, writeFile, readFile, copyFile, access } from 'node:fs/promises';
import { createWriteStream, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CSS_DIR = join(ROOT, 'public/wp-content/uploads/elementor/css');
const ORIGIN = 'https://kinzahr.com';

const pageCss = [
  { id: '12738', slug: 'industries/construction-and-engineering' },
  { id: '12748', slug: 'industries/logistics-transport-and-warehousing' },
];

async function download(url, dest) {
  await mkdir(dirname(dest), { recursive: true });
  const res = await fetch(url, {
    headers: { 'User-Agent': 'kinzahr-astro-Migrator/0.1' },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
  return dest;
}

await mkdir(CSS_DIR, { recursive: true });

for (const { id } of pageCss) {
  const remote = `${ORIGIN}/wp-content/uploads/elementor/css/post-${id}.css`;
  const dest = join(CSS_DIR, `post-${id}.css`);
  await download(remote, dest);
  let css = await readFile(dest, 'utf8');
  // Rewrite absolute kinzahr URLs to root-relative
  css = css
    .replace(/https?:\/\/(?:www\.)?kinzahr\.com/gi, '')
    .replace(/https?:\/\/dev\.kinzahr\.com/gi, '');
  await writeFile(dest, css, 'utf8');
  console.log(`OK post-${id}.css (${css.length} bytes)`);

  const urls = [...css.matchAll(/url\(([^)]+)\)/g)].map((m) =>
    m[1].replace(/['"]/g, '').trim(),
  );
  const assetUrls = [
    ...new Set(
      urls
        .map((u) => {
          if (u.startsWith('data:')) return null;
          if (u.startsWith('http')) return u;
          if (u.startsWith('/')) return ORIGIN + u;
          return ORIGIN + '/' + u.replace(/^\.\.\//, 'wp-content/uploads/');
        })
        .filter(Boolean),
    ),
  ];
  console.log(`  assets in CSS: ${assetUrls.length}`);
  for (const u of assetUrls) {
    try {
      const path = new URL(u).pathname;
      const local = join(ROOT, 'public', decodeURIComponent(path).replace(/^\//, ''));
      if (existsSync(local)) {
        console.log(`  cached ${path}`);
        continue;
      }
      await download(u, local);
      console.log(`  dl ${path}`);
    } catch (e) {
      console.warn(`  FAIL ${u}: ${e.message}`);
    }
  }
}

// Copy CSS into dist if present
const distCss = join(ROOT, 'dist/client/wp-content/uploads/elementor/css');
if (existsSync(join(ROOT, 'dist/client'))) {
  await mkdir(distCss, { recursive: true });
  for (const { id } of pageCss) {
    await copyFile(join(CSS_DIR, `post-${id}.css`), join(distCss, `post-${id}.css`));
  }
  console.log('Copied CSS into dist/client');
}

// Also fetch a few known-broken mega-menu SVGs
const icons = [
  '/wp-content/uploads/2026/04/Executive-Search_icon-svg.svg',
  '/wp-content/uploads/2026/04/Professional-Services.svg',
  '/wp-content/uploads/2026/04/TalentMapping_icon-svg.svg',
  '/wp-content/uploads/2026/04/Recruitment-Process-Outsourcing-RPO_icon.svg',
  '/wp-content/uploads/2026/04/Contingent-Staffing_icon-svg.svg',
];
for (const path of icons) {
  const local = join(ROOT, 'public', path.replace(/^\//, ''));
  if (existsSync(local)) continue;
  try {
    await download(ORIGIN + path, local);
    console.log('icon', path);
  } catch (e) {
    console.warn('icon fail', path, e.message);
  }
}
