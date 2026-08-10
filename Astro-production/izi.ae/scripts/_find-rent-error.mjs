#!/usr/bin/env node
const html = await (await fetch('http://127.0.0.1:5121/')).text();
for (const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)) {
  const attrs = m[1];
  const body = m[2];
  if (!/Rent/.test(body)) continue;
  if (/src\s*=/.test(attrs)) continue;
  const typed = /type\s*=\s*["']([^"']+)["']/i.exec(attrs);
  const type = typed ? typed[1] : '(default js)';
  if (type === 'application/ld+json' || type === 'application/json') continue;
  console.log('--- type=', type, 'len=', body.length);
  console.log(body.slice(0, 300).replace(/\s+/g, ' '));
}
