/**
 * Dashboard posts store — backed by src/data/posts.json (SP Heavy WP export shape).
 * Exposes Connect-style InternalPost for the existing editor UI.
 */
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { processContentHeadings, type BlogPost } from "../blog";
import type { PostEntry } from "../content-types";
import {
  nextNumericId,
  readAuthors,
  readCategories,
  readPosts,
  readTags,
  writePosts,
} from "../data-store";
import {
  getActiveCategoryOptions as getActiveCategoryTerms,
  getActiveTagOptions as getActiveTagTerms,
  upsertTag,
} from "./taxonomy-store";

const ROOT_DIR = process.cwd();
const PUBLIC_UPLOADS_DIR = join(ROOT_DIR, "public/wp-content/uploads/internal-posts");
const SITE_ORIGIN = process.env.PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://connecthr.ae";

export type PostStatus = "draft" | "published" | "trash";

export type InternalPost = BlogPost & {
  status?: PostStatus;
  metaTitle?: string;
  metaDescription?: string;
  noIndex?: boolean;
  noFollow?: boolean;
  trashedFromStatus?: "draft" | "published";
  robotsBeforeTrash?: string;
  /** Stable WP/export id */
  id?: number;
};

export type CategoryOption = { name: string; slug?: string; url?: string };
export type TagOption = { name: string; slug: string };

