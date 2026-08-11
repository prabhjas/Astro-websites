import { readFileSync, writeFileSync } from 'fs';

const html = readFileSync(
  'src/legacy/importance-of-lighting-in-interior-design.cleaned.html',
  'utf8',
);
const idx = html.indexOf('data-elementor-id="2849"');
if (idx < 0) throw new Error('header 2849 not found');
const hStart = html.lastIndexOf('<header', idx);
const from = html.slice(hStart);
const re = /<\/?header\b[^>]*>/gi;
let depth = 0;
let end = -1;
let m;
while ((m = re.exec(from))) {
  if (m[0].startsWith('</')) {
    depth -= 1;
    if (depth === 0) {
      end = m.index + m[0].length;
      break;
    }
  } else if (!/\/>\s*$/.test(m[0])) {
    depth += 1;
  }
}
if (end < 0) throw new Error('header end not found');

let header = from.slice(0, end);
header = header.replace(/\sdata-rocket-location-hash="[^"]*"/g, '');

// Live post header uses SVG social icons (fb/ig/mail). Export mangled
// `elementor-social-icon-` class names and href="#". Restore working links
// from the page header while keeping the SVG icons.
header = header.replace(
  /(<a class="elementor-icon elementor-social-icon elementor-social-icon-)\s+(elementor-repeater-item-73a9d82)" href="#"/,
  '$1facebook $2" href="https://www.facebook.com/LLADesigner"',
);
header = header.replace(
  /(<a class="elementor-icon elementor-social-icon elementor-social-icon-)\s+(elementor-repeater-item-05008f6)" href="#"/,
  '$1instagram $2" href="https://www.instagram.com/lla_designers"',
);
header = header.replace(
  /(<a class="elementor-icon elementor-social-icon elementor-social-icon-)\s+(elementor-repeater-item-e5cbb12)" href="#"/,
  '$1email $2" href="/contact-us/"',
);
// Screen-reader labels
header = header.replace(
  /(<a class="elementor-icon elementor-social-icon elementor-social-icon-facebook[\s\S]*?<span class="elementor-screen-only">)\s*(<\/span>)/,
  '$1Facebook$2',
);
header = header.replace(
  /(<a class="elementor-icon elementor-social-icon elementor-social-icon-instagram[\s\S]*?<span class="elementor-screen-only">)\s*(<\/span>)/,
  '$1Instagram$2',
);
header = header.replace(
  /(<a class="elementor-icon elementor-social-icon elementor-social-icon-email[\s\S]*?<span class="elementor-screen-only">)\s*(<\/span>)/,
  '$1Email$2',
);

writeFileSync('src/legacy/chrome/header-post.html', header + '\n');
console.log('wrote header-post.html bytes=', header.length);
