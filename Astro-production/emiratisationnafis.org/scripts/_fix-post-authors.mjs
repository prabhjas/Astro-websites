/**
 * Fix blog JSON author fields from Yoast/meta in cleaned HTML mirrors.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const BLOG = join(ROOT, 'src/content/blog');
const LEGACY = join(ROOT, 'src/legacy');

function slugifyAuthor(name) {
  return name
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const NAME_TO_SLUG = {
  'siva rama krishna': 'siva-rama-krishna',
  'dylan wesley wright': 'dylan-wesley-wright',
  'tanzyn giovanna': 'tanzyn-giovanna',
  'binju t r': 'binju-t-r',
  'binju t. r': 'binju-t-r',
  'liam doherty': 'liam-doherty',
  'timothy patridge': 'timothy-patridge',
  'nakul s': 'nakul',
  nakul: 'nakul',
  kate: 'kate',
  'cheyne hogan': 'cheyne-hogan',
  admin: 'admin',
};

let fixed = 0;
for (const file of readdirSync(BLOG).filter((f) => f.endsWith('.json'))) {
  const slug = file.replace(/\.json$/, '');
  const cleaned = join(LEGACY, `${slug}.cleaned.html`);
  if (!existsSync(cleaned)) continue;
  const html = readFileSync(cleaned, 'utf8');
  let name =
    (html.match(/<meta\s+name=["']author["']\s+content=["']([^"']+)["']/i) || [])[1] ||
    (html.match(/"author":\{"name":"([^"]+)"/i) || [])[1] ||
    (html.match(/elementor-post-info__item--type-author[^>]*>\s*([^<]+)/i) || [])[1];
  name = (name || '').replace(/\s+/g, ' ').trim();
  if (!name) continue;

  const urlMatch = html.match(/\/author\/([a-z0-9-]+)\//i);
  let authorSlug =
    urlMatch?.[1] ||
    NAME_TO_SLUG[name.toLowerCase()] ||
    NAME_TO_SLUG[name.toLowerCase().replace(/\./g, '')] ||
    slugifyAuthor(name);

  const path = join(BLOG, file);
  const post = JSON.parse(readFileSync(path, 'utf8'));
  const prev = JSON.stringify(post.author);
  post.author = {
    name,
    slug: authorSlug,
    url: `/author/${authorSlug}/`,
  };
  if (JSON.stringify(post.author) !== prev) {
    writeFileSync(path, `${JSON.stringify(post, null, 2)}\n`, 'utf8');
    fixed += 1;
    console.log(slug, '→', name, `(${authorSlug})`);
  }
}
console.log(`fixed ${fixed} posts`);
