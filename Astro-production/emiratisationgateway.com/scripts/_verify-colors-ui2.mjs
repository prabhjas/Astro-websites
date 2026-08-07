const cat = await (await fetch('http://127.0.0.1:5106/category/emiratisation/')).text();
console.log({
  cssBlack: /color:#111/.test(cat),
  customCss: /astro-cat-select__btn/.test(cat),
  mirror: (cat.match(/astro-mirror-fixes\.js\?v=[^"']+/) || [])[0],
  pagBlack: /ast-pagination a[^\{]*\{[^}]*#111/.test(cat),
});
const auth = await (await fetch('http://127.0.0.1:5106/author/binju-t-r/')).text();
console.log({ authorMirror: (auth.match(/astro-mirror-fixes\.js\?v=[^"']+/) || [])[0] });
const js = await (await fetch('http://127.0.0.1:5106/js/astro-mirror-fixes.js?v=20260806-ui2')).text();
console.log({
  jsHasCustom: js.includes('astro-cat-select__btn'),
  jsHasPagBlack: js.includes('.ast-pagination a') && js.includes('color:#111111'),
});
