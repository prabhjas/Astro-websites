import fs from 'node:fs';
import * as cheerio from 'cheerio';

const pagePath = '/property-maintenance/landscaping-services/';
const pages = JSON.parse(fs.readFileSync('src/data/pages.json', 'utf8'));
const bodies = JSON.parse(fs.readFileSync('src/data/bodies.json', 'utf8'));
const page = pages.find((p) => p.path === pagePath);

function fix(html) {
  const $ = cheerio.load(html, { decodeEntities: false }, false);
  const el = $('.elementor-element-4c13f5f');
  el.find('p').each((_, node) => {
    let t = $(node).html() || '';
    t = t
      .replace(/team\s*transforms/gi, 'team transforms')
      .replace(/design,\s*garden/gi, 'design, garden')
      .replace(/\s+/g, ' ')
      .trim();
    $(node).html(t);
  });
  console.log(el.text().replace(/\s+/g, ' ').trim());
  return $.root().html() || html;
}

page.bodyHtml = fix(page.bodyHtml);
if (page.content) page.content = fix(page.content);
bodies[pagePath] = page.bodyHtml;
fs.writeFileSync('src/data/pages.json', JSON.stringify(pages, null, 2) + '\n');
fs.writeFileSync('src/data/bodies.json', JSON.stringify(bodies, null, 2) + '\n');
console.log('fixed spaces');
