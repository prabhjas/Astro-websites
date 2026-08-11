#!/usr/bin/env node
const LOCAL = 'http://127.0.0.1:5107';
const LIVE = '';

async function html(base, path) {
  return (await fetch(base + path)).text();
}

function snippet(html, re, n = 500) {
  const m = html.match(re);
  return m ? m[0].replace(/\s+/g, ' ').slice(0, n) : null;
}

const homeL = await html(LOCAL, '/');
const homeV = await html(LIVE, '/');

// Logo carousel slides — check src emptiness
function carouselImgs(html, widgetId) {
  const re = new RegExp(
    `elementor-element-${widgetId}[\\s\\S]*?(?=elementor-element-[a-f0-9]{6,}|$)`,
    'i',
  );
  const block = (html.match(re) || [''])[0].slice(0, 25000);
  const imgs = [...block.matchAll(/<img\b([^>]*)>/gi)].map((m) => {
    const attrs = m[1];
    const src = (attrs.match(/\ssrc=(["'])(.*?)\1/i) || [])[2] || '';
    const dataSrc = (attrs.match(/\sdata-src=(["'])(.*?)\1/i) || [])[2] || '';
    const lazy = (attrs.match(/\sdata-lazy-src=(["'])(.*?)\1/i) || [])[2] || '';
    return { src: src.slice(0, 80), dataSrc: dataSrc.slice(0, 80), lazy: lazy.slice(0, 80), emptySrc: !src || src.startsWith('data:') };
  });
  return { count: imgs.length, emptySrc: imgs.filter((i) => i.emptySrc).length, sample: imgs.slice(0, 4) };
}

console.log('logo carousel local', carouselImgs(homeL, '180c51f'));
console.log('logo carousel live', carouselImgs(homeV, '180c51f'));
console.log('loop carousel local', carouselImgs(homeL, '443c7c5'));
console.log('loop carousel live', carouselImgs(homeV, '443c7c5'));

// FAQ structure on homepage
console.log('faq local', snippet(homeL, /elementor-widget-accordion[\s\S]{0,800}/i));
console.log('faq title local', snippet(homeL, /elementor-tab-title[\s\S]{0,250}/i));
console.log('faq title live', snippet(homeV, /elementor-tab-title[\s\S]{0,250}/i));

// Menu caret / sub-arrow on live vs local
console.log('sub-arrow local', (homeL.match(/sub-arrow/g) || []).length);
console.log('sub-arrow live', (homeV.match(/sub-arrow/g) || []).length);
console.log('menu services local', snippet(homeL, /menu-item-has-children[\s\S]{0,350}Services[\s\S]{0,200}/i));
console.log('menu services live', snippet(homeV, /menu-item-has-children[\s\S]{0,350}Services[\s\S]{0,200}/i));

const blogL = await html(LOCAL, '/blog/');
const blogV = await html(LIVE, '/blog/');
console.log('blog 1975 local', (blogL.match(/elementor-1975/g) || []).length);
console.log('blog 1975 live', (blogV.match(/elementor-1975/g) || []).length);
console.log('blog 1985 local', (blogL.match(/elementor-1985/g) || []).length);
console.log('blog 1985 live', (blogV.match(/elementor-1985/g) || []).length);
console.log('blog card local', snippet(blogL, /elementor-1975[\s\S]{0,400}/i));
console.log('blog card live', snippet(blogV, /elementor-1975[\s\S]{0,400}/i) || snippet(blogV, /elementor-post__thumbnail[\s\S]{0,400}/i));
console.log('posts container local', snippet(blogL, /elementor-posts-container[\s\S]{0,300}/i));
console.log('posts container live', snippet(blogV, /elementor-posts-container[\s\S]{0,300}/i));

// Count visible post articles
console.log('article local', (blogL.match(/<article\b/gi) || []).length);
console.log('article live', (blogV.match(/<article\b/gi) || []).length);

const postL = await html(LOCAL, '/emiratisation-meaning/');
const postV = await html(LIVE, '/emiratisation-meaning/');
console.log('sticky settings local', snippet(postL, /3595752[\s\S]{0,500}/i));
console.log('sticky settings live', snippet(postV, /3595752[\s\S]{0,500}/i));
console.log('f006bfc local', (postL.match(/f006bfc/g) || []).length);
console.log('f006bfc live', (postV.match(/f006bfc/g) || []).length);

// geo API
const geo = await fetch(LOCAL + '/api/geo/country');
console.log('geo', geo.status, (await geo.text()).slice(0, 200));

// services page content length / hero
const svcL = await html(LOCAL, '/emiratisation/');
const svcV = await html(LIVE, '/emiratisation/');
console.log('svc sections local', (svcL.match(/elementor-section/g) || []).length, 'live', (svcV.match(/elementor-section/g) || []).length);
console.log('svc form-fix', /form-fix\.css/.test(svcL));
