/**
 * Rebuild NG Manpower authors.json + fix post author fields from Impreza bylines
 * embedded in post HTML (href="/author/{slug}/" class="fn").
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const postsPath = path.join(root, "src/data/posts.json");
const authorsPath = path.join(root, "src/data/authors.json");

const posts = JSON.parse(fs.readFileSync(postsPath, "utf8"));
const existingAuthors = JSON.parse(fs.readFileSync(authorsPath, "utf8"));
const existingBySlug = new Map(existingAuthors.map((a) => [a.slug, a]));

/** Prefer aria-label / visible name from Impreza author vcard. */
const BYLINE_RE =
  /<[^>]*class="[^"]*\bvcard\b[^"]*author[^"]*"[^>]*>[\s\S]*?<a\s+href="\/author\/([a-z0-9\-]+)\/"[^>]*class="fn"[^>]*(?:\s+aria-label="([^"]*)")?[^>]*>([\s\S]*?)<\/a>/i;

const SLUG_ALIASES = {
  kate: "kate-williams",
};

function titleCaseSlug(slug) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function cleanName(raw, slug) {
  const text = String(raw || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text || text === slug) return titleCaseSlug(slug);
  return text;
}

function extractByline(html) {
  const m = String(html || "").match(BYLINE_RE);
  if (!m) return null;
  const rawSlug = m[1];
  const slug = SLUG_ALIASES[rawSlug] || rawSlug;
  const name = cleanName(m[2] || m[3], slug);
  return { slug, name, rawSlug };
}

const authorMeta = new Map(); // slug -> { name, ids: Set, postCount }
let nextId = Math.max(0, ...existingAuthors.map((a) => Number(a.id) || 0)) + 1;

function ensureAuthor(slug, name) {
  if (authorMeta.has(slug)) {
    const row = authorMeta.get(slug);
    if (name && isBetterName(name, row.name, slug)) row.name = name;
    return row;
  }
  const prev = existingBySlug.get(slug);
  const id = prev?.id ?? nextId++;
  const preferred =
    (prev?.name && isBetterName(prev.name, name, slug) ? prev.name : null) ||
    name ||
    prev?.name ||
    titleCaseSlug(slug);
  const row = {
    id,
    name: preferred,
    slug,
    description: prev?.description || "",
    avatar: prev?.avatar || "",
    path: `/author/${slug}/`,
    postCount: 0,
  };
  authorMeta.set(slug, row);
  return row;
}

function isBetterName(candidate, current, slug) {
  const c = String(candidate || "").trim();
  const cur = String(current || "").trim();
  if (!c) return false;
  if (!cur) return true;
  const slugTitle = titleCaseSlug(slug);
  if (c === slug || c === slugTitle) return false;
  if (cur === slug || cur === slugTitle) return true;
  if (c.includes("@") && !cur.includes("@")) return false;
  if (!c.includes("@") && cur.includes("@")) return true;
  if (c.length > cur.length + 2) return true;
  return false;
}

let fixed = 0;
let missingByline = 0;

for (const post of posts) {
  const html = `${post.bodyHtml || ""}\n${post.content || ""}`;
  const byline = extractByline(html);
  if (!byline) {
    missingByline += 1;
    // Keep a fallback site author so archives stay consistent.
    const fallback = ensureAuthor("ng-manpower", "NG Manpower");
    post.author = fallback.id;
    post.authorSlug = fallback.slug;
    post.authorName = fallback.name;
    fallback.postCount += 1;
    continue;
  }

  const author = ensureAuthor(byline.slug, byline.name);
  if (
    post.author !== author.id ||
    post.authorSlug !== author.slug ||
    post.authorName !== author.name
  ) {
    fixed += 1;
  }
  post.author = author.id;
  post.authorSlug = author.slug;
  post.authorName = author.name;
  author.postCount += 1;

  // Keep HTML author links aligned with canonical slug aliases (kate → kate-williams).
  if (byline.rawSlug !== byline.slug) {
    const re = new RegExp(`/author/${byline.rawSlug}/`, "g");
    if (post.content) post.content = post.content.replace(re, `/author/${byline.slug}/`);
    if (post.bodyHtml) post.bodyHtml = post.bodyHtml.replace(re, `/author/${byline.slug}/`);
  }
}

const authorsOut = [...authorMeta.values()]
  .sort((a, b) => a.name.localeCompare(b.name))
  .map(({ postCount, ...rest }) => rest);

fs.writeFileSync(postsPath, `${JSON.stringify(posts, null, 2)}\n`);
fs.writeFileSync(authorsPath, `${JSON.stringify(authorsOut, null, 2)}\n`);

const counts = Object.fromEntries(
  [...authorMeta.values()].map((a) => [a.slug, a.postCount]),
);
console.log(
  JSON.stringify(
    {
      authors: authorsOut.length,
      fixedPosts: fixed,
      missingByline,
      counts,
    },
    null,
    2,
  ),
);
