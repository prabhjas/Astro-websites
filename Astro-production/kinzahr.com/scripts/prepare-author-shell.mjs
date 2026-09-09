#!/usr/bin/env node
/**
 * Build author archive shell from Kinza homepage chrome (header/footer untouched).
 * Usage: node scripts/prepare-author-shell.mjs
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SOURCE = join(ROOT, 'src/legacy/homepage.cleaned.html');
const OUT_DIR = join(ROOT, 'src/legacy/author-shell');
const OUT = join(OUT_DIR, 'template.html');

const BODY = `
<div class="kinza-author-page" data-astro-author-page>
  <!--ASTRO_AUTHOR:PROFILE-->
  <section class="kinza-author-articles">
    <div class="kinza-author-articles__inner">
      <!--ASTRO_AUTHOR:POSTS_HEADING-->
      <div class="kinza-author-posts ecs-posts elementor-posts-container" data-kinza-author-posts>
        <!--ASTRO_AUTHOR:POSTS-->
      </div>
      <div class="kinza-author-loadmore-wrap" data-kinza-author-loadmore-wrap>
        <!--ASTRO_AUTHOR:PAGINATION-->
      </div>
    </div>
  </section>
</div>
`.trim();

async function main() {
  const raw = await readFile(SOURCE, 'utf8');
  const $ = cheerio.load(raw, { decodeEntities: false });

  const header = $('[data-elementor-type="header"]').first();
  const footer = $('[data-elementor-type="footer"]').first();
  if (!header.length || !footer.length) {
    throw new Error('Homepage chrome (header/footer) not found');
  }

  // Remove all siblings between header and footer (page body only).
  let node = header[0].nextSibling;
  while (node && node !== footer[0]) {
    const next = node.nextSibling;
    $(node).remove();
    node = next;
  }
  header.after(`\n${BODY}\n`);

  $('title').text('Authors - KinzaHR');
  $('body').attr('class', 'author archive kinza-author-archive');

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT, $.html(), 'utf8');
  console.log('Wrote', OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
