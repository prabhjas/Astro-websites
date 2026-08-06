#!/usr/bin/env node
/**
 * Refresh blog JSON titles, dates, categories, and featured images from live WP REST API.
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BLOG_DIR = join(ROOT, 'src/content/blog');
const ORIGIN = 'https://peomiddleast.com';

function decodeHtml(s) {
  return String(s || '')
    .replace(/&#8217;/g, "'")
    .replace(/&#038;/g, '&')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PEOAstro/1.0)' },
  });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

async function loadCategoryMap() {
  const cats = await fetchJson(
    `${ORIGIN}/wp-json/wp/v2/categories?per_page=100&_fields=id,slug,name`,
  );
  return new Map(cats.map((c) => [c.id, { slug: c.slug, name: c.name }]));
}

async function mediaPath(id) {
  if (!id) return null;
  const media = await fetchJson(`${ORIGIN}/wp-json/wp/v2/media/${id}?_fields=source_url,alt_text`);
  const src = media.source_url?.startsWith('http')
    ? new URL(media.source_url).pathname
    : media.source_url;
  return { src, alt: media.alt_text || '' };
}

async function main() {
  const catMap = await loadCategoryMap();
  const mediaCache = new Map();
  const files = (await readdir(BLOG_DIR)).filter((f) => f.endsWith('.json'));
  let ok = 0;
  let fail = 0;

  for (const file of files) {
    const slug = file.replace(/\.json$/, '');
    const path = join(BLOG_DIR, file);
    try {
      const existing = JSON.parse(await readFile(path, 'utf8'));
      const posts = await fetchJson(
        `${ORIGIN}/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}&_fields=slug,title,date,modified,featured_media,categories,author`,
      );
      if (!posts.length) {
        console.warn('SKIP no WP post:', slug);
        fail++;
        continue;
      }
      const wp = posts[0];
      const title = decodeHtml(wp.title?.rendered || existing.title);
      const publishedAt = new Date(wp.date).toISOString();
      const modifiedAt = new Date(wp.modified || wp.date).toISOString();
      const categories = (wp.categories || [])
        .map((id) => catMap.get(id))
        .filter(Boolean)
        .map((c) => ({ name: c.name, slug: c.slug, url: `/category/${c.slug}/` }));

      const featured = wp.featured_media
        ? mediaCache.has(wp.featured_media)
          ? mediaCache.get(wp.featured_media)
          : await mediaPath(wp.featured_media).then((m) => {
              mediaCache.set(wp.featured_media, m);
              return m;
            })
        : null;

      const updated = {
        ...existing,
        slug,
        title,
        canonical: `/${slug}/`,
        publishedAt,
        modifiedAt,
        categories,
        featuredImage: featured
          ? {
              src: featured.src,
              alt: featured.alt || title,
              originalUrl: featured.src,
            }
          : existing.featuredImage,
        og: {
          ...(existing.og || {}),
          title,
          image: featured?.src || existing.og?.image,
        },
        twitter: {
          ...(existing.twitter || {}),
          title,
          image: featured?.src || existing.twitter?.image,
        },
        sourceUrl: `${ORIGIN}/${slug}/`,
        syncedFromWpAt: new Date().toISOString(),
      };

      if (updated.breadcrumb?.length) {
        updated.breadcrumb = updated.breadcrumb.map((b, i, arr) =>
          i === arr.length - 1 ? { name: title } : b,
        );
      }

      await writeFile(path, JSON.stringify(updated, null, 2) + '\n', 'utf8');
      ok++;
      if (ok % 25 === 0) console.log('…', ok, 'updated');
    } catch (err) {
      console.warn('FAIL', slug, err.message || err);
      fail++;
    }
  }

  console.log(`\nSynced ${ok} posts from WP, ${fail} failed/skipped`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
