const html = await (await fetch('http://127.0.0.1:4332/blog/')).text();
const bodyIdx = html.search(/<body\b/i);
console.log('body at', bodyIdx);
console.log('snippet before body:', html.slice(Math.max(0, bodyIdx - 400), bodyIdx + 80).replace(/\n/g, '\\n'));
