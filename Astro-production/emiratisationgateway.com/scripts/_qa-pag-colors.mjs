const pages = [
  'http://127.0.0.1:5106/category/emiratisation/',
  'http://127.0.0.1:5106/minimum-wage-in-uae/',
  'https://emiratisationgateway.com/category/emiratisation/',
];
for (const url of pages) {
  const html = await (await fetch(url)).text();
  const vars = {};
  for (let i = 0; i <= 8; i++) {
    const m = html.match(new RegExp(`--ast-global-color-${i}:\\s*([^;]+)`));
    if (m) vars[i] = m[1].trim();
  }
  // also e-global
  const e0 = (html.match(/--e-global-color-astglobalcolor0:\s*([^;]+)/) || [])[1];
  console.log(url.replace(/https?:\/\/[^/]+/, ''), vars, { e0 });
}

// Check if page-numbers links have computed issue from specificity
// Look for conflicting white color on .page-numbers
const cat = await (await fetch('http://127.0.0.1:5106/category/emiratisation/')).text();
const whiteHits = [...cat.matchAll(/\.ast-pagination[^,{]*[^{]*\{[^}]*color:\s*#fff[^}]*\}/gi)].map((m) => m[0]);
const color5Hits = [...cat.matchAll(/\.ast-pagination[^,{]*[^{]*\{[^}]*color:\s*var\(--ast-global-color-5\)[^}]*\}/gi)].map((m) => m[0]);
console.log('white rules', whiteHits);
console.log('color5 rules', color5Hits);

// Author pagination
const auth = await (await fetch('http://127.0.0.1:5106/author/binju-t-r/')).text();
const authPag = (auth.match(/elementor-pagination[\s\S]{0,800}/) || ['none'])[0].replace(/\s+/g, ' ').slice(0, 500);
console.log('author pag', authPag);
