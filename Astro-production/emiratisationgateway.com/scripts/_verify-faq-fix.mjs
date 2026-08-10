const html = await (await fetch('http://127.0.0.1:5106/?_=' + Date.now())).text();
const script = (html.match(/astro-mirror-fixes\.js[^"']*/) || [])[0];
const minus = (html.match(/elementor-accordion-title" tabindex="-1"/g) || []).length;
const zero = (html.match(/elementor-accordion-title" tabindex="0"/g) || []).length;
console.log({ script, minus, zero });

const js = await (await fetch('http://127.0.0.1:5106/js/astro-mirror-fixes.js?v=20260806-faq2')).text();
console.log({
  hasOutlineFix: js.includes('Kill dotted focus'),
  hasBlur: js.includes('Drop browser focus ring'),
  hasTabFix: js.includes("setAttribute('tabindex', '-1')"),
  len: js.length,
});
