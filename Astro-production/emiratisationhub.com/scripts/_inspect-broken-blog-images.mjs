const html = await (await fetch('http://127.0.0.1:4332/blog/')).text();

const imgs = [...html.matchAll(/<img[^>]*>/gi)];
let shown = 0;
for (const m of imgs) {
  const tag = m[0];
  const src = (tag.match(/\ssrc="([^"]*)"/i) || [])[1] || '';
  const lazy = (tag.match(/data-lazy-src="([^"]*)"/i) || [])[1] || '';
  if (!src || src.startsWith('data:image') || tag.includes('data-rv-broken')) {
    shown++;
    console.log('\nimg tag:', tag.slice(0, 260));
    console.log('src:', src);
    console.log('lazy:', lazy);
  }
  if (shown >= 25) break;
}

console.log('\nTotal imgs:', imgs.length, 'sampled problematic:', shown);
