import * as cheerio from 'cheerio';

const urls = [
  ['live-home', 'https://emiratisationgateway.com/'],
  ['local-home', 'http://127.0.0.1:5106/'],
  ['live-blog', 'https://emiratisationgateway.com/blog/'],
  ['local-blog', 'http://127.0.0.1:5106/blog/'],
  ['live-post', 'https://emiratisationgateway.com/emiratisation-uae/'],
  ['local-post', 'http://127.0.0.1:5106/emiratisation-uae/'],
];

for (const [name, url] of urls) {
  const res = await fetch(url);
  const html = await res.text();
  const $ = cheerio.load(html);
  console.log('\n===', name, res.status, '===');
  console.log('eicon', $('i[class*="eicon-"]').length);
  console.log('ast-arrow', $('.ast-arrow-svg').length);
  console.log('dialog.js', /dialog\.min\.js/.test(html));
  console.log('ecs_ajax', /ecs_ajax_pagination/.test(html));
  console.log('blog-load-more', /blog-load-more\.js/.test(html));
  console.log('data-cs-blog-load-more', $('[data-cs-blog-load-more]').length);
  console.log('popup519', $('[data-elementor-id="519"], .elementor-519').length);
  console.log('contactform class', $('.contactform').length);
  console.log('wpcf7 forms', $('form.wpcf7-form').length);
  const form = $('form.wpcf7-form').first();
  if (form.length) {
    console.log('form class', form.attr('class'));
    console.log('form wrap parent', form.parent().attr('class'));
    const sample = form
      .html()
      ?.replace(/\s+/g, ' ')
      .slice(0, 280);
    console.log('form sample', sample);
  }
  const nav = $('nav.ecs-load-more-button').first();
  if (nav.length) {
    console.log('loadmore attrs', {
      'data-cs': nav.attr('data-cs-blog-load-more') != null,
      next: nav.attr('data-next-page'),
      per: nav.attr('data-per-page'),
      offset: nav.attr('data-offset'),
      href: nav.find('a').attr('href'),
    });
  }
  // partner carousel settings
  const car = $('.elementor-widget-image-carousel').first();
  if (car.length) {
    const settings = car.attr('data-settings') || car.find('[data-settings]').attr('data-settings') || '';
    console.log('carousel settings snippet', settings.slice(0, 180));
  }
}

// asset probes
const assets = [
  '/wp-content/plugins/elementor/assets/lib/eicons/fonts/eicons.woff2',
  '/wp-content/plugins/elementor/assets/lib/dialog/dialog.min.js',
  '/wp-content/plugins/country-phone-field-contact-form-7/assets/img/flags.png',
];
for (const a of assets) {
  for (const origin of ['http://127.0.0.1:5106', 'https://emiratisationgateway.com']) {
    const r = await fetch(origin + a, { method: 'HEAD' }).catch(() => null);
    console.log((r?.status ?? 'ERR'), origin + a);
  }
}
