/**
 * Minimal WordPress REST shim for Advanced Post Block on /blog/.
 * Backed by local posts/categories/tags JSON (not live WordPress).
 */
import { getCategories, getPosts, getTags, site } from "../content";
import type { CategoryEntry, PostEntry, TagEntry } from "../content-types";

const SITE = (site.url || "https://thefreelancergate.com").replace(/\/$/, "");

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "X-Content-Type-Options": "nosniff",
      "X-EG-WPJSON": "1",
      ...extraHeaders,
    },
  });
}

function pageUrl(pathOrUrl: string | undefined): string {
  if (!pathOrUrl) return "/";
  if (/^https?:\/\//i.test(pathOrUrl)) {
    try {
      const u = new URL(pathOrUrl);
      if (/(?:^|\.)thefreelancergate\.com$/i.test(u.hostname)) {
        return `${u.pathname}${u.search}` || "/";
      }
    } catch {
      /* fall through */
    }
    return pathOrUrl;
  }
  return pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
}

function mediaUrl(pathOrUrl: string | undefined): string {
  if (!pathOrUrl) return "";
  let p = String(pathOrUrl).trim();
  p = p.replace(/^(?:https?:)?\/\/(?:www\.)?thefreelancergate\.com/i, "");
  p = p.replace(/^https:\//i, "/");
  if (/^https?:\/\//i.test(p)) return p;
  if (!p.startsWith("/")) p = `/${p}`;
  return p;
}

function stripTags(html: string): string {
  return String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toWpDate(iso: string | undefined): string {
  if (!iso) return new Date().toISOString().replace(/\.\d{3}Z$/, "");
  // WP uses "2024-09-14T07:06:29" local-ish without Z
  return iso.replace(/\.\d{3}Z$/, "").replace(/Z$/, "");
}

function mediaStub(post: PostEntry) {
  const src = post.featuredImage || post.seo?.ogImage || "";
  if (!src) return null;
  const url = mediaUrl(src);
  const id = 10_000_000 + (post.id || 0);
  return {
    id,
    date: toWpDate(post.date),
    slug: `media-${post.id}`,
    type: "attachment",
    link: url,
    title: { rendered: stripTags(post.title) },
    author: post.author || 0,
    caption: { rendered: "" },
    alt_text: stripTags(post.title),
    media_type: "image",
    mime_type: "image/jpeg",
    source_url: url,
    media_details: {
      width: 1200,
      height: 675,
      sizes: {
        full: { source_url: url, width: 1200, height: 675 },
        large: { source_url: url, width: 1024, height: 576 },
        medium: { source_url: url, width: 300, height: 169 },
        thumbnail: { source_url: url, width: 150, height: 150 },
      },
    },
  };
}

function mapPost(post: PostEntry, embed: boolean) {
  const link = pageUrl(post.path || `/${post.slug}/`);
  const media = mediaStub(post);
  const cats = getCategories().filter((c) => (post.categories || []).includes(c.id));
  const tags = getTags().filter((t) => (post.tags || []).includes(t.id));
  const titleHtml = post.title?.includes("<") ? post.title : post.title;
  const excerptSrc = post.excerpt || stripTags(post.content || post.bodyHtml || "").slice(0, 180);
  const contentHtml = post.bodyHtml || post.content || "";

  const base: Record<string, unknown> = {
    id: post.id,
    date: toWpDate(post.date),
    date_gmt: toWpDate(post.date),
    guid: { rendered: link },
    modified: toWpDate(post.modified || post.date),
    modified_gmt: toWpDate(post.modified || post.date),
    slug: post.slug,
    status: post.status === "trash" ? "trash" : "publish",
    type: "post",
    link,
    title: { rendered: titleHtml },
    content: { rendered: contentHtml, protected: false },
    excerpt: { rendered: excerptSrc ? `<p>${stripTags(excerptSrc)}</p>` : "", protected: false },
    author: post.author || 1,
    featured_media: media?.id || 0,
    comment_status: "closed",
    ping_status: "closed",
    sticky: false,
    template: "",
    format: "standard",
    meta: [],
    categories: post.categories || [],
    tags: post.tags || [],
    class_list: ["post", `post-${post.id}`, "type-post", "status-publish", "format-standard", "hentry"],
  };

  if (embed) {
    const authorName = post.authorName || site.name || "The Freelancer Gate";
    base._embedded = {
      author: [
        {
          id: post.author || 1,
          name: authorName,
          url: SITE,
          description: "",
          link: `${SITE}/author/`,
          slug: "author",
          avatar_urls: {},
        },
      ],
      "wp:featuredmedia": media ? [media] : [],
      "wp:term": [cats.map(mapTermCategory), tags.map(mapTermTag)],
    };
  }

  return base;
}

function mapTermCategory(c: CategoryEntry) {
  return {
    id: c.id,
    link: pageUrl(c.path || `/category/${c.slug}/`),
    name: c.name,
    slug: c.slug,
    taxonomy: "category",
  };
}

function mapTermTag(t: TagEntry) {
  return {
    id: t.id,
    link: pageUrl(t.path || `/tag/${t.slug}/`),
    name: t.name,
    slug: t.slug,
    taxonomy: "post_tag",
  };
}

function parseListParams(url: URL) {
  const perPage = Math.min(100, Math.max(1, Number(url.searchParams.get("per_page") || 10)));
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const order = (url.searchParams.get("order") || "desc").toLowerCase() === "asc" ? "asc" : "desc";
  const orderby = url.searchParams.get("orderby") || "date";
  const search = (url.searchParams.get("search") || "").trim().toLowerCase();
  const categories = (url.searchParams.get("categories") || "")
    .split(",")
    .map((x) => Number(x.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
  const tags = (url.searchParams.get("tags") || "")
    .split(",")
    .map((x) => Number(x.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
  const include = (url.searchParams.get("include") || "")
    .split(",")
    .map((x) => Number(x.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
  const exclude = (url.searchParams.get("exclude") || "")
    .split(",")
    .map((x) => Number(x.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
  const offset = Math.max(0, Number(url.searchParams.get("offset") || 0));
  const embed =
    url.searchParams.has("_embed") ||
    url.searchParams.get("_embed") === "1" ||
    url.searchParams.get("_embed") === "true";
  return { perPage, page, order, orderby, search, categories, tags, include, exclude, offset, embed };
}

function sortPosts(posts: PostEntry[], orderby: string, order: "asc" | "desc") {
  const dir = order === "asc" ? 1 : -1;
  return [...posts].sort((a, b) => {
    if (orderby === "title") {
      return stripTags(a.title).localeCompare(stripTags(b.title)) * dir;
    }
    if (orderby === "id") return ((a.id || 0) - (b.id || 0)) * dir;
    const ad = Date.parse(a.date || "") || 0;
    const bd = Date.parse(b.date || "") || 0;
    return (ad - bd) * dir;
  });
}

function filterPosts(url: URL): { items: PostEntry[]; total: number; embed: boolean } {
  const p = parseListParams(url);
  let posts = getPosts();
  if (p.include.length) posts = posts.filter((x) => p.include.includes(x.id));
  if (p.exclude.length) posts = posts.filter((x) => !p.exclude.includes(x.id));
  if (p.categories.length) {
    posts = posts.filter((x) => (x.categories || []).some((id) => p.categories.includes(id)));
  }
  if (p.tags.length) {
    posts = posts.filter((x) => (x.tags || []).some((id) => p.tags.includes(id)));
  }
  if (p.search) {
    posts = posts.filter((x) => {
      const hay = `${stripTags(x.title)} ${stripTags(x.excerpt || "")} ${x.slug}`.toLowerCase();
      return hay.includes(p.search);
    });
  }
  posts = sortPosts(posts, p.orderby, p.order);
  const total = posts.length;
  const start = p.offset || (p.page - 1) * p.perPage;
  const items = posts.slice(start, start + p.perPage);
  return { items, total, embed: p.embed };
}

/** Handle /wp-json and /wp-json/... (with or without trailing slash). */
export function handleWpJsonRequest(request: Request): Response | null {
  const url = new URL(request.url);
  let pathname = url.pathname;
  if (!pathname.startsWith("/wp-json")) return null;
  // Normalize
  if (pathname.length > 1 && pathname.endsWith("/")) pathname = pathname.slice(0, -1);

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-WP-Nonce",
      },
    });
  }

  if (!["GET", "HEAD"].includes(request.method)) {
    return json({ code: "rest_no_route", message: "Method not allowed", data: { status: 405 } }, 405);
  }

  if (pathname === "/wp-json") {
    return json({
      name: site.name || "The Freelancer Gate",
      description: site.description || "",
      url: SITE,
      home: SITE,
      namespaces: ["wp/v2"],
      authentication: {},
      routes: {
        "/": { namespace: "", methods: ["GET"] },
        "/wp/v2": { namespace: "wp/v2", methods: ["GET"] },
        "/wp/v2/posts": { namespace: "wp/v2", methods: ["GET"] },
        "/wp/v2/categories": { namespace: "wp/v2", methods: ["GET"] },
        "/wp/v2/tags": { namespace: "wp/v2", methods: ["GET"] },
        "/wp/v2/media": { namespace: "wp/v2", methods: ["GET"] },
      },
    });
  }

  if (pathname === "/wp-json/wp/v2") {
    return json({ namespace: "wp/v2", routes: {} });
  }

  // Posts collection
  if (pathname === "/wp-json/wp/v2/posts") {
    const { items, total, embed } = filterPosts(url);
    const totalPages = Math.max(1, Math.ceil(total / Math.max(1, Number(url.searchParams.get("per_page") || 10))));
    return json(
      items.map((p) => mapPost(p, embed)),
      200,
      {
        "X-WP-Total": String(total),
        "X-WP-TotalPages": String(totalPages),
      },
    );
  }

  // Single post by id
  const postIdMatch = pathname.match(/^\/wp-json\/wp\/v2\/posts\/(\d+)$/);
  if (postIdMatch) {
    const id = Number(postIdMatch[1]);
    const post = getPosts(true).find((p) => p.id === id);
    if (!post) {
      return json({ code: "rest_post_invalid_id", message: "Invalid post ID.", data: { status: 404 } }, 404);
    }
    const embed =
      url.searchParams.has("_embed") ||
      url.searchParams.get("_embed") === "1" ||
      url.searchParams.get("_embed") === "true";
    return json(mapPost(post, embed));
  }

  // Categories
  if (pathname === "/wp-json/wp/v2/categories") {
    const perPage = Math.min(100, Math.max(1, Number(url.searchParams.get("per_page") || 100)));
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const all = getCategories();
    const slice = all.slice((page - 1) * perPage, page * perPage);
    return json(
      slice.map((c) => ({
        id: c.id,
        count: c.count,
        description: c.description || "",
        link: pageUrl(c.path || `/category/${c.slug}/`),
        name: c.name,
        slug: c.slug,
        taxonomy: "category",
        parent: c.parent || 0,
      })),
      200,
      {
        "X-WP-Total": String(all.length),
        "X-WP-TotalPages": String(Math.max(1, Math.ceil(all.length / perPage))),
      },
    );
  }

  // Tags
  if (pathname === "/wp-json/wp/v2/tags") {
    const perPage = Math.min(100, Math.max(1, Number(url.searchParams.get("per_page") || 100)));
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const all = getTags();
    const slice = all.slice((page - 1) * perPage, page * perPage);
    return json(
      slice.map((t) => ({
        id: t.id,
        count: t.count,
        description: t.description || "",
        link: pageUrl(t.path || `/tag/${t.slug}/`),
        name: t.name,
        slug: t.slug,
        taxonomy: "post_tag",
      })),
      200,
      {
        "X-WP-Total": String(all.length),
        "X-WP-TotalPages": String(Math.max(1, Math.ceil(all.length / perPage))),
      },
    );
  }

  // Media list (featured images as attachments)
  if (pathname === "/wp-json/wp/v2/media") {
    const media = getPosts()
      .map((p) => mediaStub(p))
      .filter(Boolean);
    return json(media);
  }

  const mediaIdMatch = pathname.match(/^\/wp-json\/wp\/v2\/media\/(\d+)$/);
  if (mediaIdMatch) {
    const id = Number(mediaIdMatch[1]);
    const post = getPosts().find((p) => 10_000_000 + (p.id || 0) === id);
    const m = post ? mediaStub(post) : null;
    if (!m) {
      return json({ code: "rest_post_invalid_id", message: "Invalid media ID.", data: { status: 404 } }, 404);
    }
    return json(m);
  }

  // CF7 namespace stub (forms still use /api/contact via cf7-bridge)
  if (pathname.startsWith("/wp-json/contact-form-7")) {
    return json({ namespace: "contact-form-7/v1", routes: {} });
  }

  return json(
    {
      code: "rest_no_route",
      message: `No route was found matching the URL and request method (${pathname}).`,
      data: { status: 404 },
    },
    404,
  );
}
