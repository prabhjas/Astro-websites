/**
 * Discover WPML ES/RU pages on live IberiaEOR and refresh bodies into src/data.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ORIGIN = "https://iberiaeor.com";
const DATA = path.join(ROOT, "src", "data");
const UA = "IberiaEOR-Astro/1.0";

async function fetchText(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html,*/*" } });
  return { status: res.status, text: await res.text(), ok: res.ok };
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  if (!res.ok) return { status: res.status, data: null };
  return { status: res.status, data: await res.json() };
}

function normalizePath(p) {
  if (!p || p === "/") return "/";
  let out = p.startsWith("/") ? p : `/${p}`;
  if (!out.endsWith("/")) out += "/";
  return out;
}

function pathFromLink(link) {
  try {
    const u = new URL(link, ORIGIN);
    if (u.searchParams.has("page_id")) {
      return normalizePath(u.pathname) + `?page_id=${u.searchParams.get("page_id")}`;
    }
    return normalizePath(u.pathname + (u.search || ""));
  } catch {
    return normalizePath(link);
  }
}

function extractBody(html) {
  const $ = cheerio.load(html);
  const main =
    $('[data-elementor-type="wp-page"]').first() ||
    $('[data-elementor-type="wp-post"]').first() ||
    $("main .elementor").first() ||
    $("main").first();
  if (!main.length) return "";
  return $.html(main);
}

function extractSeo(html, fallbackTitle = "") {
  const $ = cheerio.load(html);
  const title = $("title").first().text().trim() || fallbackTitle;
  const description =
    $('meta[name="description"]').attr("content") ||
    $('meta[property="og:description"]').attr("content") ||
    "";
  const canonical = $('link[rel="canonical"]').attr("href") || "";
  const ogImage = $('meta[property="og:image"]').attr("content") || "";
  return {
    title,
    description,
    canonical: canonical.replace(ORIGIN, "") || undefined,
    ogImage: ogImage.replace(ORIGIN, "") || undefined,
    schemas: [],
  };
}

function rewriteHtml(html) {
  return String(html || "")
    .replaceAll("https://dev.iberiaeor.com", "")
    .replaceAll("http://dev.iberiaeor.com", "")
    .replaceAll("https://iberiaeor.com", "")
    .replaceAll("http://iberiaeor.com", "")
    .replaceAll("https://www.iberiaeor.com", "")
    .replaceAll("http://www.iberiaeor.com", "");
}

