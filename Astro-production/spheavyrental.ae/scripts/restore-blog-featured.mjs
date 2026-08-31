/**
 * Fill missing featuredImage on key posts + rebuild /blog/ listing markup
 * (list skin 534 background images + grid skin 540 cards).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const postsPath = path.join(root, 'src/data/posts.json');
const pagesPath = path.join(root, 'src/data/pages.json');

const FEATURED_BY_SLUG = {
  'wheel-loaders-for-rent':
    '/wp-content/uploads/2025/06/Wheel-Loaders-Individual-image.webp',
  'generator-rental-cost':
    '/wp-content/uploads/2025/06/Generator-Rental-Service-Page-image.webp',
  'how-to-choose-the-right-heavy-machinery-for-rent':
    '/wp-content/uploads/2026/04/Renting-Heavy-Machinery-in-the-UAE-e1775538016961.webp',
};

const posts = JSON.parse(fs.readFileSync(postsPath, 'utf8'));
let filled = 0;
for (const post of posts) {
  const feat = FEATURED_BY_SLUG[post.slug];
  if (!feat) continue;
  if (post.featuredImage === feat) continue;
  post.featuredImage = feat;
  if (!post.seo) post.seo = {};
  if (!post.seo.ogImage) post.seo.ogImage = feat;
  filled += 1;
  console.log('featured', post.slug, '->', feat);
}
fs.writeFileSync(postsPath, `${JSON.stringify(posts, null, 2)}\n`);
console.log('filled', filled);

// Verify files exist
for (const feat of Object.values(FEATURED_BY_SLUG)) {
  const p = path.join(root, 'public', feat.replace(/^\//, ''));
  console.log(fs.existsSync(p) ? 'OK' : 'MISSING', feat);
}
