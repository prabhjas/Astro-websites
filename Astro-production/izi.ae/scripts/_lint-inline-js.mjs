#!/usr/bin/env node
const html = await (await fetch('http://127.0.0.1:5121/')).text();
let i = 0;
for (const m of html.matchAll(/<script(\b[^>]*)>([\s\S]*?)<\/script>/gi)) {
  const attrs = m[1] || '';
  const body = (m[2] || '').trim();
  if (!body) continue;
  if (/\bsrc\s*=/.test(attrs)) continue;
  const typeM = /type\s*=\s*["']([^"']+)["']/i.exec(attrs);
  const type = (typeM?.[1] || 'text/javascript').toLowerCase();
  if (type !== 'text/javascript' && type !== 'module' && type !== '') continue;
  if (typeM && type !== 'text/javascript' && type !== 'module') continue;
  // skip non-js types explicitly
  if (typeM && !/^text\/javascript$|^module$|^$/.test(type) && type !== 'text/javascript') continue;
  if (/speculationrules|application\/ld\+json|application\/json|text\/template|text\/html/i.test(attrs)) continue;
  i++;
  try {
    // eslint-disable-next-line no-new-func
    new Function(body);
  } catch (e) {
    console.log('FAIL #' + i, e.message);
    console.log('attrs:', attrs.trim());
    console.log(body.slice(0, 400));
    console.log('---');
  }
}
console.log('checked', i, 'inline js scripts');