async function fetchAllLangPages(lang) {
  const items = [];
  let page = 1;
  while (true) {
    const url = `${ORIGIN}/wp-json/wp/v2/pages?lang=${lang}&per_page=100&page=${page}&_embed=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
    if (!res.ok) break;
    const batch = await res.json();
    if (!Array.isArray(batch) || !batch.length) break;
    items.push(...batch);
    const totalPages = Number(res.headers.get("X-WP-TotalPages") || "1");
    if (page >= totalPages) break;
    page += 1;
  }
  return items;
}

async function discoverFromHomepageHreflang() {
  const { text } = await fetchText(`${ORIGIN}/?nowprocket=1`);
  const links = [];
  for (const m of text.matchAll(
    /hreflang=["'](es|ru|en)["'][^>]*href=["']([^"']+)["']/gi,
  )) {
    links.push({ lang: m[1].toLowerCase(), href: m[2] });
  }
  for (const m of text.matchAll(
    /href=["']([^"']+)["'][^>]*hreflang=["'](es|ru|en)["']/gi,
  )) {
    links.push({ lang: m[2].toLowerCase(), href: m[1] });
  }
  return links;
}

async function main() {
  const pagesPath = path.join(DATA, "pages.json");
  const bodiesPath = path.join(DATA, "bodies.json");
  const pages = JSON.parse(fs.readFileSync(pagesPath, "utf8"));
  const bodies = JSON.parse(fs.readFileSync(bodiesPath, "utf8"));

  console.log("Fetching WPML REST pages…");
  const [esPages, ruPages] = await Promise.all([
    fetchAllLangPages("es"),
    fetchAllLangPages("ru"),
  ]);
  console.log({ esRest: esPages.length, ruRest: ruPages.length });

  const hreflang = await discoverFromHomepageHreflang();
  console.log("homepage hreflang", hreflang);

  /** @type {Array<{lang:string, path:string, fetchUrl:string, title?:string, id?:number}>} */
  const targets = [];

  for (const p of [...esPages, ...ruPages]) {
    const link = p.link || "";
    const lang = link.includes("/ru/") || link.includes("lang=ru") ? "ru" : "es";
    let fetchUrl = link.includes("?") ? `${link}&nowprocket=1` : `${link}?nowprocket=1`;
    // Prefer clean path when available
    try {
      const u = new URL(link);
      if (u.searchParams.has("page_id")) {
        fetchUrl = `${ORIGIN}${u.pathname}?page_id=${u.searchParams.get("page_id")}&nowprocket=1`;
      }
    } catch {
      /* ignore */
    }
    targets.push({
      lang,
      path: pathFromLink(link),
      fetchUrl,
      title: p.title?.rendered,
      id: p.id,
    });
  }

  // Always include homepage translation page_ids from hreflang / known IDs
  const knownHomes = [
    { lang: "es", path: "/es/", fetchUrl: `${ORIGIN}/es/?page_id=3775&nowprocket=1`, id: 3775 },
    { lang: "ru", path: "/ru/", fetchUrl: `${ORIGIN}/ru/?page_id=3774&nowprocket=1`, id: 3774 },
  ];
  for (const h of hreflang.filter((x) => x.lang === "es" || x.lang === "ru")) {
    knownHomes.push({
      lang: h.lang,
      path: pathFromLink(h.href),
      fetchUrl: h.href.includes("?")
        ? `${h.href}&nowprocket=1`
        : `${h.href}?nowprocket=1`,
    });
  }

  for (const k of knownHomes) {
    if (!targets.some((t) => t.path === k.path || t.id === k.id)) targets.push(k);
  }

  // Also refresh already-known lang paths in pages.json
  for (const p of pages.filter((x) => /^\/(es|ru)(\/|$)/.test(x.path))) {
    if (!targets.some((t) => t.path === p.path)) {
      targets.push({
        lang: p.path.startsWith("/ru") ? "ru" : "es",
        path: p.path,
        fetchUrl: `${ORIGIN}${p.path}?nowprocket=1`,
        id: p.id,
        title: p.title,
      });
    }
  }

  // Deduplicate by path
  const byPath = new Map();
  for (const t of targets) byPath.set(t.path, t);
  const list = [...byPath.values()];
  console.log("targets", list.map((t) => t.path));

  let updated = 0;
  let failed = 0;
  for (const t of list) {
    const { status, text, ok } = await fetchText(t.fetchUrl);
    const title = (text.match(/<title>([^<]+)/i) || [])[1] || "";
    if (!ok || /page not found/i.test(title) || status === 404) {
      // Try alternate page_id form for homes
      console.warn("skip", status, t.path, title.slice(0, 60));
      failed += 1;
      continue;
    }
    const bodyHtml = rewriteHtml(extractBody(text));
    if (!bodyHtml || bodyHtml.length < 200) {
      console.warn("thin body", t.path, bodyHtml.length);
      failed += 1;
      continue;
    }
    const seo = extractSeo(text, t.title || "");
    seo.canonical = seo.canonical || t.path;

    const existingIdx = pages.findIndex((p) => p.path === t.path);
    const entry = {
      id: t.id || (existingIdx >= 0 ? pages[existingIdx].id : 0),
      type: "page",
      path: t.path.startsWith("/es/") || t.path === "/es/" ? t.path : t.path,
      slug: t.path.replace(/^\/|\/$/g, "").split("/").pop() || t.lang,
      title: t.title || seo.title.replace(/\s*\|.*$/, "").trim(),
      content: bodyHtml,
      bodyHtml,
      excerpt: "",
      date: new Date().toISOString(),
      modified: new Date().toISOString(),
      categories: [],
      tags: [],
      author: 0,
      authorName: "",
      authorSlug: "",
      featuredImage: "",
      status: "published",
      elementorCss: t.id
        ? `/wp-content/uploads/elementor/css/post-${t.id}.css`
        : "",
      lang: t.lang,
      seo: {
        ...seo,
        title: seo.title,
        description: seo.description,
      },
      pageCss: [],
    };

    // Prefer clean language home paths
    if (t.path.includes("page_id=3775")) entry.path = "/es/";
    if (t.path.includes("page_id=3774")) entry.path = "/ru/";

    const idx = pages.findIndex((p) => p.path === entry.path);
    if (idx >= 0) pages[idx] = { ...pages[idx], ...entry, bodyHtml, content: bodyHtml, seo: entry.seo, lang: t.lang };
    else pages.push(entry);

    bodies[entry.path] = bodyHtml;
    updated += 1;
    console.log("ok", entry.path, "body", bodyHtml.length, "title", entry.seo.title.slice(0, 70));

    // Download page CSS if present
    if (entry.elementorCss) {
      const dest = path.join(ROOT, "public", entry.elementorCss.replace(/^\//, ""));
      if (!fs.existsSync(dest) || fs.statSync(dest).size < 20) {
        const cssRes = await fetch(ORIGIN + entry.elementorCss, {
          headers: { "User-Agent": UA },
        });
        if (cssRes.ok) {
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          fs.writeFileSync(dest, Buffer.from(await cssRes.arrayBuffer()));
        }
      }
    }
  }

  fs.writeFileSync(pagesPath, JSON.stringify(pages, null, 2));
  fs.writeFileSync(bodiesPath, JSON.stringify(bodies, null, 2));
  console.log(JSON.stringify({ updated, failed, totalPages: pages.length }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
