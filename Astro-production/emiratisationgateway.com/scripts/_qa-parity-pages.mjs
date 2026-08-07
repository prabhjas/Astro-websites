import * as cheerio from 'cheerio';

const LOCAL = 'http://127.0.0.1:5106';
const LIVE = 'https://emiratisationgateway.com';

async function compare(path) {
  const [lRes, vRes] = await Promise.all([fetch(LOCAL + path), fetch(LIVE + path)]);
  const [lHtml, vHtml] = await Promise.all([lRes.text(), vRes.text()]);
  const $l = cheerio.load(lHtml);
  const $v = cheerio.load(vHtml);

  const sectionIds = ($) =>
    $('.elementor-section[data-id], .elementor-top-section[data-id]')
      .map((_, el) => $(el).attr('data-id'))
      .get();
  const headings = ($) =>
    $('h1,h2,h3')
      .map((_, el) => $(el).text().replace(/\s+/g, ' ').trim())
      .get()
      .filter(Boolean);

  const lSec = sectionIds($l);
  const vSec = sectionIds($v);
  const lHead = headings($l);
  const vHead = headings($v);

  const missingSec = vSec.filter((id) => !lSec.includes(id));
  const extraSec = lSec.filter((id) => !vSec.includes(id));
  const missingHead = vHead.filter((h) => !lHead.includes(h));
  const extraHead = lHead.filter((h) => !vHead.includes(h));

  // widgets inventory
  const widgets = ($) => {
    const counts = {};
    $('[class*="elementor-widget-"]').each((_, el) => {
      const m = ($(el).attr('class') || '').match(/elementor-widget-([a-z0-9_-]+)/i);
      if (!m) return;
      counts[m[1]] = (counts[m[1]] || 0) + 1;
    });
    return counts;
  };
  const lw = widgets($l);
  const vw = widgets($v);
  const widgetDiff = {};
  for (const k of new Set([...Object.keys(lw), ...Object.keys(vw)])) {
    if ((lw[k] || 0) !== (vw[k] || 0)) widgetDiff[k] = { local: lw[k] || 0, live: vw[k] || 0 };
  }

  return {
    path,
    status: { local: lRes.status, live: vRes.status },
    sections: { local: lSec.length, live: vSec.length, missingSec, extraSec },
    headings: { local: lHead.length, live: vHead.length, missingHead: missingHead.slice(0, 8), extraHead: extraHead.slice(0, 8) },
    widgetDiff,
    images: { local: $l('img').length, live: $v('img').length },
    forms: { local: $l('form.wpcf7-form').length, live: $v('form.wpcf7-form').length },
  };
}

const paths = [
  '/',
  '/blog/',
  '/contact-us/',
  '/emiratisation-uae/',
  '/emiratisation-services/',
  '/emiratisation-recruitment/',
  '/staff-outsourcing/',
  '/about-us/',
  '/nafis-faqs/',
  '/author/',
];

for (const p of paths) {
  console.log(JSON.stringify(await compare(p), null, 2));
}

// Contact form POST from post page context
const post = await fetch(LOCAL + '/api/contact/', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    name: 'QA Reviewer',
    email: 'qa@example.com',
    phone: '+971501234567',
    message: 'Single post contact form QA',
    pageUrl: LOCAL + '/emiratisation-uae/',
  }),
});
console.log('contact api', post.status, (await post.text()).slice(0, 160));

// Check dialog is loadable for Elementor dynamic import
console.log(
  'dialog',
  (
    await fetch(LOCAL + '/wp-content/plugins/elementor/assets/lib/dialog/dialog.min.js')
  ).status,
  'bytes',
  (await (await fetch(LOCAL + '/wp-content/plugins/elementor/assets/lib/dialog/dialog.min.js')).text()).length,
);
