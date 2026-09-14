/**
 * Fix Elementor single-post author boxes to use the post's real author
 * and link name/avatar to `/author/{slug}/`.
 */

export type AuthorBoxInput = {
  name: string;
  path: string;
  avatar?: string;
  description?: string;
};

function escapeHtml(text: string): string {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(text: string): string {
  return escapeHtml(text);
}

const AUTHOR_BOX_RE = /<div\s+class="elementor-author-box">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi;

function rewriteOneBox(boxHtml: string, author: AuthorBoxInput): string {
  const name = escapeHtml(author.name.trim() || "Author");
  const path = author.path.endsWith("/") ? author.path : `${author.path}/`;
  const href = escapeAttr(path);
  const avatar = (author.avatar || "").trim();
  const bio = (author.description || "").trim();
  const hasBio = /elementor-author-box__bio/i.test(boxHtml);

  let next = boxHtml;

  // Avatar image src + alt
  if (avatar) {
    next = next.replace(
      /(<div\s+class="elementor-author-box__avatar">\s*)(?:<a\b[^>]*>\s*)?<img\b[^>]*>\s*(?:<\/a>\s*)?/i,
      `$1<a href="${href}"><img src="${escapeAttr(avatar)}" alt="Picture of ${name}" width="96" height="96" loading="lazy"></a>`,
    );
  } else {
    // Still link existing avatar if present
    next = next.replace(
      /(<div\s+class="elementor-author-box__avatar">\s*)(?:<a\b[^>]*>\s*)?(<img\b[^>]*>)\s*(?:<\/a>\s*)?/i,
      `$1<a href="${href}">$2</a>`,
    );
  }

  // Name → linked heading text
  next = next.replace(
    /<h4\s+class="elementor-author-box__name">[\s\S]*?<\/h4>/i,
    `<h4 class="elementor-author-box__name"><a href="${href}">${name}</a></h4>`,
  );

  // Bio text when the box already has a bio block
  if (hasBio && bio) {
    next = next.replace(
      /<div\s+class="elementor-author-box__bio">[\s\S]*?<\/div>/i,
      `<div class="elementor-author-box__bio">${escapeHtml(bio)}</div>`,
    );
  }

  return next;
}

export function rewriteElementorAuthorBoxes(html: string, author: AuthorBoxInput | null | undefined): string {
  if (!html || !author?.name || !author?.path) return html;
  if (!AUTHOR_BOX_RE.test(html)) return html;
  AUTHOR_BOX_RE.lastIndex = 0;
  return html.replace(AUTHOR_BOX_RE, (box) => rewriteOneBox(box, author));
}
