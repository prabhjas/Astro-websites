#!/usr/bin/env node
/**
 * Generate comprehensive blog + author migration report.
 * Usage: node scripts/blog-migration-report.mjs
 */
import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseAllSitemaps, ORIGIN, BLOG_DIR } from './migrate-blog-post.mjs';

const ROOT = join(import.meta.dirname, '..');
const AUTHORS_DIR = join(ROOT, 'src/content/authors');
const DOCS_DIR = join(ROOT, 'docs');
const APPROVED_TEST = [
  'hr-audit-uae-checklist',
  'peo-vs-eor-what-is-the-difference',
  'what-is-an-employer-of-record-eor',
];

function loadPosts() {
  if (!existsSync(BLOG_DIR)) return [];
  return readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(BLOG_DIR, f), 'utf8')));
}

function loadAuthors() {
  if (!existsSync(AUTHORS_DIR)) return [];
  return readdirSync(AUTHORS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(AUTHORS_DIR, f), 'utf8')));
}

async function main() {
  const sitemapUrls = await parseAllSitemaps();
  const sitemapSlugs = sitemapUrls.map((u) => new URL(u).pathname.replace(/^\/|\/$/g, ''));
  const posts = loadPosts();
  const postSlugs = new Set(posts.map((p) => p.slug));
  const authors = loadAuthors();

  const missingFromMigration = sitemapSlugs.filter((s) => !postSlugs.has(s));
  const extraNotInSitemap = [...postSlugs].filter((s) => !sitemapSlugs.includes(s));
  const duplicateSlugs = posts.map((p) => p.slug).filter((s, i, arr) => arr.indexOf(s) !== i);

  const failedMigration = missingFromMigration;
  const incompleteContent = posts.filter((p) => !p.contentHtml || p.contentHtml.length < 100);
  const missingImages = [];
  const wpHostedImages = [];
  const missingSeo = posts.filter((p) => !p.description || !p.title);
  const brokenInternal = [];
  const postsNeedingReview = [];

  for (const post of posts) {
    if (post.linkAudit?.unresolved?.length) {
      for (const link of post.linkAudit.unresolved) {
        brokenInternal.push({ slug: post.slug, href: link.href, text: link.text });
      }
    }
    if (post.linkAudit?.brokenInternal?.length) {
      for (const link of post.linkAudit.brokenInternal) {
        brokenInternal.push({ slug: post.slug, href: link.href, text: link.text });
      }
    }
    for (const img of post.images || []) {
      if (!img.src) missingImages.push({ slug: post.slug, alt: img.alt });
      else if (img.src.startsWith('http')) wpHostedImages.push({ slug: post.slug, src: img.src });
    }
    if (!post.author?.slug) postsNeedingReview.push({ slug: post.slug, issue: 'missing author slug' });
    if (post.imageMigration?.failed?.length) {
      for (const f of post.imageMigration.failed) {
        postsNeedingReview.push({ slug: post.slug, issue: `image: ${f.remote}` });
      }
    }
  }

  const authorSlugCounts = new Map();
  for (const post of posts) {
    const slug = post.author?.slug || (post.author?.url || '').match(/\/author\/([^/]+)/)?.[1];
    if (slug) authorSlugCounts.set(slug, (authorSlugCounts.get(slug) || 0) + 1);
  }

  const authorReport = [...authorSlugCounts.entries()].map(([slug, count]) => {
    const meta = authors.find((a) => a.slug === slug);
    return {
      name: meta?.name || slug,
      slug,
      originalUrl: `${ORIGIN}/author/${slug}/`,
      astroUrl: `/author/${slug}/`,
      postCount: count,
      missingAvatar: !meta?.avatar?.src,
      missingBio: !meta?.bio,
      missingSeo: !meta?.description,
      needsReview: meta?.notes?.length ? meta.notes : undefined,
    };
  });

  const authorSlugsFromPosts = new Set(authorSlugCounts.keys());
  const authorSlugsMigrated = new Set(authors.map((a) => a.slug));
  const missingAuthorPages = [...authorSlugsFromPosts].filter((s) => !authorSlugsMigrated.has(s));

  const newlyMigrated = posts.filter((p) => !APPROVED_TEST.includes(p.slug)).length;

  const report = `# Blog Migration Report

Generated: ${new Date().toISOString()}

## Blog Posts

| Metric | Count |
|--------|-------|
| Total posts in sitemap | ${sitemapSlugs.length} |
| Previously migrated (approved test) | ${APPROVED_TEST.length} |
| Newly migrated posts | ${newlyMigrated} |
| Total successfully migrated | ${posts.length} |
| Failed / not migrated | ${failedMigration.length} |
| Posts with incomplete content | ${incompleteContent.length} |
| Missing SEO metadata | ${missingSeo.length} |
| Duplicate slugs | ${duplicateSlugs.length} |
| Extra posts not in sitemap | ${extraNotInSitemap.length} |

### Approved test posts (not re-migrated)
${APPROVED_TEST.map((s) => `- ${s}`).join('\n')}

### Failed / missing migrations
${failedMigration.length ? failedMigration.map((s) => `- ${s}`).join('\n') : '_None_'}

### Posts with incomplete content
${incompleteContent.length ? incompleteContent.map((p) => `- ${p.slug}`).join('\n') : '_None_'}

### Missing images
${missingImages.length ? missingImages.slice(0, 50).map((i) => `- ${i.slug}: ${i.alt || '(no alt)'}`).join('\n') : '_None_'}
${missingImages.length > 50 ? `\n_...and ${missingImages.length - 50} more_` : ''}

### Posts still using WordPress-hosted images
${wpHostedImages.length ? wpHostedImages.slice(0, 50).map((i) => `- ${i.slug}: ${i.src}`).join('\n') : '_None_'}
${wpHostedImages.length > 50 ? `\n_...and ${wpHostedImages.length - 50} more_` : ''}

### Broken / unresolved internal links
${brokenInternal.length ? brokenInternal.slice(0, 100).map((l) => `- [${l.slug}] ${l.href} (${l.text})`).join('\n') : '_None_'}
${brokenInternal.length > 100 ? `\n_...and ${brokenInternal.length - 100} more_` : ''}

### Posts requiring manual review
${postsNeedingReview.length ? postsNeedingReview.slice(0, 100).map((p) => `- ${p.slug}: ${p.issue}`).join('\n') : '_None_'}

## Authors

| Metric | Count |
|--------|-------|
| Unique authors from posts | ${authorSlugsFromPosts.size} |
| Author archive pages created | ${authors.length} |
| Authors missing archive JSON | ${missingAuthorPages.length} |

### Author details

| Name | Slug | Posts | Avatar | Bio | SEO |
|------|------|-------|--------|-----|-----|
${authorReport.map((a) => `| ${a.name} | ${a.slug} | ${a.postCount} | ${a.missingAvatar ? 'missing' : 'ok'} | ${a.missingBio ? 'missing' : 'ok'} | ${a.missingSeo ? 'missing' : 'ok'} |`).join('\n')}

### Authors requiring manual review
${authorReport.filter((a) => a.needsReview).map((a) => `- **${a.slug}**: ${a.needsReview.join('; ')}`).join('\n') || '_None_'}

## Components

### Reused
- BlogPostLayout (shell assembly via \`src/lib/blog.ts\`)
- Header / Footer (from legacy shell templates)
- Table of Contents, CTA, Author, Related Posts, Share (shell + mirror-fixes.js)
- Post cards (Elementor 24831 via \`buildPostCardHtml\`)

### New
- \`src/lib/authors.ts\` — author archive assembly
- \`src/pages/author/[slug].astro\` — author archive page 1
- \`src/pages/author/[slug]/page/[page].astro\` — author pagination
- \`src/legacy/author-shell/template.html\` — author archive shell
- \`scripts/migrate-blog-all.mjs\`, \`scripts/migrate-authors.mjs\`, \`scripts/blog-migration-report.mjs\`

### BlogPostLayout changes
- Minimal: \`author.slug\` support for correct \`/author/{slug}/\` links in fallback author HTML

## Recommended manual checks before production

1. Spot-check 10–20 random migrated posts against live WordPress
2. Verify author archive pages for top authors (pagination, post counts)
3. Run \`npm run build\` and fix any route conflicts
4. Review broken internal links list — many may resolve once all posts are migrated
5. Confirm canonical URLs on posts with known WP canonical mismatches
6. Test social share buttons and FAQ accordions on sample posts
`;

  mkdirSync(DOCS_DIR, { recursive: true });
  const outPath = join(DOCS_DIR, 'blog-migration-report.md');
  writeFileSync(outPath, report, 'utf8');
  console.log(`Wrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