function safeSlug(text: string): string {
  return (text || "")
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function robotsString(robots?: { index?: string; follow?: string } | string | null): string {
  if (!robots) return "index, follow";
  if (typeof robots === "string") return robots;
  return [robots.index || "index", robots.follow || "follow"].join(", ");
}

function parseRobots(robots: string | undefined): { index: string; follow: string } {
  const raw = (robots || "index, follow").toLowerCase();
  return {
    index: /\bnoindex\b/.test(raw) ? "noindex" : "index",
    follow: /\bnofollow\b/.test(raw) ? "nofollow" : "follow",
  };
}

function entryToInternal(entry: PostEntry): InternalPost {
  const cats = readCategories();
  const tags = readTags();
  const contentHtml = entry.bodyHtml || entry.content || "";
  const isElementor = /data-elementor-type|class=["'][^"']*elementor/i.test(contentHtml);
  const processed = isElementor
    ? { html: contentHtml, toc: [] as any[], headings: [] as any[] }
    : processContentHeadings(contentHtml);
  const robots = robotsString(entry.seo?.robots);
  const status: PostStatus = entry.status || "published";

  return {
    id: entry.id,
    slug: entry.slug,
    title: entry.title,
    description: entry.seo?.description || entry.excerpt || "",
    contentHtml: processed.html,
    toc: processed.toc,
    headings: processed.headings,
    publishedAt: entry.date,
    modifiedAt: entry.modified,
    author: entry.authorName,
    authorSlug: entry.authorSlug,
    canonical: entry.seo?.canonical || entry.path,
    robots,
    status,
    metaTitle: entry.seo?.title || "",
    metaDescription: entry.seo?.description || "",
    noIndex: /\bnoindex\b/i.test(robots),
    noFollow: /\bnofollow\b/i.test(robots),
    categories: (entry.categories || [])
      .map((id) => cats.find((c) => c.id === id))
      .filter(Boolean)
      .map((c) => ({
        name: c!.name,
        slug: c!.slug,
        url: c!.path || `/category/${c!.slug}/`,
      })),
    tags: (entry.tags || [])
      .map((id) => tags.find((t) => t.id === id))
      .filter(Boolean)
      .map((t) => ({
        name: t!.name,
        slug: t!.slug,
        url: t!.path || `/tag/${t!.slug}/`,
      })),
    featuredImage: entry.featuredImage
      ? { src: entry.featuredImage, alt: entry.title }
      : null,
    images: [],
    links: [],
    linkAudit: { brokenInternal: [], wordpressSpecific: [], external: [], unresolved: [] },
    og: {
      title: entry.seo?.title || entry.title,
      description: entry.seo?.description || "",
    },
    twitter: { card: "summary_large_image" },
  };
}

function resolveCategoryIds(categories: InternalPost["categories"]): number[] {
  const all = readCategories();
  const ids: number[] = [];
  for (const c of categories || []) {
    const slug = String((c as { slug?: string })?.slug || "");
    const hit = all.find((row) => row.slug === slug);
    if (hit) ids.push(hit.id);
  }
  return ids;
}

function resolveTagIds(tags: InternalPost["tags"]): number[] {
  const all = readTags();
  const ids: number[] = [];
  for (const t of tags || []) {
    const slug = String((t as { slug?: string })?.slug || "");
    const hit = all.find((row) => row.slug === slug);
    if (hit) ids.push(hit.id);
  }
  return ids;
}

function internalToEntry(post: InternalPost, previous?: PostEntry): PostEntry {
  const slug = safeSlug(post.slug);
  const path = `/${slug}/`;
  const robots = parseRobots(post.robots);
  const authors = readAuthors();
  const author =
    authors.find((a) => a.slug === post.authorSlug) ||
    authors.find((a) => a.name === post.author) ||
    authors[0];

  const html = post.contentHtml || "";
  const excerpt =
    previous?.excerpt ||
    html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 240);

  return {
    id: previous?.id || post.id || nextNumericId(readPosts()),
    type: "post",
    slug,
    path,
    link: `${SITE_ORIGIN}${path}`,
    title: post.title,
    content: html,
    bodyHtml: html,
    excerpt,
    date: post.publishedAt || previous?.date || new Date().toISOString(),
    modified: post.modifiedAt || new Date().toISOString(),
    categories: resolveCategoryIds(post.categories),
    tags: resolveTagIds(post.tags),
    author: author?.id || previous?.author || 1,
    authorName: author?.name || String(post.author || "Connect HR"),
    authorSlug: author?.slug || String(post.authorSlug || "adm_connecthr"),
    featuredImage:
      (post.featuredImage && typeof post.featuredImage === "object"
        ? (post.featuredImage as { src?: string }).src
        : "") ||
      previous?.featuredImage ||
      "",
    seo: {
      title: post.metaTitle || post.title,
      description: post.metaDescription || post.description || "",
      canonical: post.canonical || path,
      ogImage:
        (post.featuredImage && typeof post.featuredImage === "object"
          ? (post.featuredImage as { src?: string }).src
          : "") ||
        previous?.seo?.ogImage ||
        "",
      robots,
      schemas: previous?.seo?.schemas || [],
    },
    elementorCss: previous?.elementorCss,
    pageCss: previous?.pageCss || [
      "/wp-content/uploads/elementor/css/post-652.css",
      "/wp-content/plugins/elementor/assets/css/widget-spacer.min.css",
    ],
    status: post.status || "published",
  };
}

export function listAllPosts(): InternalPost[] {
  return readPosts().map(entryToInternal);
}

export function getPost(slug: string): InternalPost | null {
  const target = safeSlug(slug);
  const entry = readPosts().find((p) => p.slug === target);
  return entry ? entryToInternal(entry) : null;
}

export function deletePost(slug: string): void {
  const target = safeSlug(slug);
  writePosts(readPosts().filter((p) => p.slug !== target));
}

export function deletePostPermanently(slug: string): void {
  deletePost(slug);
}

export function movePostToTrash(slug: string): void {
  const existing = getPost(slug);
  if (!existing || existing.status === "trash") return;
  const fromStatus: "draft" | "published" = existing.status === "draft" ? "draft" : "published";
  existing.trashedFromStatus = fromStatus;
  existing.robotsBeforeTrash = existing.robots;
  existing.status = "trash";
  existing.robots = "noindex, nofollow";
  existing.modifiedAt = new Date().toISOString();
  savePost(existing);
}

export function restorePostFromTrash(slug: string): void {
  const existing = getPost(slug);
  if (!existing || existing.status !== "trash") return;
  existing.status = existing.trashedFromStatus || "published";
  existing.robots = existing.robotsBeforeTrash || "index, follow";
  existing.trashedFromStatus = undefined;
  existing.robotsBeforeTrash = undefined;
  existing.modifiedAt = new Date().toISOString();
  savePost(existing);
}

export function getAllCategoryOptions(): CategoryOption[] {
  return getActiveCategoryTerms()
    .map((t) => ({ name: t.name, slug: t.slug, url: `/category/${t.slug}/` }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getAllTagOptions(): TagOption[] {
  return getActiveTagTerms()
    .map((t) => ({ name: t.name, slug: t.slug }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function normalizeTagsCsv(tagsCsv: string): Array<{ name: string; slug: string }> {
  const parts = (tagsCsv || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const out: Array<{ name: string; slug: string }> = [];
  const seen = new Set<string>();
  for (const name of parts) {
    const slug = safeSlug(name);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push({ name, slug });
  }
  return out;
}

export function tagsToBlogTags(tags: Array<{ name: string; slug: string }>) {
  return tags.map((t) => ({
    name: t.name,
    slug: t.slug,
    url: `/tag/${t.slug}/`,
  }));
}

export function categoriesToBlogCategory(category: CategoryOption) {
  const slug = category.slug || safeSlug(category.name);
  return [
    {
      name: category.name,
      slug,
      url: category.url || `/category/${slug}/`,
    },
  ];
}

export function getUploadDestinationPath(fileName: string): {
  filePath: string;
  publicUrl: string;
} {
  const safe = fileName.replaceAll("\\", "/").split("/").pop() || "image";
  const stamp = new Date();
  const yyyy = stamp.getFullYear();
  const mm = String(stamp.getMonth() + 1).padStart(2, "0");
  const extMatch = safe.match(/\.(png|jpe?g|webp|gif|svg)$/i);
  const ext = extMatch ? extMatch[0] : ".png";
  const base = safeSlug(safe.replace(ext, "")) || "featured";
  const finalName = `${base}-${stamp.getTime()}${ext.toLowerCase()}`;
  const dir = join(PUBLIC_UPLOADS_DIR, String(yyyy), String(mm));
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return {
    filePath: join(dir, finalName),
    publicUrl: `/wp-content/uploads/internal-posts/${yyyy}/${mm}/${finalName}`,
  };
}

export function robotsFromNoIndex(noIndex: boolean, noFollow: boolean): string {
  return `${noIndex ? "noindex" : "index"}, ${noFollow ? "nofollow" : "follow"}`;
}

export function savePost(post: InternalPost): void {
  const slug = safeSlug(post.slug);
  if (!slug) throw new Error("Post slug is required");
  const rows = readPosts();
  const idx = rows.findIndex((p) => p.slug === slug);
  const previous = idx >= 0 ? rows[idx] : rows.find((p) => p.id === post.id);
  const entry = internalToEntry({ ...post, slug }, previous);
  if (idx >= 0) rows[idx] = entry;
  else rows.push(entry);
  writePosts(rows);
}

export function createOrUpdatePost(args: {
  originalSlug?: string;
  slug: string;
  title: string;
  contentHtml: string;
  category: CategoryOption;
  tagsCsv: string;
  status: PostStatus;
  publishDateISO: string;
  metaTitle: string;
  metaDescription: string;
  noIndex: boolean;
  noFollow: boolean;
  featuredImage?: { publicUrl: string; fileName: string } | null;
}): { slug: string; action: "create" | "update" } {
  const now = new Date().toISOString();
  const targetSlug = safeSlug(args.slug || args.title);
  if (!targetSlug) throw new Error("Post title/slug must produce a valid slug");

  const existing = args.originalSlug ? getPost(safeSlug(args.originalSlug)) : null;
  const isUpdate = Boolean(existing);
  const action: "create" | "update" = isUpdate ? "update" : "create";

  if (!isUpdate || safeSlug(args.originalSlug || "") !== targetSlug) {
    if (getPost(targetSlug) && (!existing || existing.slug !== targetSlug)) {
      throw new Error(`A post with slug "${targetSlug}" already exists.`);
    }
  }

  // Ensure tags exist in taxonomy store
  const tagList = normalizeTagsCsv(args.tagsCsv);
  for (const tag of tagList) {
    try {
      upsertTag({ name: tag.name, slug: tag.slug });
    } catch {
      /* already exists */
    }
  }

  let post: InternalPost;
  if (isUpdate && existing) {
    post = JSON.parse(JSON.stringify(existing)) as InternalPost;
    post.slug = targetSlug;
  } else {
    const authors = readAuthors();
    const author = authors.find((a) => a.slug === "faieez") || authors[0];
    post = {
      slug: targetSlug,
      title: args.title,
      description: "",
      contentHtml: "",
      status: "draft",
      publishedAt: now,
      modifiedAt: now,
      author: author?.name || "Connect HR",
      authorSlug: author?.slug || "sp-heavy",
      categories: [],
      tags: [],
      featuredImage: null,
      images: [],
      links: [],
      linkAudit: { brokenInternal: [], wordpressSpecific: [], external: [], unresolved: [] },
      og: { title: "", description: "" },
      twitter: { card: "summary_large_image" },
      toc: [],
      headings: [],
    };
  }

  const previousStatus = post.status;
  post.title = args.title;
  post.slug = targetSlug;
  post.description = args.metaDescription || post.description || "";
  post.metaTitle = args.metaTitle || "";
  post.metaDescription = args.metaDescription || "";
  post.canonical = `/${targetSlug}/`;
  post.contentHtml = args.contentHtml || "";
  post.categories = categoriesToBlogCategory(args.category);
  post.tags = tagsToBlogTags(tagList);
  post.status = args.status;
  post.publishedAt = args.publishDateISO || post.publishedAt || now;
  post.modifiedAt = now;

  if (args.status === "trash") {
    if (previousStatus !== "trash") {
      post.trashedFromStatus = previousStatus === "draft" ? "draft" : "published";
      post.robotsBeforeTrash = post.robots;
    }
    post.robots = "noindex, nofollow";
  } else if (previousStatus === "trash") {
    post.robots = post.robotsBeforeTrash || robotsFromNoIndex(args.noIndex, args.noFollow);
    post.trashedFromStatus = undefined;
    post.robotsBeforeTrash = undefined;
  } else {
    post.robots = robotsFromNoIndex(args.noIndex, args.noFollow);
  }

  if (args.featuredImage) {
    post.featuredImage = {
      src: args.featuredImage.publicUrl,
      alt: args.featuredImage.fileName,
      originalUrl: args.featuredImage.publicUrl,
    };
  } else if (args.featuredImage === null) {
    post.featuredImage = null;
  }

  const isElementorHtml = /data-elementor-type|class=["'][^"']*elementor/i.test(post.contentHtml || "");
  if (!isElementorHtml) {
    const processed = processContentHeadings(post.contentHtml || "");
    post.contentHtml = processed.html;
    post.toc = processed.toc;
    post.headings = processed.headings;
  } else {
    post.toc = post.toc || [];
    post.headings = post.headings || [];
  }
  post.og = post.og || {};
  post.og.title = args.metaTitle || post.title;
  post.og.description = args.metaDescription || post.description;
  post.twitter = post.twitter || { card: "summary_large_image" };
  post.twitter.title = args.metaTitle || post.title;
  post.twitter.description = args.metaDescription || post.description;

  savePost(post);
  if (isUpdate && args.originalSlug && safeSlug(args.originalSlug) !== targetSlug) {
    writePosts(readPosts().filter((p) => p.slug !== safeSlug(args.originalSlug!)));
  }

  return { slug: targetSlug, action };
}
