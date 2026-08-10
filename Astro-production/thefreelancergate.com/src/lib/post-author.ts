/** Normalize post author name / avatar in mirrored Impreza bodyHtml. */

import avatarRemap from "../data/author-avatar-remap.json";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const GRAVATAR_RE = /secure\.gravatar\.com\/avatar\//i;

const LOCAL_GRAVATAR_REMAP = new Map(
  Object.entries((avatarRemap as { remap?: Record<string, string> }).remap || {}).map(
    ([from, to]) => [normalizeAvatarUrl(from), to],
  ),
);

function normalizeAvatarUrl(src: string): string {
  return src.replace(/&#038;/g, "&").replace(/&amp;/g, "&").trim();
}

export function titleCaseWords(value: string): string {
  return value
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** Derive a human name from an email local-part or author archive slug. */
export function resolveAuthorDisplayName(input: {
  text?: string;
  href?: string;
  fallback?: string;
}): string {
  const text = (input.text || "").replace(/<[^>]+>/g, "").trim();
  if (text && !EMAIL_RE.test(text) && !/\[email/i.test(text)) return text;

  if (input.fallback && !EMAIL_RE.test(input.fallback)) return input.fallback;

  if (text && EMAIL_RE.test(text)) {
    return titleCaseWords(text.split("@")[0] || text);
  }

  const href = input.href || "";
  const slug = (href.match(/\/author\/([^/`"'?#]+)/i)?.[1] || "")
    .replace(/\/+$/, "")
    .trim();
  if (slug) {
    // CF-mangled email slugs look like: muhammad-faieezvistaoutsourcing-com
    const cleaned = slug
      .replace(/-(?:com|net|org|co|io|ae|uk)$/i, "")
      .replace(
        /(gmail|yahoo|hotmail|outlook|vistaoutsourcing|thefreelancergate|protonmail)$/i,
        "",
      )
      .replace(/-+$/g, "");
    if (cleaned.length >= 2) return titleCaseWords(cleaned);
    return titleCaseWords(slug);
  }

  return text || input.fallback || "Author";
}

function initialsFromName(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || "TG";
}

/** Build a tiny data-URI avatar so empty Gravatar accounts still show a face mark. */
export function initialsAvatarDataUri(name: string): string {
  const initials = initialsFromName(name);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="70" height="70" viewBox="0 0 70 70"><circle cx="35" cy="35" r="35" fill="#0057FF"/><text x="35" y="42" text-anchor="middle" font-family="Kumbh Sans, Arial, sans-serif" font-size="22" font-weight="700" fill="#fff">${initials}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function remapGravatarAttr(attrs: string, resolvedName: string): string {
  const src = (attrs.match(/\bsrc=(['"])([^'"]*)\1/i) || [])[2] || "";
  const normalized = normalizeAvatarUrl(src);
  const local = LOCAL_GRAVATAR_REMAP.get(normalized);
  // Empty Gravatar accounts only have the gray mystery-man — prefer brand initials.
  const avatarSrc =
    local && !/\/authors\/gravatar\//.test(local)
      ? local
      : initialsAvatarDataUri(resolvedName || "Author");

  let next = attrs
    .replace(/\bsrc=(['"])[^'"]*\1/i, `src="${avatarSrc}"`)
    .replace(/\s*srcset=(['"])[^'"]*\1/i, "")
    .replace(/\balt=(['"])[^'"]*\1/i, `alt="${resolvedName.replace(/"/g, "")}"`);
  if (!/\balt=/i.test(next)) next += ` alt="${resolvedName.replace(/"/g, "")}"`;
  return next;
}

/**
 * - Replace CF-decoded email-as-name with a human display name
 * - Prefer synced local author avatars; fall back to brand initials for empty Gravatar
 */
export function enhancePostAuthorHtml(
  html: string,
  opts: { authorName?: string } = {},
): string {
  if (!html || !/post-author|post_author|gravatar\.com/i.test(html)) return html;

  let out = html;
  let resolvedName = opts.authorName || "";

  out = out.replace(
    /(<a\b[^>]*\bpost-author-name\b[^>]*>)([\s\S]*?)(<\/a>)/gi,
    (_full, open: string, inner: string, close: string) => {
      const href = (String(open).match(/\bhref=["']([^"']+)["']/i) || [])[1];
      const name = resolveAuthorDisplayName({
        text: inner,
        href,
        fallback: opts.authorName,
      });
      resolvedName = name;
      return `${open}${name}${close}`;
    },
  );

  if (!resolvedName) {
    const href = (out.match(/\/author\/([^/`"'?#]+)/i) || [])[1];
    resolvedName = resolveAuthorDisplayName({
      href: href ? `/author/${href}/` : undefined,
      fallback: opts.authorName,
    });
  }

  out = out.replace(
    /(<div class="post-author-ava"[^>]*>\s*<img\b)([^>]*?)(\/?>)/gi,
    (_full, start: string, attrs: string, end: string) => {
      if (!GRAVATAR_RE.test(attrs)) return `${start}${attrs}${end}`;
      return `${start}${remapGravatarAttr(attrs, resolvedName)}${end}`;
    },
  );

  return out;
}
