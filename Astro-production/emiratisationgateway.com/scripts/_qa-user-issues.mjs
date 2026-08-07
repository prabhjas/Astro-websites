import * as cheerio from 'cheerio';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const localBlog = await (await fetch('http://127.0.0.1:5106/blog/')).text();
const liveBlog = await (await fetch('https://emiratisationgateway.com/blog/')).text();
const $l = cheerio.load(localBlog);
const $v = cheerio.load(liveBlog);

const sel = $l('select').filter((_, el) => /categor/i.test($l(el).attr('id') || '') || /categor/i.test($l(el).attr('class') || '') || $l(el).find('option').length > 3).first();
console.log('LOCAL select id/class', sel.attr('id'), sel.attr('class'), sel.attr('onchange'));
console.log(
  'LOCAL options',
  sel
    .find('option')
    .map((_, el) => ({ v: $l(el).attr('value'), t: $l(el).text().trim() }))
    .get(),
);

const selLive = $v('select').filter((_, el) => $v(el).find('option').length > 3).first();
console.log(
  'LIVE options',
  selLive
    .find('option')
    .map((_, el) => ({ v: $v(el).attr('value'), t: $v(el).text().trim() }))
    .get(),
);

// Absolute live URLs in local blog
const abs = [...localBlog.matchAll(/https?:\/\/emiratisationgateway\.com[^"'\\\s]*/g)].map((m) => m[0]);
console.log('absolute live refs count', abs.length);
console.log(
  'sample abs',
  [...new Set(abs)].slice(0, 20),
);

const localAuth = await (await fetch('http://127.0.0.1:5106/author/')).text();
const liveAuth = await (await fetch('https://emiratisationgateway.com/author/')).text();
const $la = cheerio.load(localAuth);
const $va = cheerio.load(liveAuth);
console.log('LOCAL author titles', $la('.elementor-image-box-title').map((_, el) => $la(el).text().trim()).get());
console.log('LOCAL author desc', $la('.elementor-image-box-description').map((_, el) => $la(el).text().trim()).get());
console.log('LIVE author titles', $va('.elementor-image-box-title').map((_, el) => $va(el).text().trim()).get());
console.log('LOCAL author imgs', $la('.elementor-image-box-img img').map((_, el) => $la(el).attr('src')).get());
console.log('LOCAL author hrefs', $la('.elementor-image-box-title a').map((_, el) => $la(el).attr('href')).get());

// Check if author images exist locally
const root = 'd:/Astro-websites/Astro-production/emiratisationgateway.com';
for (const src of $la('.elementor-image-box-img img').map((_, el) => $la(el).attr('src')).get()) {
  if (!src) continue;
  const path = src.startsWith('/') ? join(root, 'public', src.replace(/^\//, '')) : null;
  const dist = src.startsWith('/') ? join(root, 'dist/client', src.replace(/^\//, '')) : null;
  console.log('img', src, 'public', path && existsSync(path), 'dist', dist && existsSync(dist));
  const r = await fetch('http://127.0.0.1:5106' + src.split('?')[0]);
  console.log('  http', r.status, r.headers.get('content-type'));
}

// Single author
const sa = await (await fetch('http://127.0.0.1:5106/author/nakul/')).text();
const sla = await (await fetch('https://emiratisationgateway.com/author/nakul/')).text();
console.log('local nakul title', (sa.match(/<title>([^<]+)/) || [])[1], 'arts', (sa.match(/ast-article-post|ecs-post-loop/g) || []).length);
console.log('live nakul title', (sla.match(/<title>([^<]+)/) || [])[1], 'arts', (sla.match(/ast-article-post|ecs-post-loop/g) || []).length);

// Form
const contact = await (await fetch('http://127.0.0.1:5106/contact-us/')).text();
console.log('contact has wpcf7', contact.includes('wpcf7'));
console.log('contact has astro-mirror-fixes', contact.includes('astro-mirror-fixes'));
const post = await fetch('http://127.0.0.1:5106/api/contact/', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    name: 'QA Tester',
    email: 'qa@example.com',
    phone: '+971501234567',
    message: 'Form submit check',
    pageUrl: 'http://127.0.0.1:5106/contact-us/',
  }),
});
console.log('POST contact', post.status, await post.text());
