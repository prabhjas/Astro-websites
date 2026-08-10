#!/usr/bin/env node
/**
 * Deep UI parity probe for emiratisationhub local vs live.
 */
const LOCAL = process.env.LOCAL_BASE || 'http://127.0.0.1:5107';
const LIVE = 'https://emiratisationhub.com';

async function get(base, path) {
  const res = await fetch(`${base}${path}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 AstroQA/1.0' },
    redirect: 'follow',
  });
  const html = await res.text();
  return { status: res.status, html, len: html.length };
}

function probe(html, label) {
  const has = (re) => re.test(html);
  const count = (re) => (html.match(re) || []).length;
  return {
    label,
    eiconsCss: has(/elementor-icons|eicons/i),
    eiconCaret: count(/eicon-caret-down|eicon-angle-down|sub-arrow/gi),
    menuServices: has(/Services/i) && has(/emiratisation|recruitment|staff-outsourcing/i),
    swiperCss: has(/swiper\.min\.css/i),
    swiperJs: has(/swiper[^"']*\.js/i) || has(/new Swiper/i),
    swiperSlides: count(/swiper-slide/gi),
    swiperLazyDataSrc: count(/swiper-lazy|data-src=/gi),
    imageCarousel: has(/elementor-widget-image-carousel/i),
    logoCarousel: has(/elementor-image-carousel|partner|logo/i) && has(/swiper/i),
    nestedCarousel: has(/e-n-carousel|elementor-widget-nested-carousel/i),
    faqItems: count(/elementor-toggle-item|elementor-accordion-item|e-n-accordion-item/gi),
    faqTitles: count(/elementor-tab-title|e-n-accordion-item-title/gi),
    faqIcons: count(/elementor-toggle-icon|e-n-accordion-item-title-icon|astro-faq/gi),
    formFixCss: has(/form-fix\.css/i),
    mirrorFixes: has(/astro-mirror-fixes\.js/i),
    itiCss: has(/intlTelInput|iti\.min\.css|intl-tel-input/i),
    itiJs: has(/intlTelInput|utils\.js/i),
    phoneField: has(/wpcf7-phonetext|phonetext-/i),
    stickyParent: has(/3595752|elementor-sticky/i),
    blog1975: has(/elementor-element-1975|elementor-post--skin-classic/i),
    blog1985: has(/elementor-element-1985/i),
    blogCards: count(/elementor-post__card|elementor-post\b/gi),
    featuredImg: count(/elementor-post__thumbnail/gi),
  };
}

const paths = ['/', '/blog/', '/emiratisation-meaning/', '/emiratisation/', '/contact-us/'];
const out = {};
for (const path of paths) {
  const local = await get(LOCAL, path);
  let live = null;
  try {
    live = await get(LIVE, path);
  } catch (e) {
    live = { status: 0, html: '', len: 0, error: String(e) };
  }
  out[path] = {
    localStatus: local.status,
    liveStatus: live.status,
    local: probe(local.html, 'local'),
    live: probe(live.html, 'live'),
  };

  // Extra homepage slider diagnostics
  if (path === '/') {
    const loc = local.html;
    const lv = live.html;
    const extractWidgets = (html) => {
      const ids = [...html.matchAll(/elementor-element-([a-f0-9]+)\s[^>]*elementor-widget-(image-carousel|nested-carousel|slides|loop|testimonial)/gi)].map(
        (m) => `${m[2]}:${m[1]}`,
      );
      return [...new Set(ids)].slice(0, 20);
    };
    out[path].localWidgets = extractWidgets(loc);
    out[path].liveWidgets = extractWidgets(lv);
    // Menu caret HTML snippet
    const menuHit = loc.match(/Services[\s\S]{0,400}/i);
    out[path].localMenuSnippet = menuHit ? menuHit[0].replace(/\s+/g, ' ').slice(0, 350) : null;
    const liveMenu = lv.match(/Services[\s\S]{0,400}/i);
    out[path].liveMenuSnippet = liveMenu ? liveMenu[0].replace(/\s+/g, ' ').slice(0, 350) : null;
  }

  if (path === '/blog/') {
    // Card class fingerprints
    const cardClass = (html) => {
      const m = html.match(/class="([^"]*elementor-post[^"]*)"/);
      return m ? m[1].slice(0, 200) : null;
    };
    out[path].localCardClass = cardClass(local.html);
    out[path].liveCardClass = cardClass(live.html);
    out[path].localHasPost1975Css = /post-1975\.css|1975\.css/i.test(local.html);
    out[path].liveHasPost1975Css = /post-1975\.css|1975\.css/i.test(live.html);
  }

  if (path === '/emiratisation-meaning/') {
    out[path].localSticky = {
      has3595752: /3595752/.test(local.html),
      stickyClass: /elementor-sticky/.test(local.html),
      formPresent: /wpcf7-form/.test(local.html),
    };
    out[path].liveSticky = {
      has3595752: /3595752/.test(live.html),
      stickyClass: /elementor-sticky/.test(live.html),
      formPresent: /wpcf7-form/.test(live.html),
    };
  }
}

console.log(JSON.stringify(out, null, 2));
