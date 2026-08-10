/**
 * Compare live vs local author / services / blog structure roughly.
 */
async function get(url) {
  const res = await fetch(url);
  return { status: res.status, html: await res.text() };
}

function count(html, re) {
  return (html.match(re) || []).length;
}

const pairs = [
  ['/', 'home'],
  ['/blog/', 'blog'],
  ['/author/', 'authors'],
  ['/author/nakul/', 'author-nakul'],
  ['/emiratisation/', 'service-emiratisation'],
  ['/recruitment/', 'service-recruitment'],
  ['/staff-outsourcing/', 'service-staff'],
  ['/what-is-emiratisation/', 'post'],
];

for (const [path, label] of pairs) {
  const live = await get('https://emiratisationhub.com' + path);
  const local = await get('http://127.0.0.1:5107' + path);
  console.log(`\n=== ${label} ${path} ===`);
  console.log('status', { live: live.status, local: local.status });
  console.log('len', { live: live.html.length, local: local.html.length });
  console.log('imgs', {
    live: count(live.html, /<img\b/g),
    local: count(local.html, /<img\b/g),
  });
  console.log('h1', {
    live: (live.html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80),
    local: (local.html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80),
  });
  console.log('menu services', {
    live: /\/emiratisation\//.test(live.html) && /\/recruitment\//.test(live.html),
    local: /\/emiratisation\//.test(local.html) && /\/recruitment\//.test(local.html),
  });
}
