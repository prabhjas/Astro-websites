async function check(url, label) {
  const html = await (await fetch(url)).text();
  const nav = (html.match(/ecs-load-more-button[\s\S]{0,500}/) || ['none'])[0];
  const btnRules = [...html.matchAll(/ecs-load-more[^{]*\{[^}]+\}/gi)].slice(0, 10).map((m) => m[0]);
  const elementorBtn = [...html.matchAll(/\.elementor-\d+[^{]*ecs-load-more[^{]*\{[^}]+\}|\.elementor-element-[a-z0-9]+[^{]*button[^{]*\{[^}]+\}/gi)].slice(0, 8);
  console.log('\n===', label, '===');
  console.log('nav', nav.replace(/\s+/g, ' ').slice(0, 400));
  console.log('rules', btnRules);
}
await check('http://127.0.0.1:5106/blog/', 'LOCAL blog');
await check('https://emiratisationgateway.com/blog/', 'LIVE blog');
await check('http://127.0.0.1:5106/minimum-wage-in-uae/', 'LOCAL post');

import { existsSync, readFileSync } from 'fs';
for (const id of ['285', '346', '276']) {
  const p = `public/wp-content/uploads/elementor/css/post-${id}.css`;
  if (!existsSync(p)) { console.log('missing', id); continue; }
  const css = readFileSync(p, 'utf8');
  const hits = [...css.matchAll(/[^{}]*load-more[^{]*\{[^}]+\}|[^{}]*elementor-button[^{]*\{[^}]+\}/gi)].slice(0, 12).map((m) => m[0].slice(0, 220));
  console.log('\npost', id, hits);
}
