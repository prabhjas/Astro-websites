/**
 * Move bottom CTA image above "Installation Procedure..." heading.
 * Usage: node scripts/move-smart-home-cta-image.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const POSTS_PATH = path.join(ROOT, 'src/data/posts.json');
const SLUG = 'smart-home-automation-in-dubai-guide';
const HEADING = 'Installation Procedure for Dubai Smart Home Automation System';
const CTA_RE =
  /<p style="text-align:center;"><a href="\/contact\/"><img[\s\S]*?<\/a><\/p>\s*/;

function moveCta(content) {
  const match = content.match(CTA_RE);
  if (!match) throw new Error('CTA image block not found');
  const cta = match[0];
  let next = content.replace(CTA_RE, '');
  const marker = `<h2>${HEADING}</h2>`;
  const idx = next.indexOf(marker);
  if (idx < 0) throw new Error('Installation heading not found');
  next = next.slice(0, idx) + cta + next.slice(idx);
  if ((next.match(CTA_RE) || []).length !== 1) {
    throw new Error('Expected exactly one CTA block after move');
  }
  return next;
}

function replaceWidgetContent(html, widgetType, newInner) {
  const marker = `data-widget_type="${widgetType}">`;
  const markerIdx = html.indexOf(marker);
  if (markerIdx < 0) throw new Error(`widget not found: ${widgetType}`);
  const openIdx = html.lastIndexOf('<div', markerIdx);
  let i = openIdx;
  let depth = 0;
  let contentStart = -1;
  let contentEnd = -1;
  while (i < html.length) {
    const nextOpen = html.indexOf('<div', i);
    const nextClose = html.indexOf('</div>', i);
    if (nextClose < 0) break;
    if (nextOpen >= 0 && nextOpen < nextClose) {
      if (depth === 0) contentStart = html.indexOf('>', nextOpen) + 1;
      depth++;
      i = nextOpen + 4;
    } else {
      depth--;
      if (depth === 0) {
        contentEnd = nextClose;
        break;
      }
      i = nextClose + 6;
    }
  }
  if (contentStart < 0 || contentEnd < 0) throw new Error(`bounds fail for ${widgetType}`);
  return html.slice(0, contentStart) + newInner + html.slice(contentEnd);
}

const posts = JSON.parse(fs.readFileSync(POSTS_PATH, 'utf8'));
const post = posts.find((p) => p.slug === SLUG);
if (!post) throw new Error(`Post not found: ${SLUG}`);

const updatedContent = moveCta(post.content);
post.content = updatedContent;
post.bodyHtml = replaceWidgetContent(
  post.bodyHtml,
  'theme-post-content.default',
  `\n\t\t\t\t\t${updatedContent}\n\t\t\t\t`,
);
post.modified = new Date().toISOString().slice(0, 19);

fs.writeFileSync(POSTS_PATH, `${JSON.stringify(posts, null, 2)}\n`);
console.log('Moved CTA image above Installation Procedure heading for', SLUG);
