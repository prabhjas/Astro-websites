import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = 'd:/Astro-websites/Astro-production/emiratisationgateway.com';
const base = 'http://127.0.0.1:5106';

function locs(xml) {
  return [...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)].map((m) => m[1].trim());
}

const pageXml = await (await fetch(base + '/page-sitemap.xml')).text();
const postXml = await (await fetch(base + '/post-sitemap.xml')).text();
const pages = locs(pageXml);
const posts = locs(postXml);
console.log('PAGE SITEMAP', pages.length);
pages.forEach((u) => console.log(' ', u));
console.log('POST SITEMAP', posts.length);

const reserved = new Set(
  readdirSync(join(root, 'src/pages'))
    .filter((f) => f.endsWith('.astro') && !f.startsWith('['))
    .map((f) => f.replace(/\.astro$/, '')),
);
const blogSlugs = readdirSync(join(root, 'src/content/blog'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace(/\.json$/, ''));
console.log('blog json', blogSlugs.length, 'reserved pages', [...reserved].sort().join(','));

const missingPosts = blogSlugs.filter((s) => !posts.some((u) => u.endsWith('/' + s + '/') || u.endsWith('/' + s)));
console.log('posts in content missing from sitemap', missingPosts.length, missingPosts.slice(0, 10));

// GTM hardcodes across legacy
let gtmFiles = 0;
let gtmHits = 0;
function walk(dir) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (/\.(html|js|astro|ts)$/i.test(ent.name)) {
      const s = readFileSync(p, 'utf8');
      const n = (s.match(/GTM-[A-Z0-9]+|G-[A-Z0-9]{6,}|googletagmanager\.com\/gtm\.js|googletagmanager\.com\/gtag/g) || [])
        .length;
      if (n) {
        gtmFiles++;
        gtmHits += n;
        if (gtmFiles <= 15) console.log('GTM file', p.replace(root, ''), n);
      }
    }
  }
}
walk(join(root, 'src'));
walk(join(root, 'public/js'));
console.log({ gtmFiles, gtmHits });

// Homepage served GTM
const home = await (await fetch(base + '/')).text();
console.log({
  homeHardGtm: /GTM-5T7TC5MF|G-R094N8S15D/.test(home),
  homeRuntimeGtm: home.includes('runtime-gtm.js'),
  homeGoogletag: home.includes('googletagmanager.com/gtm.js?id=GTM'),
});

const author = await (await fetch(base + '/author/')).text();
console.log({
  authorHardGtm: /GTM-5T7TC5MF|G-R094N8S15D/.test(author),
  authorRuntimeGtm: author.includes('runtime-gtm.js'),
});

// External images in cleaned html
const extRe =
  /(?:src|href|content)=["'](https?:\/\/(?!emiratisationgateway\.com)[^"']+\.(?:png|jpe?g|webp|gif|svg)[^"']*)["']/gi;
let extFiles = 0;
let extUrls = new Set();
function walkHtml(dir) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) walkHtml(p);
    else if (ent.name.endsWith('.cleaned.html') || ent.name.endsWith('.html')) {
      const s = readFileSync(p, 'utf8');
      let m;
      const re = new RegExp(extRe);
      while ((m = re.exec(s))) {
        extUrls.add(m[1]);
        extFiles++;
      }
      // also absolute same-domain that should be relative
      const abs = [...s.matchAll(/https:\/\/emiratisationgateway\.com\/(wp-content\/[^"'\s]+)/g)].map(
        (x) => x[1],
      );
      if (abs.length && extFiles < 5) {
        /* counted separately */
      }
    }
  }
}
walkHtml(join(root, 'src/legacy'));
console.log('external image refs', extUrls.size, [...extUrls].slice(0, 15));

// Absolute same-domain assets still in HTML
let absCount = 0;
function walkAbs(dir) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) walkAbs(p);
    else if (ent.name.endsWith('.cleaned.html')) {
      const s = readFileSync(p, 'utf8');
      absCount += (s.match(/https:\/\/emiratisationgateway\.com\/wp-content\//g) || []).length;
    }
  }
}
walkAbs(join(root, 'src/legacy'));
console.log('absolute same-domain wp-content refs', absCount);

// Sample local image 404s from homepage
const imgs = [...home.matchAll(/src=["'](\/wp-content\/[^"']+)["']/g)].map((m) => m[1].split(' ')[0]);
let miss = 0;
for (const src of [...new Set(imgs)].slice(0, 40)) {
  const r = await fetch(base + src);
  if (!r.ok) {
    miss++;
    console.log('MISS', r.status, src);
  }
}
console.log('homepage image sample checked', Math.min(40, new Set(imgs).size), 'missing', miss);

// robots compare note
const robots = await (await fetch(base + '/robots.txt')).text();
console.log('robots has sitemap', /Sitemap:\s*https:\/\/emiratisationgateway\.com\/sitemap_index\.xml/.test(robots));

// redirects sample
for (const p of ['/about/', '/labour-law-voilation/', '/emiratisation-plan/', '/contact/']) {
  const r = await fetch(base + p, { redirect: 'manual' });
  console.log('redir', p, r.status, r.headers.get('location'));
}
