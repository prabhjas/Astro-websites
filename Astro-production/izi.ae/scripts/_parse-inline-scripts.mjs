#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
const html = await (await fetch('http://127.0.0.1:5121/')).text();
const m = html.match(/var elementorFrontendConfig\s*=\s*(\{[\s\S]*?\});/);
if (!m) {
  console.log('no elementorFrontendConfig');
  process.exit(1);
}
const json = m[1];
writeFileSync('.tmp-qa/elementorFrontendConfig.json', json);
try {
  JSON.parse(json);
  console.log('elementorFrontendConfig JSON OK', json.length);
} catch (e) {
  console.log('PARSE FAIL', e.message);
  // show around error position if any
  const pos = Number((e.message.match(/position (\d+)/) || [])[1] || 0);
  console.log(json.slice(Math.max(0, pos - 80), pos + 80));
}

// Try to locate other default-type scripts and Function() them
let i = 0;
for (const s of html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi)) {
  const attrs = s[1];
  const body = s[2].trim();
  if (!body) continue;
  if (/type\s*=\s*["']application\/(ld\+)?json["']/i.test(attrs)) continue;
  if (/type\s*=\s*["']text\/template["']/i.test(attrs)) continue;
  i++;
  try {
    // eslint-disable-next-line no-new-func
    new Function(body);
  } catch (err) {
    console.log('BAD SCRIPT', i, err.message);
    console.log(body.slice(0, 250).replace(/\s+/g, ' '));
  }
}
