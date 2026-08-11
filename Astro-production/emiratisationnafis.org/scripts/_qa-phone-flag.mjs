import * as cheerio from 'cheerio';

const html = await (await fetch('http://127.0.0.1:5108/')).text();
const $ = cheerio.load(html);
console.log({
  phonetext: $('.wpcf7-phonetext').length,
  nbcpfRemoved: /nbcpf intlTelInput init removed/.test(html),
  itiJsLinked: /intlTelInput\.min\.js/.test(html),
  itiCssLinked: /intlTelInput\.min\.css/.test(html),
  jquery: /jquery.*\.js/i.test(html),
  mirror: (html.match(/astro-mirror-fixes\.js\?v=[^"']+/) || [])[0],
});

for (const p of [
  '/js/phone-flags/flags.png',
  '/wp-content/plugins/country-phone-field-contact-form-7/assets/js/intlTelInput.min.js',
  '/wp-content/plugins/country-phone-field-contact-form-7/assets/css/intlTelInput.min.css',
  '/js/astro-mirror-fixes.js?v=20260806-qa2',
]) {
  console.log((await fetch('http://127.0.0.1:5108' + p)).status, p);
}

const phone = $('.wpcf7-phonetext').first();
console.log('phone outer', $.html(phone.parent()).slice(0, 400));
