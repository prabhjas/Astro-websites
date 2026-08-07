import * as cheerio from 'cheerio';

async function get(url) {
  const res = await fetch(url);
  const html = await res.text();
  return { status: res.status, html, $: cheerio.load(html) };
}

const live = await get('https://emiratisationgateway.com/emiratisation-uae/');
const local = await get('http://127.0.0.1:5106/emiratisation-uae/');

function summarize(label, $) {
  console.log('\n====', label, '====');
  // Header / menu icons
  const header = $('.site-header, .ast-header-wrap, header').first();
  console.log('menu items', $('.main-header-menu > .menu-item, .ast-nav-menu > .menu-item').length);
  console.log('menu item icons (img)', $('.main-header-menu img, .ast-nav-menu img').length);
  console.log('menu fas/fa', $('.main-header-menu .fas, .main-header-menu .fa, .ast-nav-menu .fas, .ast-nav-menu .fa').length);
  console.log('ahfb svg', $('.ahfb-svg-iconset').length);
  console.log('above header display none?', /ast-above-header-bar\s*\{[^}]*display\s*:\s*none/.test($.html()));
  console.log('mobile trigger', $('.menu-toggle, .ast-button-wrap, .ast-mobile-menu-trigger-minimal').length);

  // Form containers
  console.log('popup519 display inline', $('[data-elementor-type="popup"]').attr('style') || '(none)');
  console.log('hire now links', $('a[href*="popup:open"]').map((i,el)=>$(el).text().trim()).get());
  console.log('elementor sections', $('.elementor-section').length);
  console.log('columns', $('.elementor-column').length);
  console.log('sidebar sticky ids', $('[class*="f006bfc"],[class*="0933e6e"],[class*="16a1fb7"],[class*="d0c0271"]').map((i,el)=>$(el).attr('class')).get());

  // Form field wrappers / stylesheets for CF7 / intlTel
  const links = $('link[href*="contact"], link[href*="intl"], link[href*="cf7"], link[href*="phone"], link[href*="post-519"], link[href*="popup"]')
    .map((i, el) => $(el).attr('href'))
    .get();
  console.log('form-related CSS', links);

  // Compare form labels/inputs dimensions via presence
  const formHtml = $('form.wpcf7-form').first().parent().html()?.replace(/\s+/g, ' ').slice(0, 600);
  console.log('form parent sample', formHtml);

  // Check for missing stylesheet 404 hints in CSS links count
  console.log('css links', $('link[rel="stylesheet"]').length);
  console.log('scripts', $('script[src]').length);
}

summarize('LIVE', live.$);
summarize('LOCAL', local.$);

// Diff stylesheet hrefs (normalized)
function cssSet($) {
  return new Set(
    $('link[rel="stylesheet"]')
      .map((i, el) => ($(el).attr('href') || '').replace(/^https?:\/\/emiratisationgateway\.com/, '').split('?')[0])
      .get(),
  );
}
const L = cssSet(live.$);
const C = cssSet(local.$);
const onlyLive = [...L].filter((x) => !C.has(x));
const onlyLocal = [...C].filter((x) => !L.has(x));
console.log('\nCSS only on live', onlyLive);
console.log('CSS only on local', onlyLocal);

// homepage icon-boxes
const lh = await get('https://emiratisationgateway.com/');
const ch = await get('http://127.0.0.1:5106/');
console.log('\nHOME live icon-box', lh.$('.elementor-widget-icon-box').length, 'icons', lh.$('.elementor-icon i, .elementor-icon svg').length);
console.log('HOME local icon-box', ch.$('.elementor-widget-icon-box').length, 'icons', ch.$('.elementor-icon i, .elementor-icon svg').length);
console.log('HOME live icon classes sample', ch.$('.elementor-icon').first().html()?.slice(0,200));
lh.$('.elementor-icon').each((i, el) => {
  if (i < 6) console.log('live icon', i, lh.$(el).html()?.replace(/\s+/g,' ').slice(0,120));
});
ch.$('.elementor-icon').each((i, el) => {
  if (i < 6) console.log('local icon', i, ch.$(el).html()?.replace(/\s+/g,' ').slice(0,120));
});

// Check for Font Awesome / eicons link presence
for (const [name, $] of [['live', lh.$], ['local', ch.$]]) {
  const iconCss = $('link[href*="fontawesome"],link[href*="elementor-icons"],link[href*="eicons"],link[href*="solid"],link[href*="brands"]')
    .map((i,el)=>$(el).attr('href')).get();
  console.log(name, 'icon CSS', iconCss);
}
