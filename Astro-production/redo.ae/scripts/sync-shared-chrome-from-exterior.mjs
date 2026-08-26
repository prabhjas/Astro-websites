/**
 * Sync shared Elementor chrome fragments from exterior-revamp (same footer as homepage).
 * Run: node scripts/sync-shared-chrome-from-exterior.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function extractBalancedElement(html, attrSnippet) {
  const idx = html.indexOf(attrSnippet);
  if (idx < 0) return null;
  const headerStart = html.lastIndexOf('<header', idx);
  const footerStart = html.lastIndexOf('<footer', idx);
  const divStart = html.lastIndexOf('<div', idx);
  const candidates = [];
  if (headerStart >= 0 && headerStart < idx) candidates.push({ start: headerStart, tag: 'header' });
  if (footerStart >= 0 && footerStart < idx) candidates.push({ start: footerStart, tag: 'footer' });
  if (divStart >= 0 && divStart < idx) candidates.push({ start: divStart, tag: 'div' });
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.start - a.start);
  const { start, tag } = candidates[0];
  const openRe = new RegExp(`<${tag}\\b`, 'i');
  const closeRe = new RegExp(`</${tag}\\s*>`, 'i');
  const fromOpen = html.slice(start);
  const firstTagEnd = fromOpen.indexOf('>');
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
      const closeLen = closeMatch ? closeMatch[0].length : `</${tag}>`.length;
      i = closeAt + closeLen;
    }
  }
  return fromOpen.slice(0, i).trim() + '\n';
}

const src = readFileSync(join(root, 'src/legacy/exterior-revamp.cleaned.html'), 'utf8');
const header = extractBalancedElement(src, 'data-elementor-type="header"');
const footer = extractBalancedElement(src, 'data-elementor-type="footer"');
if (!header || !footer) {
  console.error('Failed to extract chrome from exterior-revamp.cleaned.html');
  process.exit(1);
}
writeFileSync(join(root, 'src/legacy/chrome/header.html'), header);
writeFileSync(join(root, 'src/legacy/chrome/footer.html'), footer);
console.log('Synced header', header.length, 'footer', footer.length);
