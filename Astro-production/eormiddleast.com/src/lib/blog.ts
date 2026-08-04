/**
 * Minimal blog helpers for the operations dashboard internal-posts module.
 * EOR Middle East marketing posts live in JSON; this file only supports dashboard CMS tooling.
 */
import * as cheerio from "cheerio";
import { posts as contentPosts } from "./content.ts";

export interface TocEntry {
  id: string;
  text: string;
  level: 2 | 3;
}

export interface BlogImage {
  src?: string;
  alt?: string;
  width?: number;
  height?: number;
}

export interface BlogLink {
  href?: string;
  text?: string;
}

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  contentHtml: string;
  publishedAt?: string;
  updatedAt?: string;
  author?: string;
  authorSlug?: string;
  categories?: Array<{ name: string; slug?: string; url?: string }>;
  tags?: Array<{ name: string; slug: string }>;
  featuredImage?: BlogImage;
  headings?: Array<{ level: string; text: string; id: string }>;
  toc?: TocEntry[];
  robots?: string;
  [key: string]: unknown;
}

export function getReservedSlugs(): Set<string> {
  return new Set();
}

export function getAllBlogSlugs(): string[] {
  return contentPosts.map((p) => p.slug).filter(Boolean);
}

export function getBlogPost(slug: string): BlogPost | null {
  const post = contentPosts.find((p) => p.slug === slug);
  if (!post) return null;
  return {
    slug: post.slug,
    title: post.title,
    description: post.seo?.description || post.excerpt || "",
    contentHtml: post.bodyHtml || post.content || "",
    publishedAt: post.date,
    updatedAt: post.modified,
    author: post.authorName,
    authorSlug: post.authorSlug,
    robots: [post.seo?.robots?.index, post.seo?.robots?.follow].filter(Boolean).join(", "),
    canonical: post.seo?.canonical || post.path,
    modifiedAt: post.modified,
  };
}

export function getAllBlogPosts(): BlogPost[] {
  return getAllBlogSlugs()
    .map((slug) => getBlogPost(slug))
    .filter((p): p is BlogPost => Boolean(p));
}

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function processContentHeadings(html: string): {
  html: string;
  toc: TocEntry[];
  headings: BlogPost["headings"];
} {
  const $ = cheerio.load(`<div id="root">${html || ""}</div>`, { xml: { decodeEntities: false } } as any);
  const toc: TocEntry[] = [];
  const headings: NonNullable<BlogPost["headings"]> = [];
  const usedIds = new Set<string>();

  $("#root")
    .find("h2, h3")
    .each((_, el) => {
      const $el = $(el);
      const tag = ((el as any).tagName || "h2").toLowerCase();
      const level = tag === "h3" ? 3 : 2;
      const text = $el.text().replace(/\s+/g, " ").trim();
      if (!text) return;

      let id = $el.attr("id") || slugifyHeading(text);
      const baseId = id;
      let n = 2;
      while (usedIds.has(id)) {
        id = `${baseId}-${n}`;
        n += 1;
      }
      usedIds.add(id);
      $el.attr("id", id);
      toc.push({ id, text, level: level as 2 | 3 });
      headings.push({ level: tag, text, id });
    });

  return { html: $("#root").html() || "", toc, headings };
}
