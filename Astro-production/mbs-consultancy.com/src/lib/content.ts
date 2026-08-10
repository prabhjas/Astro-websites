import siteJson from "../data/site.json";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
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

/** Package root (Astro-production/mbs-consultancy.com) — stable even if process.cwd differs. */
const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_ROOT = path.join(PACKAGE_ROOT, "public");

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

export function absoluteUrl(pathname?: string | null): string {
  if (!pathname) return site.url.replace(/\/$/, "") + "/";
  if (pathname.startsWith("http")) return pathname;
  const base = site.url.replace(/\/$/, "");
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${base}${path}`;
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

/** True when a public/ asset exists and is not an HTML soft-404 / invalid media stub. */
export function isRealPublicAsset(href: string): boolean {
  if (!href || !href.startsWith("/")) return false;
  try {
    const rel = href.replace(/^\//, "").split("?")[0];
    const candidates = [
      path.join(PUBLIC_ROOT, rel),
      path.join(process.cwd(), "public", rel),
      path.join(process.cwd(), "dist", "client", rel),
    ];
    for (const file of candidates) {
      if (!fs.existsSync(file) || !fs.statSync(file).isFile()) continue;
      if (fs.statSync(file).size < 50) continue;
      const buf = fs.readFileSync(file).subarray(0, 64);
      const head = buf.toString("utf8").trimStart().toLowerCase();
      if (head.startsWith("<!doctype") || head.startsWith("<html")) continue;
      const ext = path.extname(file).toLowerCase();
      if (/\.(jpe?g|png|gif|webp|avif|ico)$/i.test(ext)) {
        const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
        const isPng =
          buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
        const isGif =
          buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38;
        const isWebp =
          buf[0] === 0x52 &&
          buf[1] === 0x49 &&
          buf[2] === 0x46 &&
          buf[3] === 0x46 &&
          buf.length >= 12 &&
          buf[8] === 0x57 &&
          buf[9] === 0x45 &&
          buf[10] === 0x42 &&
          buf[11] === 0x50;
        if (!(isJpeg || isPng || isGif || isWebp)) continue;
      }
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Drop Elementor image-box portraits when the file is missing or a soft-404 HTML stub.
 * Keeps title/description; removes broken <img> chrome on /author/ cards etc.
 */
export function stripMissingImageBoxImages(html: string): string {
  if (!html || !html.includes("elementor-image-box-img")) return html;
  return html.replace(
    /<figure\b[^>]*\bclass=["'][^"']*\belementor-image-box-img\b[^"']*["'][^>]*>[\s\S]*?<\/figure>/gi,
    (figure) => {
      const rawSrc = figure.match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i)?.[1];
      if (!rawSrc) return "";
      let pathname = rawSrc;
      try {
        if (/^https?:\/\//i.test(rawSrc)) pathname = new URL(rawSrc).pathname;
      } catch {
        return "";
      }
      const local = pathname.startsWith("/") ? pathname.split("?")[0] : `/${pathname.split("?")[0]}`;
      return isRealPublicAsset(local) ? figure : "";
    },
  );
}

/** Elementor (+ EAEL) per-page CSS for a WP page/post id. */
export function elementorCssForId(id: number | string | undefined | null): string[] {
  if (id == null || id === "") return [];
  const n = Number(id);
  if (!Number.isFinite(n) || n <= 0) return [];
  const candidates = [
    `/wp-content/uploads/elementor/css/post-${n}.css`,
    `/wp-content/uploads/essential-addons-elementor/eael-${n}.css`,
  ];
  return candidates.filter(isRealPublicAsset);
}

/** Link extracted Smart Slider CSS for any n2-ss-{id} present in HTML. */
export function smartSliderCssForHtml(html: string): string[] {
  if (!html) return [];
  const ids = new Set(
    [...html.matchAll(/\bid=["']n2-ss-(\d+)["']/g)].map((m) => m[1]),
  );
  if (!ids.size) return [];
  try {
    const dir = path.join(process.cwd(), "public/css/smart-slider");
    if (!fs.existsSync(dir)) return [];
    const files = fs.readdirSync(dir);
    const out: string[] = [];
    for (const id of ids) {
      for (const f of files) {
        if (f.startsWith(`ss-${id}-`) && f.endsWith(".css")) {
          out.push(`/css/smart-slider/${f}`);
        }
      }
    }
    return out;
  } catch {
    return [];
  }
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
