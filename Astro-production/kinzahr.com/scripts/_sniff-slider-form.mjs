import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const h = readFileSync('src/legacy/homepage.cleaned.html', 'utf8');
console.log({
  owlCarousel: /owl\.carousel|owl-carousel/i.test(h),
  owlCss: /owl\.carousel.*\.css|owl\.theme/i.test(h),
  owlJs: /owl\.carousel.*\.js/i.test(h),
  jquery: /jquery(\.min)?\.js/i.test(h),
  swiper: /swiper/i.test(h),
  sliderSec: /slider-sec/i.test(h),
  cf7: /wpcf7|contact-form-7/i.test(h),
  intlTel: /intlTelInput|iti__/i.test(h),
  elementorForm: /elementor-form|elementor-field/i.test(h),
});

console.log('\n-- slider/form related tags --');
for (const m of h.matchAll(
  /<(?:link|script)[^>]+(?:owl|swiper|carousel|intlTel|contact-form|wpcf7|cdnjs)[^>]*>/gi,
)) {
  console.log(m[0].slice(0, 220));
}

const paths = [
  'public/wp-content/plugins/country-phone-field-contact-form-7/assets/css/intlTelInput.min.css',
  'public/wp-content/plugins/country-phone-field-contact-form-7/assets/js/intlTelInput.min.js',
  'public/wp-content/plugins/contact-form-7/includes/css/styles.css',
  'public/wp-content/plugins/contact-form-7/includes/js/index.js',
];
console.log('\n-- local files --');
for (const p of paths) console.log(existsSync(p) ? 'HAVE' : 'MISS', p);

// Find owl init snippet
const idx = h.search(/owlCarousel|slider-sec/);
if (idx >= 0) console.log('\ninit snippet:\n', h.slice(idx - 100, idx + 400));
