/**
 * Scan legacy cleaned HTML + blog content for remaining absolute remote image URLs.
 */
import { readdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const ORIGIN_RE = /https?:\/\/(?:www\.)?lladesigners\.com/gi;
const REMOTE_IMG_RE =
  /(?:src|data-src|data-lazy-src|href)=["'](https?:\/\/(?!127\.0\.0\.1|localhost)[^"']+\.(?:png|jpe?g|gif|webp|svg|avif)(?:\?[^"']*)?)["']/gi;
const REMOTE_UPLOAD_RE =
  /(?:src|data-src|data-lazy-src|href)=["'](https?:\/\/(?!127\.0\.0\.1|localhost)[^"']*\/wp-content\/uploads\/[^"']+)["']/gi;

function scanFile(path, relative) {
  const html = readFileSync(path, 'utf8');
  const hits = new Set();
  for (const re of [REMOTE_IMG_RE, REMOTE_UPLOAD_RE]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(html))) {
      const url = m[1];
      // Same-origin absolute that should have been localized
      if (/lladesigners\.com/i.test(url) || !/lladesigners\.com/i.test(url)) {
        hits.add(url);
      }
    }
  }
  return [...hits];
}

const results = { filesWithRemote: [], totalRemoteRefs: 0, samples: [] };
const dirs = [join(ROOT, 'src/legacy'), join(ROOT, 'src/content/blog')];

function walk(dir) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, name.name);
    if (name.isDirectory()) {
      if (name.name === 'chrome' || name.name === 'author-shell') {
        // still scan
      }
      walk(full);
      continue;
    }
    if (!/\.(cleaned\.html|html|json)$/i.test(name.name)) continue;
    // skip huge temp live dumps in scripts
    const hits = scanFile(full, full.replace(ROOT, ''));
    // Only flag non-local absolute URLs (including lladesigners.com that weren't rewritten)
    const remote = hits.filter((u) => /^https?:\/\//i.test(u) && !/127\.0\.0\.1|localhost/.test(u));
    if (remote.length) {
      results.filesWithRemote.push({ file: full.replace(ROOT + '\\', '').replace(ROOT + '/', ''), count: remote.length, sample: remote.slice(0, 3) });
      results.totalRemoteRefs += remote.length;
      for (const u of remote.slice(0, 2)) results.samples.push(u);
    }
  }
}

walk(join(ROOT, 'src/legacy'));
// blog json featured images
const blogDir = join(ROOT, 'src/content/blog');
if (existsSync(blogDir)) {
  for (const name of readdirSync(blogDir)) {
    if (!name.endsWith('.json')) continue;
    const raw = readFileSync(join(blogDir, name), 'utf8');
    const abs = [...raw.matchAll(/https?:\/\/(?!127\.0\.0\.1|localhost)[^"\\]+/g)].map((m) => m[0]);
    const imgLike = abs.filter((u) => /\/wp-content\/uploads\/|\.(png|jpe?g|gif|webp|svg|avif)/i.test(u));
    if (imgLike.length) {
      results.filesWithRemote.push({ file: `src/content/blog/${name}`, count: imgLike.length, sample: imgLike.slice(0, 3) });
      results.totalRemoteRefs += imgLike.length;
    }
  }
}

results.filesWithRemote = results.filesWithRemote.slice(0, 40);
results.uniqueSamples = [...new Set(results.samples)].slice(0, 20);
writeFileSync(join(ROOT, 'scripts/_qa-remote-images.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify({ fileCount: results.filesWithRemote.length, totalRemoteRefs: results.totalRemoteRefs, sample: results.uniqueSamples }, null, 2));
