const urls = [
  'http://127.0.0.1:4332/recruitment-agency-in-uae/',
  'http://127.0.0.1:4332/uae-national-day/',
  'http://127.0.0.1:4332/unemployment-benefit/',
  'http://127.0.0.1:4332/it-and-technical/',
  'http://127.0.0.1:4332/emiratisation',
  'http://127.0.0.1:4332/cdn-cgi/l/email-protection',
];

for (const url of urls) {
  const res = await fetch(url, { redirect: 'manual' });
  const body = await res.text();
  const canonical = (body.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)/i) || [])[1] || 'MISSING';
  const title = (body.match(/<title>([^<]*)<\/title>/i) || [])[1] || '';
  console.log(url, 'status=' + res.status, 'canonical=' + canonical, 'title=' + title.slice(0, 80));
}
