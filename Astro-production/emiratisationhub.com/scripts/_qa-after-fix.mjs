#!/usr/bin/env node
const L = 'http://127.0.0.1:5107';

const home = await (await fetch(L + '/')).text();
const blog = await (await fetch(L + '/blog/')).text();
const css = await (await fetch(L + '/css/form-fix.css')).text();
const js = await (await fetch(L + '/js/astro-mirror-fixes.js')).text();

const logoIdx = home.indexOf('elementor-element-180c51f');
const logo = home.slice(logoIdx, logoIdx + 6000);

console.log(
  JSON.stringify(
    {
      form100: /#contact-formnew input\[type='text'\]/.test(css) && /width: 100% !important/.test(css),
      homeFormFix: /form-fix\.css/.test(home),
      logoPreloadersInHtml: (logo.match(/swiper-lazy-preloader/g) || []).length,
      jsRemovesPreloader: /swiper-lazy-preloader/.test(js) && /el\.remove\(\)/.test(js),
      jsBlogFilter: /ensureBlogCategoryFilters/.test(js),
      blogHasFilterButtons: /filter-button/.test(blog),
      blogHasFilterPosts: (blog.match(/main-post post-wrap/g) || []).length,
      blogAuthorSample: (blog.match(/type-author[\s\S]{0,140}/) || [''])[0].replace(/\s+/g, ' ').slice(0, 140),
      faqIconLeft: /elementor-accordion-icon-left/.test(js),
      faqSmooth: /height 280ms ease/.test(js),
    },
    null,
    2,
  ),
);

const payload = {
  name: 'Ops Verify Test',
  email: 'ops-verify@example.com',
  phone: '+971501234567',
  message: 'Ops verification after UI fixes — please ignore / delete.',
  formName: 'Emiratisation Hub Contact Form',
  formSource: '270',
  pageUrl: `${L}/`,
  submissionId: `ops-verify-${Date.now()}`,
  submittedAt: new Date().toISOString(),
};
const res = await fetch(`${L}/api/contact/`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  body: JSON.stringify(payload),
});
const body = await res.json();
console.log('contact', res.status, body);

// Find lead delivery
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
const leadRoot = 'Astro-production/emiratisationhub.com/.data/leads';
function walk(d, acc = []) {
  if (!existsSync(d)) return acc;
  for (const n of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, n.name);
    if (n.isDirectory()) walk(p, acc);
    else if (n.name.endsWith('.json')) acc.push(p);
  }
  return acc;
}
const latest = walk(leadRoot)
  .map((p) => ({ p, t: statSync(p).mtimeMs }))
  .sort((a, b) => b.t - a.t)[0];
if (latest) {
  const j = JSON.parse(readFileSync(latest.p, 'utf8'));
  console.log('lead', {
    file: latest.p.split(/[/\\]/).pop(),
    deliveryStatus: j.deliveryStatus,
    person: Boolean(j.pipedrivePersonId),
    lead: Boolean(j.pipedriveLeadId),
  });
}
