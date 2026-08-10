import fs from 'node:fs';
import { load } from 'cheerio';

const local = load(fs.readFileSync(process.env.TEMP + '/cf-loc-ins.html', 'utf8'));
const live = load(fs.readFileSync(process.env.TEMP + '/cf-live-ins.html', 'utf8'));

const srcs = [];
local('.ecs-posts article img').each((_, el) => {
  srcs.push((local(el).attr('src') || local(el).attr('data-lazy-src') || '').split('?')[0]);
});
console.log('LOCAL img count', srcs.length);
for (const s of srcs.slice(0, 9)) console.log(s);

// Header chrome compare
function headerBits($) {
  return {
    logo: $('.elementor-widget-image img').first().attr('src') || '',
    navCount: $('.elementor-nav-menu a').length,
    callBtn: $('.elementor-button-text').filter((_, el) => /call us/i.test($(el).text())).first().text().trim(),
    stickyHeader: $('[data-settings*="sticky"]').length,
  };
}
console.log('\nLIVE header', headerBits(live));
console.log('LOCAL header', headerBits(local));

// Check injected local-only CSS content length / conflict markers
const polish = fs.existsSync('public/css/cf-site-polish.css')
  ? fs.readFileSync('public/css/cf-site-polish.css', 'utf8')
  : '';
const insights = fs.existsSync('public/css/cf-insights-layout.css')
  ? fs.readFileSync('public/css/cf-insights-layout.css', 'utf8')
  : '';
console.log('\npolish rules with !important', (polish.match(/!important/g) || []).length);
console.log('insights rules with !important', (insights.match(/!important/g) || []).length);

// Diff key post-493 snippets that affect layout around posts
const p493 = fs.readFileSync('public/wp-content/uploads/elementor/css/post-493.css', 'utf8');
const keys = [
  'elementor-element-0215441',
  'elementor-element-d61568f',
  'elementor-element-06e62c7',
  'elementor-element-2f66f91',
  'elementor-element-34dd4ed',
  'elementor-element-af1ad56',
];
for (const k of keys) {
  const re = new RegExp(`\\.elementor-493[^}]*${k}[^}]*\\{[^}]+\\}`, 'g');
  const m = p493.match(new RegExp(`.{0,30}${k}.{0,250}`, 'g'));
  console.log('\n---', k, '---');
  console.log((m || []).slice(0, 2).join('\n'));
}
