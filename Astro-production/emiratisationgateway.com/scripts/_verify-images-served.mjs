const pages = ['/', '/blog/', '/minimum-wage-in-uae/', '/author/binju-t-r/', '/category/emiratisation/', '/contact-us/'];
let external = 0;
let missing = 0;
const missingPaths = [];
const externalUrls = [];

for (const p of pages) {
  const html = await (await fetch('http://127.0.0.1:5106' + p)).text();
  const urls = [...html.matchAll(/(?:src|href)=["']([^"']+\.(?:png|jpe?g|gif|webp|svg|avif))/gi)].map((m) => m[1]);
  for (const u of urls) {
    if (/^https?:\/\//i.test(u) && !/emiratisationgateway\.com|127\.0\.0\.1/.test(u)) {
      external++;
      externalUrls.push(u);
      continue;
    }
    const path = u.replace(/^https?:\/\/[^/]+/, '').split('?')[0];
    if (!path.startsWith('/')) continue;
    const r = await fetch('http://127.0.0.1:5106' + path, { method: 'HEAD' });
    if (r.status >= 400) {
      missing++;
      missingPaths.push(p + ' -> ' + path);
    }
  }
}

console.log(JSON.stringify({ external, missing, externalUrls: externalUrls.slice(0, 20), missingPaths: missingPaths.slice(0, 30) }, null, 2));
