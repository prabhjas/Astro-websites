/**
 * /blog/ mirror ships an Advanced Post Block loading skeleton that needs
 * React + admin-ajax. Local (and often production) mirrors lack react.min.js,
 * so the grid never hydrates. Inject real cards server-side instead.
 */
import { renderApbCardsHtml } from "./apb-card-html";
import { getPosts } from "./content";

function replaceElementByOpenIndex(html: string, openIdx: number, replacement: string): string | null {
  if (openIdx < 0) return null;
  let i = openIdx;
  let depth = 0;
  while (i < html.length) {
    if (html.startsWith("</div>", i)) {
      depth -= 1;
      i += 6;
      if (depth === 0) {
        return html.slice(0, openIdx) + replacement + html.slice(i);
      }
      continue;
    }
    if (html.startsWith("<div", i)) {
      const gt = html.indexOf(">", i);
      if (gt < 0) break;
      const tag = html.slice(i, gt + 1);
      if (!/\/>\s*$/.test(tag)) depth += 1;
      i = gt + 1;
      continue;
    }
    i += 1;
  }
  return null;
}

function stripBrokenApbClientScripts(html: string): string {
  return html
    .replace(
      /<script[^>]+src=["'][^"']*\/wp-includes\/js\/dist\/vendor\/react(?:-dom)?\.min\.js[^"']*["'][^>]*>\s*<\/script>\s*/gi,
      "",
    )
    .replace(
      /<script[^>]+src=["'][^"']*\/advanced-post-block\/build\/view\.js[^"']*["'][^>]*>\s*<\/script>\s*/gi,
      "",
    );
}

/** Replace APB loading skeleton(s) with SSR post cards. */
export function injectBlogApbPosts(html: string): string {
  const posts = [...getPosts()].sort(
    (a, b) => (Date.parse(b.date || "") || 0) - (Date.parse(a.date || "") || 0),
  );
  const cards = renderApbCardsHtml(posts);
  const grid = `<div class="apbGridPosts columns-3 columns-tablet-2 columns-mobile-1" data-sp-blog-apb="1">
${cards}
</div>`;

  let out = html;
  let guard = 0;
  while (guard < 5) {
    guard += 1;
    const marker = out.indexOf('class="apbLoadingPlaceholder"');
    if (marker < 0) break;
    const open = out.lastIndexOf("<div", marker);
    const next = replaceElementByOpenIndex(out, open, grid);
    if (!next) break;
    out = next;
  }

  // If no placeholder matched, still try to fill empty APB root.
  if (out === html && out.includes("apbAdvancedPosts-1")) {
    const idMark = out.includes("id='apbAdvancedPosts-1'")
      ? "id='apbAdvancedPosts-1'"
      : 'id="apbAdvancedPosts-1"';
    const idAt = out.indexOf(idMark);
    if (idAt >= 0) {
      const open = out.lastIndexOf("<div", idAt);
      const gt = out.indexOf(">", idAt);
      if (open >= 0 && gt > open) {
        const openTag = out.slice(open, gt + 1);
        const replaced = replaceElementByOpenIndex(out, open, `${openTag}\n${grid}\n`);
        if (replaced) out = replaced;
      }
    }
  }

  return stripBrokenApbClientScripts(out);
}
