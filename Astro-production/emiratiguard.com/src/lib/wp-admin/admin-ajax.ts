/**
 * WordPress admin-ajax shim — Advanced Post Block uses action=apbPosts (not REST).
 */
import { getCategories, getPosts, site } from "../content";
import type { PostEntry } from "../content-types";

const SITE = (site.url || "https://emiratiguard.com").replace(/\/$/, "");

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-EG-AdminAjax": "1",
    },
  });
}

function text(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "X-EG-AdminAjax": "1" },
  });
}

function stripTags(html: string): string {
  return String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Page/canonical links may stay absolute; media must stay site-relative. */
function pageUrl(pathOrUrl: string | undefined): string {
  if (!pathOrUrl) return `${SITE}/`;
  if (/^https?:\/\//i.test(pathOrUrl)) {
    try {
      const u = new URL(pathOrUrl);
      if (/(?:^|\.)emiratiguard\.com$/i.test(u.hostname)) {
        return `${u.pathname}${u.search}`.replace(/\/$/, "") || "/";
      }
    } catch {
      /* fall through */
    }
    return pathOrUrl.replace(/\/$/, "");
  }
  const p = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return p.replace(/\/$/, "") || "/";
}

function mediaUrl(pathOrUrl: string | undefined): string {
  if (!pathOrUrl) return "";
  let p = String(pathOrUrl).trim();
  p = p.replace(/^(?:https?:)?\/\/(?:www\.)?emiratiguard\.com/i, "");
  p = p.replace(/^https:\//i, "/");
  if (/^https?:\/\//i.test(p)) return p; // external non-EG
  if (!p.startsWith("/")) p = `/${p}`;
  return p;
}

function formatDisplayDate(iso: string | undefined): string {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatWpMysql(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).replace("T", " ").replace(/\.\d{3}Z?$/, "").replace(/Z$/, "");
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

function boolish(v: unknown, fallback = false): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(s)) return true;
    if (["0", "false", "no", "off", ""].includes(s)) return false;
  }
  return fallback;
}

function numish(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

type QueryAttr = Record<string, unknown>;

function collectQueryAttr(form: FormData): QueryAttr {
  const direct = form.get("queryAttr");
  if (typeof direct === "string" && direct.trim()) {
    try {
      const parsed = JSON.parse(direct);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as QueryAttr;
      }
    } catch {
      /* nested fields below */
    }
  }

  const out: QueryAttr = {};
  for (const [key, value] of form.entries()) {
    const m = /^queryAttr\[([^\]]+)\]$/.exec(key);
    if (!m) continue;
    const field = m[1];
    if (typeof value !== "string") continue;
    if (out[field] === undefined) out[field] = value;
    else if (Array.isArray(out[field])) (out[field] as unknown[]).push(value);
    else out[field] = [out[field], value];
  }
  return out;
}

function mapApbPost(post: PostEntry) {
  const cats = getCategories().filter((c) => (post.categories || []).includes(c.id));
  const catLinks = cats
    .map((c) => {
      const href = pageUrl(c.path || `/category/${c.slug}/`);
      return `<a href="${href}" rel="category tag">${stripTags(c.name)}</a>`;
    })
    .join(", ");
  const catSpace = cats
    .map((c) => {
      const href = pageUrl(c.path || `/category/${c.slug}/`);
      return `<a href="${href}" rel="category tag">${stripTags(c.name)}</a>`;
    })
    .join(" ");

  const thumbSrc = post.featuredImage || post.seo?.ogImage || "";
  const authorName = stripTags(post.authorName || "") || site.name || "Emirati Guard";
  const authorSlug = post.authorSlug || "author";

  return {
    id: post.id,
    link: pageUrl(post.link || post.path || `/${post.slug}/`),
    name: post.slug,
    thumbnail: thumbSrc
      ? {
          url: mediaUrl(thumbSrc),
          alt: stripTags(post.title) || "",
        }
      : { url: "", alt: "" },
    title: stripTags(post.title),
    postMeta: [] as unknown[],
    author: {
      name: authorName,
      link: pageUrl(`/author/${authorSlug}/`),
    },
    rawDate: formatWpMysql(post.date),
    date: formatDisplayDate(post.date),
    dateGMT: formatWpMysql(post.date),
    modifiedDate: formatWpMysql(post.modified || post.date),
    modifiedDateGMT: formatWpMysql(post.modified || post.date),
    commentCount: "0",
    commentStatus: "closed",
    categories: {
      coma: catLinks,
      space: catSpace || catLinks,
    },
    taxonomies: { post_tag: "" },
    status: "publish",
    excerpt: "",
    content: "",
  };
}

