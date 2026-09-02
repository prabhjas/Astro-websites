const html = await (await fetch('http://127.0.0.1:4332/blog/')).text();
console.log('has head close', /<\/head>/i.test(html));
console.log('head close count', (html.match(/<\/head>/gi) || []).length);
const idx = html.search(/<\/head>/i);
console.log('near head close:', html.slice(Math.max(0, idx - 200), idx + 20).replace(/\n/g, '\\n'));
