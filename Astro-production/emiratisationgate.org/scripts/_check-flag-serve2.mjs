const base = 'http://127.0.0.1:5105';
const page = await fetch(base + '/emiratisation-recruitment/').then((r) => r.text());
const mirror = (page.match(/astro-mirror-fixes[^"'<\s]*/) || [])[0];
const js = await fetch(base + '/js/astro-mirror-fixes.js?v=20260806-flag2').then((r) => r.text());
console.log({
  mirror,
  nbcpfStripped: page.includes('nbcpf intlTelInput init removed'),
  hasBadNotHide: js.includes(':not(.intl-tel-input .flag-container)'),
  hasTableFix: js.includes('separateDialCode needs display:table'),
  flagsPng: (await fetch(base + '/js/phone-flags/flags.png')).status,
  itiCss: (await fetch(base + '/wp-content/plugins/country-phone-field-contact-form-7/assets/css/intlTelInput.min.css')).status,
});
