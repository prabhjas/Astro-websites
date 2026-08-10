#!/usr/bin/env node
/**
 * Create author-shell/template.html for emiratisationgateway.com.
 * Downloads a live author page and converts it into a reusable shell.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SHELL_DIR = join(ROOT, 'src/legacy/author-shell');
const ORIGIN = 'https://emiratisationgateway.com';

const MARKERS = {
  profile: '<!--ASTRO_AUTHOR:PROFILE-->',
  postsHeading: '<!--ASTRO_AUTHOR:POSTS_HEADING-->',
  posts: '<!--ASTRO_AUTHOR:POSTS-->',
  pagination: '<!--ASTRO_AUTHOR:PAGINATION-->',
};

const AUTHORS = ['binju-t-r', 'kate', 'liam-doherty', 'nakul', 'prabhjas', 'siva-rama-krishna', 'dylan-wesley-wright'];

async function main() {
  let html = '';
  for (const slug of AUTHORS) {
    const url = `${ORIGIN}/author/${slug}/`;
    console.log('Trying', url);
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AstroMigrate/1.0)' } });
      if (res.ok) {
        html = await res.text();
        console.log(`Got ${res.status} from ${url} — ${html.length} bytes`);
        break;
      }
      console.log(`Got ${res.status} from ${url}`);
    } catch (e) {
      console.log(`Error: ${e.message}`);
    }
  }

  if (!html) {
    console.error('Could not fetch any author page');
    process.exit(1);
  }

  // Localize absolute URLs
  html = html.replaceAll(`${ORIGIN}/`, '/');
  html = html.replaceAll(ORIGIN, '');

  const $ = cheerio.load(html, { decodeEntities: false });

  // Remove WP-specific scripts
  $('script[src*="wp-includes"]').remove();
  $('script[src*="wp-content"]').remove();
  $('script[src*="admin-ajax"]').remove();

  // Replace ECS posts container with marker
  const ecsPosts = $('.ecs-posts.elementor-posts-container');
  if (ecsPosts.length) {
    ecsPosts.each((_, el) => {
      $(el).empty().html(MARKERS.posts);
    });
    console.log('Replaced', ecsPosts.length, 'ECS post containers');
  }

  // Replace heading "Latest Articles by ..."
  $('h2.elementor-heading-title').each((_, el) => {
    const text = $(el).text();
    if (/latest|articles|posts/i.test(text)) {
      $(el).replaceWith(MARKERS.postsHeading);
    }
  });

  // Replace author profile section (main-auth class or first major section)
  const mainAuth = $('.main-auth');
  if (mainAuth.length) {
    const section = mainAuth.closest('section.elementor-section');
    if (section.length) {
      section.replaceWith(`<section class="elementor-section elementor-top-section astro-author-profile-section">${MARKERS.profile}</section>`);
    } else {
      mainAuth.replaceWith(MARKERS.profile);
    }
    console.log('Replaced main-auth profile section');
  } else {
    // Try archive wrapper's first section
    const archive = $('[data-elementor-type="archive"]').first();
    if (archive.length) {
      const firstSection = archive.children('section').first();
      if (firstSection.length) {
        firstSection.replaceWith(`<section class="elementor-section elementor-top-section astro-author-profile-section">${MARKERS.profile}</section>`);
        console.log('Replaced first archive section as profile');
      }
    }
  }

  // Replace pagination
  const pag = $('.elementor-pagination, nav.pagination').first();
  if (pag.length) {
    pag.replaceWith(MARKERS.pagination);
    console.log('Replaced pagination');
  }

  // Remove load more buttons
  $('.ecs-load-more, .e-load-more').remove();
  $('[class*="load-more"]').each((_, el) => {
    if ($(el).hasClass('ecs-load-more-button') || $(el).text().includes('Load More')) {
      $(el).remove();
    }
  });

  await mkdir(SHELL_DIR, { recursive: true });
  const outPath = join(SHELL_DIR, 'template.html');
  await writeFile(outPath, $.html(), 'utf8');
  console.log('Wrote', outPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
