/**
 * Convert absolute https://spheavyrental.ae/... hrefs to relative /... paths
 * in the single-post template and every post bodyHtml/content.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function toRelative(html) {
  return String(html || '').replace(
    /https:\/\/(?:www\.)?spheavyrental\.ae(\/[^"'>\s]*)/gi,
    '$1',
  );
}

const templatePath = path.join(root, 'src/data/single-post-template.html');
fs.writeFileSync(templatePath, toRelative(fs.readFileSync(templatePath, 'utf8')));
console.log('Updated single-post-template.html');

const postsPath = path.join(root, 'src/data/posts.json');
const posts = JSON.parse(fs.readFileSync(postsPath, 'utf8'));
let changed = 0;
for (const post of posts) {
  let dirty = false;
  for (const key of ['bodyHtml', 'content', 'excerpt']) {
    if (!post[key]) continue;
    const next = toRelative(post[key]);
    if (next !== post[key]) {
      post[key] = next;
      dirty = true;
    }
  }
  if (dirty) changed += 1;
}
fs.writeFileSync(postsPath, `${JSON.stringify(posts, null, 2)}\n`);
console.log(`Updated ${changed} posts`);
