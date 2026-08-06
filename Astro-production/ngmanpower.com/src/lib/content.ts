import siteJson from "../data/site.json";
import {
  readAuthors,
  readCategories,
  readPages,
  readPosts,
  readTags,
} from "./data-store";
import type {
  AuthorEntry,
  CategoryEntry,
  PageEntry,
  PostEntry,
  TagEntry,
} from "./content-types";

export type {
  AuthorEntry,
  CategoryEntry,
  NavItem,
  PageEntry,
  PostEntry,
  SeoData,
  TagEntry,
} from "./content-types";

export const site = siteJson as typeof siteJson & {
  navigation: import("./content-types").NavItem[];
  footerServices: { label: string; href: string }[];
  footerQuickLinks: { label: string; href: string }[];
};

/** Live getters — always read from disk so dashboard edits apply in SSR/dev. */
export function getPages(): PageEntry[] {
  return readPages();
}

export function getPosts(includeNonPublished = false): PostEntry[] {
  const rows = readPosts();
  if (includeNonPublished) return rows;
  return rows.filter((p) => !p.status || p.status === "published");
}

export function getCategories(includeTrash = false): CategoryEntry[] {
  const rows = readCategories();
  if (includeTrash) return rows;
  return rows.filter((c) => !c.status || c.status === "active");
}

export function getTags(includeTrash = false): TagEntry[] {
  const rows = readTags();
  if (includeTrash) return rows;
  return rows.filter((t) => !t.status || t.status === "active");
}

export function getAuthors(): AuthorEntry[] {
  return readAuthors();
}

/** @deprecated Prefer getPages() for live data; kept for compatibility */
export const pages = readPages();
/** @deprecated Prefer getPosts() */
export const posts = readPosts().filter((p) => !p.status || p.status === "published");
/** @deprecated Prefer getCategories() */
export const categories = readCategories().filter((c) => !c.status || c.status === "active");
/** @deprecated Prefer getTags() */
export const tags = readTags().filter((t) => !t.status || t.status === "active");
/** @deprecated Prefer getAuthors() */
export const authors = readAuthors();

export function getPageByPath(pathname: string): PageEntry | undefined {
  const normalized = normalizePath(pathname);
  return getPages().find((p) => normalizePath(p.path) === normalized);
}

export function getPostByPath(pathname: string): PostEntry | undefined {
  const normalized = normalizePath(pathname);
  return getPosts(true).find((p) => normalizePath(p.path) === normalized);
}

export function getPublishedPostByPath(pathname: string): PostEntry | undefined {
  const post = getPostByPath(pathname);
  if (!post) return undefined;
  if (post.status && post.status !== "published") return undefined;
  return post;
}

export function getCategoryBySlug(slug: string): CategoryEntry | undefined {
  return getCategories().find((c) => c.slug === slug);
}

export function getTagBySlug(slug: string): TagEntry | undefined {
  return getTags().find((t) => t.slug === slug);
}

export function getAuthorBySlug(slug: string): AuthorEntry | undefined {
  return getAuthors().find((a) => a.slug === slug);
}

export function getPostsByCategory(categoryId: number): PostEntry[] {
  return getPosts()
    .filter((p) => p.categories.includes(categoryId))
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

export function getPostsByTag(tagId: number): PostEntry[] {
  return getPosts()
    .filter((p) => p.tags.includes(tagId))
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

export function getPostsByAuthor(authorId: number): PostEntry[] {
  return getPosts()
    .filter((p) => p.author === authorId)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

export function getRelatedPosts(post: PostEntry, limit = 3): PostEntry[] {
  const all = getPosts();
  const scored = all
    .filter((p) => p.id !== post.id)
    .map((p) => {
      const catScore = p.categories.filter((c) => post.categories.includes(c)).length;
      const tagScore = p.tags.filter((t) => post.tags.includes(t)).length;
      return { p, score: catScore * 2 + tagScore };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || +new Date(b.p.date) - +new Date(a.p.date));
  return (scored.length ? scored.map((x) => x.p) : all.filter((p) => p.id !== post.id)).slice(
    0,
    limit,
  );
}

export function normalizePath(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  let p = pathname.split("?")[0].split("#")[0];
  if (!p.startsWith("/")) p = `/${p}`;
  if (!p.endsWith("/")) p = `${p}/`;
  return p;
}

const LIVE_HOST_RE = /^https?:\/\/(?:www\.)?ngmanpower\.com/i;
const MEDIA_PATH_RE = /\/wp-content\//i;
const MEDIA_EXT_RE = /\.(png|jpe?g|webp|gif|svg|avif|ico|bmp)(\?|$)/i;

function resolveUrlBase(path: string, mediaOrigin?: string): string {
  const isMedia = MEDIA_PATH_RE.test(path) || MEDIA_EXT_RE.test(path);
  if (isMedia) {
    const local = (mediaOrigin || process.env.FLEET_LOCAL_URL || "").replace(/\/$/, "");
    if (local) return local;
  }
  return site.url.replace(/\/$/, "");
}

/** Absolute URL; media prefers request origin / FLEET_LOCAL_URL so local SSR stays offline-live. */
export function absoluteUrl(pathname: string, mediaOrigin?: string): string {
  let path = (pathname || "").trim();
  if (!path) path = "/";
  if (LIVE_HOST_RE.test(path)) path = path.replace(LIVE_HOST_RE, "") || "/";
  if (/^https?:\/\//i.test(path)) return path;
  if (!path.startsWith("/")) path = `/${path}`;
  return `${resolveUrlBase(path, mediaOrigin)}${path}`;
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-AE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function paginate<T>(items: T[], page: number, perPage = 9) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const current = Math.min(Math.max(1, page), totalPages);
  const start = (current - 1) * perPage;
  return {
    items: items.slice(start, start + perPage),
    page: current,
    perPage,
    total,
    totalPages,
    hasPrev: current > 1,
    hasNext: current < totalPages,
  };
}

export const POSTS_PER_PAGE = 9;
