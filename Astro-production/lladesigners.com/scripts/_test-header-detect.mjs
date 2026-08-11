import { readFileSync } from 'fs';
import { applySharedChrome, clearSharedChromeCache } from '../src/lib/shared-chrome.js';

clearSharedChromeCache();
for (const slug of [
  'services',
  'about-us',
  'portfolio',
  'our-blogs',
  'contact-us',
  'interior-design',
  'importance-of-lighting-in-interior-design',
  'homepage',
]) {
  const raw = readFileSync(new URL(`../src/legacy/${slug}.cleaned.html`, import.meta.url), 'utf8');
  const body = (raw.match(/<body\b[^>]*\bclass=["']([^"']*)["']/i) || [])[1] || '';
  const exportHeader = (raw.match(/<header\b[^>]*\bdata-elementor-id=["'](\d+)["']/i) || [])[1] || '?';
  const out = applySharedChrome(raw, slug);
  const applied = (out.match(/<header\b[^>]*\bdata-elementor-id=["'](\d+)["']/i) || [])[1] || '?';
  console.log(
    JSON.stringify({
      slug,
      exportHeader,
      applied,
      bodyHasSinglePost: /\bsingle-post\b/.test(body),
      bodyHasPageId: /\bpage-id-\d+/.test(body),
      bodySnippet: body.slice(0, 90),
    }),
  );
}
