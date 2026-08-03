#!/usr/bin/env node
/**
 * Migrate author metadata from live WordPress author archive pages.
 * Discovers authors from migrated blog posts and fetches profile data.
 *
 * Usage: node scripts/migrate-authors.mjs [--download]
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';
import { ORIGIN, BLOG_DIR, PUBLIC } from './migrate-blog-post.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUTHORS_DIR = join(__dirname, '..', 'src/content/authors');
const shouldDownload = process.argv.includes('--download');

function extractSlug(url) {
  if (!url) return null;
  const m = String(url).match(/\/author\/([^/]+)/);
  return m ? m[1] : null;
}

function collectAuthorSlugsFromPosts() {
  const slugs = new Map();
  if (!existsSync(BLOG_DIR)) return slugs;

  for (const file of readdirSync(BLOG_DIR)) {
    if (!file.endsWith('.json')) continue;
    const post = JSON.parse(readFileSync(join(BLOG_DIR, file), 'utf8'));
    const slug = post.author?.slug || extractSlug(post.author?.url);
    const name = post.author?.name;
    if (!slug) continue;
    const prev = slugs.get(slug) || { slug, name, postCount: 0 };
    prev.postCount++;
    if (name) prev.name = name;
    slugs.set(slug, prev);
  }
  return slugs;
}

async function downloadAvatar(url) {
  const full = url.startsWith('http') ? url : `${ORIGIN}${url}`;
  const localPath = new URL(full).pathname;
  const dest = join(PUBLIC, localPath.replace(/^\//, ''));
  await mkdir(dirname(dest), { recursive: true });
  const res = await fetch(full, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ConnectGroupAstro/1.0)' },
  });
  if (!res.ok) throw new Error(`Avatar download failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
  return localPath;
}

async function fetchRestUser(slug) {
  const res = await fetch(`${ORIGIN}/wp-json/wp/v2/users?slug=${encodeURIComponent(slug)}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ConnectGroupAstro/1.0)' },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data[0] || null;
}

async function migrateAuthor(slug, fallbackName) {
  const url = `${ORIGIN}/author/${slug}/`;
  console.log(`Author: ${slug} (${url})`);

  const notes = [];
  let name = fallbackName || slug;
  let title;
  let bio;
  let avatar;
  const social = [];

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ConnectGroupAstro/1.0)' },
    });

    if (!res.ok) {
      notes.push(`Live author page returned ${res.status}`);
    } else {
      const html = await res.text();
      const $ = cheerio.load(html, { decodeEntities: false });
      const archive = $('[data-elementor-type="archive"]').first();
      const profileSection = archive.children('section').first();

      const headings = profileSection
        .find('.elementor-heading-title')
        .map((_, el) => $(el).text().trim())
        .get();
      if (headings[0]) name = headings[0];
      if (headings[1] && headings[1].length < 80) title = headings[1];
      const bioCandidate = headings.find((h) => h.length > 80);
      if (bioCandidate) bio = bioCandidate;

      const img = profileSection.find('img').first();
      const imgSrc = img.attr('data-lazy-src') || img.attr('src') || '';
      if (imgSrc && !imgSrc.startsWith('data:')) {
        const localSrc = imgSrc.replace(ORIGIN, '');
        avatar = { src: localSrc, alt: img.attr('alt') || name };
        if (shouldDownload) {
          try {
            avatar.src = await downloadAvatar(imgSrc);
          } catch (e) {
            notes.push(`Avatar download failed: ${e.message}`);
          }
        }
      } else {
        notes.push('No author avatar found on live page');
      }

      archive.find('a[href*="linkedin.com/in"]').each((_, el) => {
        const href = $(el).attr('href');
        if (href) social.push({ type: 'linkedin', url: href });
      });

      const pageTitle = $('title').text().trim();
      const ogTitle = $('meta[property="og:title"]').attr('content');
      const ogDesc = $('meta[property="og:description"]').attr('content');
      const desc = $('meta[name="description"]').attr('content');
      const canonical = ($('link[rel="canonical"]').attr('href') || url).replace(/\/$/, '') + '/';

      const author = {
        slug,
        name,
        title,
        bio,
        avatar,
        social: social.length ? social : undefined,
        canonical,
        description: desc || bio,
        og: {
          title: ogTitle || pageTitle,
          description: ogDesc || desc || bio,
          image: $('meta[property="og:image"]').attr('content'),
          type: 'profile',
        },
        sourceUrl: url,
        migratedAt: new Date().toISOString(),
        notes: notes.length ? notes : undefined,
      };

      await mkdir(AUTHORS_DIR, { recursive: true });
      await writeFile(join(AUTHORS_DIR, `${slug}.json`), JSON.stringify(author, null, 2), 'utf8');
      console.log(`  Wrote ${slug}.json`);
      return author;
    }
  } catch (e) {
    notes.push(`Fetch error: ${e.message}`);
  }

  if (!bio || !avatar?.src) {
    try {
      const user = await fetchRestUser(slug);
      if (user) {
        if (!name || name === slug) name = user.name || name;
        if (!bio && user.description) bio = user.description;
        if (!avatar?.src && user.avatar_urls?.['96']) {
          const avatarUrl = user.avatar_urls['96'];
          avatar = { src: avatarUrl, alt: name };
          if (shouldDownload && avatarUrl.includes('connectgroup.co')) {
            try {
              avatar.src = await downloadAvatar(avatarUrl);
            } catch (e) {
              notes.push(`Avatar download failed: ${e.message}`);
            }
          }
        }
        notes.push('Enriched from WP REST users API');
      }
    } catch (e) {
      notes.push(`WP users API error: ${e.message}`);
    }
  }

  const author = {
    slug,
    name,
    title,
    bio,
    avatar,
    social: social.length ? social : undefined,
    canonical: `${ORIGIN}/author/${slug}/`,
    description: bio,
    sourceUrl: url,
    migratedAt: new Date().toISOString(),
    notes,
  };

  await mkdir(AUTHORS_DIR, { recursive: true });
  await writeFile(join(AUTHORS_DIR, `${slug}.json`), JSON.stringify(author, null, 2), 'utf8');
  console.log(`  Wrote ${slug}.json (partial)`);
  return author;
}

async function main() {
  const slugs = collectAuthorSlugsFromPosts();
  console.log(`Found ${slugs.size} unique authors from blog posts`);
  for (const { slug, name } of slugs.values()) {
    await migrateAuthor(slug, name);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
