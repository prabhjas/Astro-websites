/**
 * Rebuild landscaping Elementor CSS from carpentry, then clone missing widget rules
 * from same-widget donors (never clone hero container onto nested containers).
 */
import fs from 'node:fs';
import * as cheerio from 'cheerio';

const pages = JSON.parse(fs.readFileSync('src/data/pages.json', 'utf8'));
const carp = pages.find((p) => p.path === '/property-maintenance/carpentry-services/');
const land = pages.find((p) => p.path === '/property-maintenance/landscaping-services/');
const cHtml = carp.bodyHtml || carp.content || '';
const lHtml = land.bodyHtml || land.content || '';

function widgetKey(el) {
  const cls = el.attribs?.class || '';
  return (
    (el.attribs?.['data-element_type'] || '') +
    ':' +
    (cls.match(/elementor-widget-([a-z0-9_-]+)/)?.[1] ||
      cls.match(/\b(e-con|e-con-full|e-con-boxed|hero_sec)\b/)?.[1] ||
      '')
  );
}

function buildIndex(html) {
  const $ = cheerio.load(html);
  const items = [];
  $('[class*="elementor-element-"]').each((_, el) => {
    const cls = el.attribs?.class || '';
    const m = cls.match(/elementor-element-([a-f0-9]{6,7})\b/);
    if (!m) return;
    const id = m[1];
    const hard = [];
    const soft = [];
    let cur = el;
    while (cur && cur.type === 'tag') {
      const parent = cur.parent;
      if (!parent || parent.type !== 'tag') break;
      const siblings = parent.children.filter((c) => c.type === 'tag');
      const sameRole = siblings.filter((c) => widgetKey(c) === widgetKey(cur));
      hard.push(`${cur.name}[${siblings.indexOf(cur)}](${widgetKey(cur)})`);
      soft.push(`${widgetKey(cur)}#${sameRole.indexOf(cur)}`);
      cur = parent;
      if ((cur.attribs?.['data-elementor-type'] || '') === 'wp-page') break;
    }
    items.push({
      id,
      path: hard.reverse().join('/'),
      softPath: soft.reverse().join('/'),
      widget: widgetKey(el),
      isHero: (el.attribs?.class || '').includes('hero_sec') || id === '7fd1049',
    });
  });
  return items;
}

const carpItems = buildIndex(cHtml);
const landItems = buildIndex(lHtml);
const idMap = new Map();
const claimedLand = new Set();
function claim(carpId, landId) {
  if (!carpId || !landId) return false;
  if (claimedLand.has(landId) && idMap.get(carpId) !== landId) return false;
  idMap.set(carpId, landId);
  claimedLand.add(landId);
  return true;
}

for (const c of carpItems) {
  if (landItems.some((l) => l.id === c.id)) claim(c.id, c.id);
}
const landByPath = new Map(landItems.map((i) => [i.path, i.id]));
for (const c of carpItems) {
  if (!idMap.has(c.id)) {
    const hit = landByPath.get(c.path);
    if (hit) claim(c.id, hit);
  }
}
const landBySoft = new Map();
for (const i of landItems) if (!landBySoft.has(i.softPath)) landBySoft.set(i.softPath, i.id);
for (const c of carpItems) {
  if (!idMap.has(c.id)) {
    const hit = landBySoft.get(c.softPath);
    if (hit) claim(c.id, hit);
  }
}
const carpByWidget = new Map();
const landByWidget = new Map();
for (const c of carpItems) {
  if (!carpByWidget.has(c.widget)) carpByWidget.set(c.widget, []);
  carpByWidget.get(c.widget).push(c.id);
}
for (const l of landItems) {
  if (!landByWidget.has(l.widget)) landByWidget.set(l.widget, []);
  landByWidget.get(l.widget).push(l.id);
}
for (const [widget, carpIds] of carpByWidget) {
  const landIds = landByWidget.get(widget) || [];
  let li = 0;
  for (const cid of carpIds) {
    if (idMap.has(cid)) continue;
    while (li < landIds.length && claimedLand.has(landIds[li])) li += 1;
    if (li >= landIds.length) break;
    claim(cid, landIds[li]);
    li += 1;
  }
}

let css = fs.readFileSync('public/wp-content/uploads/elementor/css/post-2466.css', 'utf8');
css = css.replaceAll('.elementor-2466', '.elementor-898');
css = css.replaceAll('elementor-page-2466', 'elementor-page-898');
for (const [from, to] of [...idMap.entries()].sort((a, b) => b[0].length - a[0].length)) {
  if (from === to) continue;
  const re = new RegExp(`elementor-element-${from}\\b`, 'g');
  css = css.replace(re, `elementor-element-${to}`);
}

const $ = cheerio.load(lHtml);
function widgetOf(id) {
  const el = $(`.elementor-element-${id}`).get(0);
  if (!el) return '';
  const cls = el.attribs?.class || '';
  return cls.match(/elementor-widget-([a-z0-9_-]+)/)?.[1] || el.attribs?.['data-element_type'] || '';
}
function isHeroId(id) {
  const el = $(`.elementor-element-${id}`).get(0);
  return !!el && ((el.attribs?.class || '').includes('hero_sec') || id === '7fd1049');
}

const allIds = landItems.map((i) => i.id);
const missing = allIds.filter((id) => !css.includes(`elementor-element-${id}`));
const donorsByWidget = new Map();
for (const id of allIds) {
  if (!css.includes(`elementor-element-${id}`)) continue;
  if (isHeroId(id)) continue; // never use hero as donor for nested widgets
  const w = widgetOf(id);
  if (!w) continue;
  const count = (css.match(new RegExp(`elementor-element-${id}\\b`, 'g')) || []).length;
  const prev = donorsByWidget.get(w);
  if (!prev || count > prev.count) donorsByWidget.set(w, { id, count });
}

const extras = [];
for (const id of missing) {
  const w = widgetOf(id);
  const donor = donorsByWidget.get(w);
  if (!donor) {
    console.log('no donor', id, w);
    continue;
  }
  const donorRe = new RegExp(`[^}]*elementor-element-${donor.id}\\b[^{]*\\{[^}]*\\}`, 'g');
  const blocks = css.match(donorRe) || [];
  for (const block of blocks) {
    extras.push(block.replaceAll(`elementor-element-${donor.id}`, `elementor-element-${id}`));
  }
  console.log('clone', blocks.length, donor.id, '->', id, w);
}
if (extras.length) {
  css += '\n/* landscaping fallback clones for unmapped widget ids */\n' + extras.join('');
}

const publicOut = 'public/wp-content/uploads/elementor/css/post-898.css';
const distOut = 'dist/client/wp-content/uploads/elementor/css/post-898.css';
fs.writeFileSync(publicOut, css);
fs.writeFileSync(distOut, css);
const still = allIds.filter((id) => !css.includes(`elementor-element-${id}`));
console.log({
  mapped: idMap.size,
  bytes: Buffer.byteLength(css),
  covered: `${allIds.length - still.length}/${allIds.length}`,
  stillMissing: still.join(','),
});
