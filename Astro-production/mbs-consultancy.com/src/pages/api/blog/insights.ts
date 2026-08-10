import type { APIRoute } from "astro";
import {
  getCategories,
  getPosts,
  isRealPublicAsset,
  normalizePath,
  paginate,
  stripHtml,
} from "../../../lib/content";
import type { PostEntry } from "../../../lib/content-types";

function listingThumbnail(post: PostEntry): string {
  const candidates = [post.featuredImage, post.seo?.ogImage].filter(
    (u): u is string => typeof u === "string" && u.length > 0,
  );
  for (const href of candidates) {
    let pathOnly = href;
    if (href.startsWith("http://") || href.startsWith("https://")) {
      try {
        pathOnly = new URL(href).pathname;
      } catch {
        continue;
      }
    }
    if (pathOnly.startsWith("/") && isRealPublicAsset(pathOnly)) return pathOnly;
  }
  return "/wp-content/uploads/2024/11/testimonial1.png";
}

export const prerender = false;

function decodeEntities(value: string): string {
  return value
    .replace(/&#038;|&amp;/g, "&")
    .replace(/&#8217;|&rsquo;/g, "’")
    .replace(/&#8216;|&lsquo;/g, "‘")
    .replace(/&#8220;|&ldquo;/g, "“")
    .replace(/&#8221;|&rdquo;/g, "”")
    .replace(/&#8211;|&ndash;/g, "–")
    .replace(/&#8212;|&mdash;/g, "—")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      return Number.isFinite(code) ? String.fromCharCode(code) : _;
    });
}

function formatListingDate(date: string): string {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function primaryCategory(post: { categories: number[] }): { name: string; slug: string } {
  const cats = getCategories();
  for (const id of post.categories) {
    const hit = cats.find((c) => c.id === id);
    if (hit) return { name: hit.name, slug: hit.slug };
  }
  return { name: "Uncategorized", slug: "uncategorized" };
}

function paginationHtml(page: number, totalPages: number): string {
  if (totalPages <= 1) return "";
  const parts: string[] = ['<div class="nav-links">'];
  for (let i = 1; i <= totalPages; i++) {
    if (i === page) {
      parts.push(`<span aria-current="page" class="page-numbers current">${i}</span>`);
    } else {
      parts.push(`<a class="page-numbers" href="#">${i}</a>`);
    }
  }
  parts.push("</div>");
  return parts.join("");
}

function buildPayload(category: string, page: number, postsPerPage: number) {
  const cat = (category || "all").toLowerCase().trim();
  let sorted = [...getPosts()].sort((a, b) => +new Date(b.date) - +new Date(a.date));

  if (cat && cat !== "all") {
    const match = getCategories().find((c) => c.slug === cat);
    if (match) {
      sorted = sorted.filter((p) => p.categories.includes(match.id));
    } else {
      sorted = [];
    }
  }

  const slice = paginate(sorted, page, postsPerPage);
  const posts = slice.items.map((p) => {
    const c = primaryCategory(p);
    const href = normalizePath(p.path);
    const excerpt = stripHtml(p.excerpt || p.content || "").slice(0, 160);
    return {
      id: p.id,
      title: decodeEntities(stripHtml(p.title)),
      link: href.endsWith("/") ? href : `${href}/`,
      thumbnail: listingThumbnail(p),
      date: formatListingDate(p.date),
      category: c.name,
      excerpt: excerpt ? `${decodeEntities(excerpt)}${excerpt.length >= 160 ? "…" : ""}` : "",
    };
  });

  return {
    posts,
    pagination: paginationHtml(slice.page, slice.totalPages),
    total: slice.total,
    totalPages: slice.totalPages,
    page: slice.page,
  };
}

async function readParams(request: Request, url: URL) {
  let category = url.searchParams.get("category") || "all";
  let page = Number(url.searchParams.get("page") || "1") || 1;
  let postsPerPage = Number(url.searchParams.get("posts_per_page") || "10") || 10;

  if (request.method === "POST") {
    const ct = request.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      category = String(body.category ?? category);
      page = Number(body.page ?? page) || 1;
      postsPerPage = Number(body.posts_per_page ?? postsPerPage) || 10;
    } else {
      const form = await request.formData().catch(() => null);
      if (form) {
        category = String(form.get("category") || category);
        page = Number(form.get("page") || page) || 1;
        postsPerPage = Number(form.get("posts_per_page") || postsPerPage) || 10;
      }
    }
  }

  return {
    category,
    page: Math.max(1, page),
    postsPerPage: Math.min(24, Math.max(1, postsPerPage)),
  };
}

export const GET: APIRoute = async ({ request, url }) => {
  const { category, page, postsPerPage } = await readParams(request, url);
  const payload = buildPayload(category, page, postsPerPage);
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=60",
    },
  });
};

export const POST: APIRoute = async ({ request, url }) => {
  const { category, page, postsPerPage } = await readParams(request, url);
  const payload = buildPayload(category, page, postsPerPage);
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=60",
    },
  });
};
