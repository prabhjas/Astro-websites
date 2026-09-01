/**
 * Apply the reference blog pageCss (from the generator post)
 * to every published post so author/share + related cards match.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const postsPath = path.join(root, 'src/data/posts.json');
const posts = JSON.parse(fs.readFileSync(postsPath, 'utf8'));

const REFERENCE_SLUG = 'best-generator-rental-companies-in-uae';
const ref = posts.find((p) => p.slug === REFERENCE_SLUG);
if (!ref?.pageCss?.length) {
  throw new Error(`Reference post missing pageCss: ${REFERENCE_SLUG}`);
}

const pageCss = [...ref.pageCss];
let updated = 0;
for (const post of posts) {
  const before = JSON.stringify(post.pageCss || []);
  const after = JSON.stringify(pageCss);
  if (before !== after) {
    post.pageCss = [...pageCss];
    updated += 1;
  }
  // Keep elementorCss pointing at the single template sheet
  if (post.elementorCss !== '/wp-content/uploads/elementor/css/post-652.css') {
    post.elementorCss = '/wp-content/uploads/elementor/css/post-652.css';
  }
}

fs.writeFileSync(postsPath, `${JSON.stringify(posts, null, 2)}\n`);
console.log(`Updated pageCss on ${updated} posts (reference: ${REFERENCE_SLUG})`);
