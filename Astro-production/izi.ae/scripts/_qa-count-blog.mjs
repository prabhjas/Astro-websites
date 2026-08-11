#!/usr/bin/env node
import fs from 'node:fs';
const html = fs.readFileSync('src/legacy/blog.cleaned.html', 'utf8');
const i = html.indexOf('elementor-element-9a2f334');
const j = html.indexOf('ecs-load-more-button', i);
const chunk = html.slice(i, j);
console.log('ecs-post-loop', (chunk.match(/ecs-post-loop/g) || []).length);
console.log('article tags', (chunk.match(/<article/g) || []).length);
console.log('posts', fs.readdirSync('src/content/blog').filter((f) => f.endsWith('.json')).length);

// honeypot in post cleaned
const posts = fs.readdirSync('src/legacy').filter((f) => f.includes('abu-dhabi'));
console.log('post files', posts);
const postHtml = fs.readFileSync('src/legacy/abu-dhabi-toll-system.cleaned.html', 'utf8');
const m = postHtml.match(/name="alt_s"[\s\S]{0,200}/);
console.log('alt_s sample', m?.[0]?.slice(0, 200));
const wraps = [...postHtml.matchAll(/wpcf7-form-control-wrap[^"]*"[^>]*>/g)].slice(0, 15).map((x) => x[0]);
console.log(wraps);
