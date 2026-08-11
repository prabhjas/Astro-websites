/**
 * Extract Snapsale Elementor header/footer chrome from homepage cleaned HTML.
 * Snapsale uses <header>/<footer> tags (not div wrappers).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HOME = join(ROOT, 'src/legacy/homepage.cleaned.html');
const OUT = join(ROOT, 'src/legacy/chrome');
const PUBLIC_CHROME = join(ROOT, 'public/chrome');

function extractBalancedTag(html, tagName, attrSnippet) {
  const idx = html.indexOf(attrSnippet);
  if (idx < 0) return null;
  const openToken = `<${tagName}`;
  const start = html.lastIndexOf(openToken, idx);
  if (start < 0) return null;
  const openRe = new RegExp(`<${tagName}\\b`, 'i');
  const closeRe = new RegExp(`</${tagName}\\s*>`, 'i');
  const fromOpen = html.slice(start);
  const firstTagEnd = fromOpen.indexOf('>');
  if (firstTagEnd < 0) return null;
  let depth = 1;
  let i = firstTagEnd + 1;
  while (i < fromOpen.length && depth > 0) {
    const nextOpen = fromOpen.slice(i).search(openRe);
    const nextClose = fromOpen.slice(i).search(closeRe);
    if (nextClose < 0) return null;
    const openAt = nextOpen < 0 ? Infinity : i + nextOpen;
    const closeAt = i + nextClose;
    if (openAt < closeAt) {
      depth += 1;
      const gt = fromOpen.indexOf('>', openAt);
      i = gt < 0 ? fromOpen.length : gt + 1;
    } else {
      depth -= 1;
      const closeMatch = fromOpen.slice(closeAt).match(closeRe);
      const closeLen = closeMatch ? closeMatch[0].length : `</${tagName}>`.length;
      i = closeAt + closeLen;
      if (depth === 0) return fromOpen.slice(0, i);
    }
  }
  return null;
}

if (!existsSync(HOME)) throw new Error(`Missing ${HOME}`);
const html = readFileSync(HOME, 'utf8');

let header =
  extractBalancedTag(html, 'header', 'data-elementor-type="header"') ||
  extractBalancedTag(html, 'div', 'data-elementor-type="header"') ||
  extractBalancedTag(html, 'header', 'id="masthead"') ||
  extractBalancedTag(html, 'header', 'class="site-header');
let footer =
  extractBalancedTag(html, 'footer', 'data-elementor-type="footer"') ||
  extractBalancedTag(html, 'div', 'data-elementor-type="footer"') ||
  extractBalancedTag(html, 'footer', 'id="colophon"') ||
  extractBalancedTag(html, 'footer', 'class="site-footer');

if (!header) throw new Error('header not found in homepage');
if (!footer) throw new Error('footer not found in homepage');

mkdirSync(OUT, { recursive: true });
mkdirSync(PUBLIC_CHROME, { recursive: true });
writeFileSync(join(OUT, 'header.html'), `${header}\n`, 'utf8');
writeFileSync(join(OUT, 'footer.html'), `${footer}\n`, 'utf8');

const cssPath = join(OUT, 'header.css');
if (!existsSync(cssPath) || readFileSync(cssPath, 'utf8').includes('Evolution')) {
  writeFileSync(
    cssPath,
    `/* Snapsale shared header — primary look comes from Astra/Elementor CSS */\n`,
    'utf8',
  );
}
copyFileSync(cssPath, join(PUBLIC_CHROME, 'header.css'));

console.log('Wrote chrome header', header.length, 'footer', footer.length);
console.log('header tag', header.slice(0, 80));
console.log('Has logo img', /<img[^>]+site-logo|custom-logo/i.test(header));
console.log('Header id', /data-elementor-id="(\d+)"/.exec(header)?.[1] || 'astra-masthead');
