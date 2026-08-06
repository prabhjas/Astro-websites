import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = 'd:/Astro-websites/Astro-production/emiratisationgateway.com';
const blog = readFileSync(join(root, 'src/legacy/blog.cleaned.html'), 'utf8');
console.log({
  formActionLive: /form action="https:\/\/emiratisationgateway\.com"/.test(blog),
  formActionHash: /form action="#"/i.test(blog) || /form action='#'/i.test(blog),
  hasCatMap: blog.includes('catMap') || blog.includes('/category/emiratisation/'),
});

const auth = readFileSync(join(root, 'src/legacy/author.cleaned.html'), 'utf8');
console.log({
  targetBlankAuthor: (auth.match(/author\/[^"]+"[^>]*target="_blank"/g) || []).length,
  authorNames: (auth.match(/elementor-image-box-title/g) || []).length,
});

const html = await (await fetch('http://127.0.0.1:5106/blog/')).text();
console.log({
  servedFormLive: /action="https:\/\/emiratisationgateway\.com"/.test(html),
  servedFormHash: /action="#"/i.test(html),
  servedCatMap: html.includes('catMap') || /category\/emiratisation\//.test(html),
  script: (html.match(/astro-mirror-fixes\.js[^"']*/) || [])[0],
});

const authHtml = await (await fetch('http://127.0.0.1:5106/author/')).text();
console.log({
  authCss: authHtml.includes('auth-box') || authHtml.includes('image-box-title'),
  authTargetBlank: (authHtml.match(/\/author\/[^"]+"[^>]*target="_blank"/g) || []).length,
  names: [...authHtml.matchAll(/elementor-image-box-title[^>]*>[\s\S]*?<a[^>]*>([^<]+)/g)].map((m) => m[1]),
});

const js = await (await fetch('http://127.0.0.1:5106/js/astro-mirror-fixes.js?v=20260806-cat1')).text();
console.log({
  jsOk: js.length > 10000,
  hasIntercept: js.includes('interceptCategoryDropdown') || js.includes('catMap') || js.includes('/category/emiratisation/'),
});

for (const u of [
  '/wp-content/uploads/2024/07/Author-3.png',
  '/wp-content/uploads/2023/10/logo-Emiratization-Gateway_normal-227x50.png',
  '/author/nakul/',
  '/category/outsourcing/',
]) {
  const r = await fetch('http://127.0.0.1:5106' + u);
  console.log(r.status, u);
}

const post = await fetch('http://127.0.0.1:5106/api/contact/', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    name: 'QA',
    email: 'qa@example.com',
    phone: '+971501234567',
    message: 'verify',
    pageUrl: 'http://127.0.0.1:5106/contact-us/',
  }),
});
console.log('contact', post.status, (await post.text()).slice(0, 120));
