const urls = [
  'http://127.0.0.1:4332/',
  'http://127.0.0.1:4332/about-us/',
  'http://127.0.0.1:4332/recruitment/',
  'http://127.0.0.1:4332/staff-outsourcing/',
  'http://127.0.0.1:4332/emiratisation/',
  'http://127.0.0.1:4332/blog/',
  'http://127.0.0.1:4332/contact-us/',
];

for (const url of urls) {
  const res = await fetch(url);
  const html = await res.text();
  const canonical = (html.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)/i) || [])[1] || 'MISSING';
  console.log(url, 'status=' + res.status, 'canonical=' + canonical);
}
