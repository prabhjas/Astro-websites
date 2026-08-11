/**
 * Prepare LLA Designers author index mirror + single-author shell from live HTML.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function localize(html) {
  return html
    .replaceAll('https://www.lladesigners.com/', '/')
    .replaceAll('https://lladesigners.com/', '/')
    .replaceAll('http://www.lladesigners.com/', '/')
    .replaceAll('http://lladesigners.com/', '/');
}

function stripAnalytics(html) {
  return html
    .replace(/<!--\s*Google Tag Manager\s*\(noscript\)\s*-->[\s\S]*?<!--\s*End Google Tag Manager\s*\(noscript\)\s*-->/gi, '')
    .replace(/<!--\s*Google Tag Manager\s*-->[\s\S]*?<!--\s*End Google Tag Manager\s*-->/gi, '')
    .replace(/<noscript>\s*<iframe[^>]+googletagmanager\.com\/ns\.html[\s\S]*?<\/iframe>\s*<\/noscript>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?googletagmanager\.com\/gtm\.js[\s\S]*?<\/script>/gi, '')
    .replace(/<script[^>]+googletagmanager\.com\/gtm\.js[^>]*>\s*<\/script>/gi, '')
    .replace(/<!--\s*Google tag\s*\(gtag\.js\)\s*-->\s*/gi, '')
    .replace(/<script[^>]+googletagmanager\.com\/gtag\/js[^>]*>\s*<\/script>\s*/gi, '');
}

/** Promote WP Rocket lazy attrs so images render without waiting for rocket JS. */
function promoteLazyImages(html) {
  return html
    .replace(
      /<img\b([^>]*?)\bsrc="data:image\/[^"]*"([^>]*?)\bdata-lazy-src="([^"]+)"([^>]*)>/gi,
      '<img$1src="$3"$2$4>',
    )
    .replace(/\sdata-lazy-src="[^"]*"/gi, '')
    .replace(/\sdata-lazy-srcset="([^"]*)"/gi, ' srcset="$1"')
    .replace(/\sdata-lazy-sizes="([^"]*)"/gi, ' sizes="$1"');
}

/** Rocket async CSS never swaps to stylesheet without their JS — force real stylesheets. */
function promoteRocketStyles(html) {
  return html.replace(
    /<link\b([^>]*?)rel=['"]preload['"]([^>]*?)as=['"]style['"]([^>]*?)>/gi,
    (full, a, b, c) => {
      const attrs = `${a}${b}${c}`;
      const hrefMatch = attrs.match(/href=['"]([^'"]+)['"]/i);
      if (!hrefMatch) return full;
      const href = hrefMatch[1];
      const mediaMatch = attrs.match(/media=['"]([^'"]+)['"]/i);
      const media = mediaMatch ? mediaMatch[1] : 'all';
      return `<link rel="stylesheet" href="${href}" media="${media}" />`;
    },
  );
}

function injectMirror(html) {
  if (html.includes('astro-mirror-fixes.js')) return html;
  return html.replace(
    '</body>',
    '<script src="/js/astro-mirror-fixes.js?v=20260810-qa3" defer></script>\n</body>',
  );
}

async function fetchHtml(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LLAAstro/1.0)' } });
  if (!res.ok) throw new Error(`Failed ${url}: ${res.status}`);
  return await res.text();
}

async function downloadIfMissing(pathname) {
  const dest = join(ROOT, 'public', ...pathname.split('/').filter(Boolean));
  if (existsSync(dest)) return;
  mkdirSync(dirname(dest), { recursive: true });
  const url = `https://lladesigners.com${pathname}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn('skip asset', pathname, res.status);
    return;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(dest, buf);
  console.log('downloaded', pathname, buf.length);
}

async function main() {
  console.log('Fetching live author pages…');
  const indexHtml = await fetchHtml('https://lladesigners.com/author/');
  const singleHtml = await fetchHtml('https://lladesigners.com/author/lana-vasiljeva/');

  // --- Index page mirror ---
  let indexOut = injectMirror(promoteRocketStyles(promoteLazyImages(stripAnalytics(localize(indexHtml)))));
  writeFileSync(join(ROOT, 'src/legacy/author.cleaned.html'), indexOut);
  console.log('Wrote src/legacy/author.cleaned.html');

  // --- Single author shell ---
  const $ = cheerio.load(localize(singleHtml), { decodeEntities: false });
  const archive = $('[data-elementor-type="archive"]').first();
  if (!archive.length) throw new Error('archive not found');

  const sections = archive.children('section');
  sections.first().replaceWith(
    '<section class="elementor-section elementor-top-section astro-author-profile-section elementor-section-full_width"><!--ASTRO_AUTHOR:PROFILE--></section>',
  );

  const postsSection = sections.eq(1);
  const heading = postsSection.find('h2.elementor-heading-title').first();
  if (heading.length) heading.replaceWith('<!--ASTRO_AUTHOR:POSTS_HEADING-->');

  const shortcode = postsSection.find('[data-widget_type="shortcode.default"]').first();
  if (!shortcode.length) throw new Error('shortcode posts widget not found');
  const container = shortcode.find('.elementor-shortcode').first().length
    ? shortcode.find('.elementor-shortcode').first()
    : shortcode.find('.elementor-widget-container').first();
  container.empty().append('<!--ASTRO_AUTHOR:POSTS-->');
  // Live shortcode leaves a sibling Load More link — remove so we inject our own with posts.
  shortcode.find('#loadMore').remove();
  shortcode.parent().find('#loadMore').remove();
  postsSection.find('> #loadMore, a#loadMore').remove();

  postsSection.find('.elementor-pagination, .astro-author-pagination').remove();
  postsSection.append('<div class="astro-author-pagination"><!--ASTRO_AUTHOR:PAGINATION--></div>');

  mkdirSync(join(ROOT, 'src/legacy/author-shell'), { recursive: true });
  let shell = injectMirror(promoteRocketStyles(promoteLazyImages(stripAnalytics($.html()))));
  writeFileSync(join(ROOT, 'src/legacy/author-shell/template.html'), shell);
  console.log('Wrote src/legacy/author-shell/template.html');

  // Assets used on author pages
  const assets = [
    '/wp-content/uploads/2024/05/1-1.jpg',
    '/wp-content/uploads/2024/05/1.jpg',
    '/wp-content/uploads/2024/05/lana-lla.png',
    '/wp-content/uploads/2024/05/cropped-lana-lla-96x96.png',
    '/wp-content/uploads/2024/05/cropped-1-96x96.jpg',
  ];
  for (const a of assets) await downloadIfMissing(a);

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