function handleApbPosts(form: FormData): Response {
  const qa = collectQueryAttr(form);
  const pageNumber = Math.max(1, numish(form.get("pageNumber") ?? qa.pageNumber, 1));
  const order = String(qa.postsOrder || "desc").toLowerCase() === "asc" ? "asc" : "desc";
  const orderby = String(qa.postsOrderBy || "date");
  // Blog block has isPostsPerPageAll=true — return the full set.
  const perPage = boolish(qa.isPostsPerPageAll, false)
    ? 500
    : Math.min(100, Math.max(1, numish(qa.postsPerPage, 12)));
  const offset = Math.max(0, numish(qa.postsOffset, 0));
  const search = String(qa.postsSearch || "").trim().toLowerCase();

  const include = String(qa.postsInclude || "")
    .split(",")
    .map((x) => Number(String(x).trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
  const exclude = String(qa.postsExclude || "")
    .split(",")
    .map((x) => Number(String(x).trim()))
    .filter((n) => Number.isFinite(n) && n > 0);

  let posts = getPosts();

  if (include.length) posts = posts.filter((p) => include.includes(p.id));
  if (exclude.length) posts = posts.filter((p) => !exclude.includes(p.id));
  if (search) {
    posts = posts.filter((p) => {
      const hay = `${stripTags(p.title)} ${stripTags(p.excerpt || "")} ${p.slug}`.toLowerCase();
      return hay.includes(search);
    });
  }

  posts = [...posts].sort((a, b) => {
    const dir = order === "asc" ? 1 : -1;
    if (orderby === "title") return stripTags(a.title).localeCompare(stripTags(b.title)) * dir;
    if (orderby === "id") return ((a.id || 0) - (b.id || 0)) * dir;
    const ad = Date.parse(a.date || "") || 0;
    const bd = Date.parse(b.date || "") || 0;
    return (ad - bd) * dir;
  });

  const totalPosts = posts.length;
  const start = offset || (pageNumber - 1) * perPage;
  const pageItems = posts.slice(start, start + perPage);

  return json({
    success: true,
    data: {
      posts: pageItems.map(mapApbPost),
      totalPosts,
    },
  });
}

function isAdminAjaxPath(pathname: string): boolean {
  const p = pathname.endsWith("/") && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
  return p === "/wp-admin/admin-ajax.php";
}

/** Intercept /wp-admin/admin-ajax.php (bypasses Astro checkOrigin 403 on form POST). */
export async function handleAdminAjaxRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  if (!isAdminAjaxPath(url.pathname)) return null;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Requested-With",
      },
    });
  }

  if (!["GET", "POST"].includes(request.method)) {
    return text("0", 405);
  }

  let form: FormData;
  try {
    if (request.method === "GET") {
      form = new FormData();
      url.searchParams.forEach((v, k) => form.append(k, v));
    } else {
      const ct = request.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const body = (await request.json()) as Record<string, unknown>;
        form = new FormData();
        for (const [k, v] of Object.entries(body || {})) {
          if (v == null) continue;
          form.append(k, typeof v === "string" ? v : JSON.stringify(v));
        }
      } else {
        form = await request.formData();
      }
    }
  } catch {
    return text("0");
  }

  const action = String(form.get("action") || url.searchParams.get("action") || "");
  if (action === "apbPosts") {
    return handleApbPosts(form);
  }

  // Unknown WP ajax actions — classic WP empty failure body
  return text("0");
}
