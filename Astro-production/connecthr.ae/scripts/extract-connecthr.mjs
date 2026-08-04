/**
 * Extract Connect HR (connecthr.ae) WordPress content, assets and Elementor CSS
 * for the Astro fleet mirror. Adapted from the SP Heavy extract-wp.mjs pattern.
 *
 * Bilingual (WPML): EN pages come from the default REST language, AR pages from
 * ?lang=ar. Posts + case_studies are EN only. The `users` REST endpoint is 401,
 * so authors are derived from embedded post author data.
 *
 * Writes: src/data/{pages,posts,case-studies,categories,tags,authors,seo,site}.json,
 * src/data/{live-css-order,sitemap-urls}.json, src/data/{header,footer,header.ar,footer.ar}.html
 * Downloads referenced assets (css/js/fonts/images) into public/.
 *
 * Run: node scripts/extract-connecthr.mjs         (full)
 *      SKIP_MEDIA=1 node scripts/extract-connecthr.mjs   (data only, no asset download)
 *      SKIP_SEO=1 ...  (skip per-URL Rank Math HTML fetch; SEO from REST only)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CRAWL = path.join(ROOT, "_crawl");
const DATA = path.join(ROOT, "src", "data");
const PUBLIC = path.join(ROOT, "public");
const ORIGIN = "https://connecthr.ae";
const HOSTS = ["connecthr.ae", "www.connecthr.ae"];
const UA = "ConnectHR-Astro-Migration/1.0 (Connect Group fleet clone)";

const SKIP_MEDIA = process.env.SKIP_MEDIA === "1";
const SKIP_SEO = process.env.SKIP_SEO === "1";

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

async function fetchAll(endpoint, lang) {
  const items = [];
  let page = 1;
  while (true) {
    const sep = endpoint.includes("?") ? "&" : "?";
    const langq = lang ? `&lang=${lang}` : "";
    const url = `${ORIGIN}/wp-json/wp/v2/${endpoint}${sep}per_page=100&page=${page}${langq}`;
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
    if (res.status === 400) break;
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    items.push(...batch);
    const totalPages = Number(res.headers.get("X-WP-TotalPages") || "1");
    if (page >= totalPages) break;
    page += 1;
  }
  return items;
}

/** Bounded-concurrency map */
async function pool(items, size, worker) {
  const results = new Array(items.length);
  let i = 0;
  const runners = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      try {
        results[idx] = await worker(items[idx], idx);
      } catch (e) {
        results[idx] = null;
      }
    }
  });
  await Promise.all(runners);
  return results;
}

function isLocalHost(hostname) {
  return HOSTS.includes(hostname);
}

function localPathFromUrl(url) {
  try {
    const u = new URL(url, ORIGIN);
    if (!isLocalHost(u.hostname)) return null;
    const clean = u.pathname.replace(/^\//, "");
    if (!clean) return null;
    return path.join(PUBLIC, clean);
  } catch {
    return null;
  }
}

let dlOk = 0;
let dlSkip = 0;
async function downloadFile(url) {
  const dest = localPathFromUrl(url);
  if (!dest) return null;
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return dest;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 30000);
    const res = await fetch(url.split("#")[0], { headers: { "User-Agent": UA }, signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) {
      dlSkip++;
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    ensureDir(path.dirname(dest));
    fs.writeFileSync(dest, buf);
    dlOk++;
    return dest;
  } catch {
    dlSkip++;
    return null;
  }
}

function stripDomain(html) {
  if (!html) return html;
  let out = html;
  for (const h of HOSTS) {
    out = out
      .replaceAll(`https://${h}`, "")
      .replaceAll(`http://${h}`, "")
      .replaceAll(`//${h}`, "");
  }
  return out;
}

function rewriteUrl(url) {
  return stripDomain(url || "");
}

function pathFromLink(link) {
  const u = new URL(link);
  let p = u.pathname;
  if (!p.endsWith("/") && !path.extname(p)) p += "/";
  return p;
}

/** Collect asset URLs referenced by an HTML fragment (src, href, srcset, url()) */
function collectAssets(html, set) {
  if (!html) return;
  for (const m of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) pushAsset(m[1], set);
  for (const m of html.matchAll(/srcset=["']([^"']+)["']/g)) {
    for (const part of m[1].split(",")) {
      const u = part.trim().split(/\s+/)[0];
      pushAsset(u, set);
    }
  }
  for (const m of html.matchAll(/url\((['"]?)([^)'"]+)\1\)/g)) pushAsset(m[2], set);
  // Elementor data-settings background urls
  for (const m of html.matchAll(/"url":"([^"]+)"/g)) pushAsset(m[1].replace(/\\\//g, "/"), set);
  // Elementor self-hosted background video (data-settings background_video_link)
  for (const m of html.matchAll(/"background_video_link":"([^"]+)"/g))
    pushAsset(m[1].replace(/\\\//g, "/"), set);
  // Any raw self-hosted video/doc urls under wp-content
  for (const m of html.matchAll(/\/wp-content\/[^"') ]+\.(?:mp4|webm|mov|pdf)/gi)) pushAsset(m[0], set);
}

/** Concatenate all <style> blocks inside <head> (WP Rocket used-CSS, wp-custom-css, global colours, @font-face). */
function extractInlineHeadCss(html) {
  const headEnd = html.indexOf("</head>");
  const head = headEnd > 0 ? html.slice(0, headEnd) : html;
  const blocks = [];
  for (const m of head.matchAll(/<style([^>]*)>([\s\S]*?)<\/style>/gi)) {
    const id = (m[1].match(/id="([^"]+)"/) || [])[1] || "";
    const css = m[2].trim();
    if (!css) continue;
    blocks.push(`/* inline-head${id ? ` #${id}` : ""} */\n${css}`);
  }
  return stripDomain(blocks.join("\n\n"));
}

function pushAsset(raw, set) {
  if (!raw) return;
  let u = raw.trim();
  if (u.startsWith("data:")) return;
  if (u.startsWith("//")) u = `https:${u}`;
  else if (u.startsWith("/")) u = ORIGIN + u;
  try {
    const parsed = new URL(u, ORIGIN);
    if (!isLocalHost(parsed.hostname)) return;
    if (!/\/(wp-content|wp-includes)\//.test(parsed.pathname)) return;
    set.add(parsed.origin + parsed.pathname + (parsed.search || ""));
  } catch {
    /* ignore */
  }
}

/** Crude outer-element extractor by class/attr marker (from SP extract-wp.mjs) */
function extractByClass(html, marker) {
  const idx = html.indexOf(marker);
  if (idx < 0) return "";
  const start = html.lastIndexOf("<", idx);
  let i = start;
  let depth = 0;
  while (i < html.length) {
    if (html.startsWith("<", i) && !html.startsWith("<!", i) && !html.startsWith("<?", i)) {
      const isClose = html.startsWith("</", i);
      const tagEnd = html.indexOf(">", i);
      if (tagEnd < 0) break;
      const selfClosing =
        html[tagEnd - 1] === "/" ||
        /^<(img|br|hr|input|meta|link|source)\b/i.test(html.slice(i, tagEnd + 1));
      if (isClose) {
        depth--;
        i = tagEnd + 1;
        if (depth === 0) return html.slice(start, i);
        continue;
      } else if (!selfClosing) {
        depth++;
      }
      i = tagEnd + 1;
    } else {
      i++;
    }
  }
  return html.slice(start, Math.min(start + 60000, html.length));
}

function seoFromRest(item) {
  const rank = item.rank_math_head || item.rank_math || {};
  return {
    title: item.title?.rendered || "",
    description:
      (item.excerpt?.rendered || "").replace(/<[^>]+>/g, "").trim() || "",
    canonical: rewriteUrl(item.link || ""),
    ogImage: rewriteUrl(
      item._embedded?.["wp:featuredmedia"]?.[0]?.source_url || "",
    ),
    robots: { index: "index", follow: "follow" },
    schemas: [],
  };
}

async function main() {
  ensureDir(CRAWL);
  ensureDir(DATA);
  ensureDir(path.join(PUBLIC, "wp-content", "uploads"));

  console.log("Fetching WP content via REST…");
  const [pagesEn, pagesAr, posts, caseStudies, categories, tags] = await Promise.all([
    fetchAll("pages?_embed=1"),
    fetchAll("pages?_embed=1", "ar"),
    fetchAll("posts?_embed=1"),
    fetchAll("case_studies?_embed=1"),
    fetchAll("categories"),
    fetchAll("tags"),
  ]);
  console.log({
    pagesEn: pagesEn.length,
    pagesAr: pagesAr.length,
    posts: posts.length,
    caseStudies: caseStudies.length,
    categories: categories.length,
    tags: tags.length,
  });

  const assetSet = new Set();

  const mapPage = (p, lang) => {
    const content = stripDomain(p.content?.rendered || "");
    collectAssets(content, assetSet);
    const seo = seoFromRest(p);
    return {
      id: p.id,
      type: "page",
      lang,
      slug: p.slug,
      path: pathFromLink(p.link),
      link: p.link,
      title: p.title?.rendered || "",
      content,
      bodyHtml: content,
      excerpt: stripDomain(p.excerpt?.rendered || ""),
      date: p.date,
      modified: p.modified,
      parent: p.parent || 0,
      menuOrder: p.menu_order || 0,
      featuredImage: rewriteUrl(p._embedded?.["wp:featuredmedia"]?.[0]?.source_url || ""),
      elementorCss: `/wp-content/uploads/elementor/css/post-${p.id}.css`,
      seo,
    };
  };

  const mapPost = (p) => {
    const content = stripDomain(p.content?.rendered || "");
    collectAssets(content, assetSet);
    const seo = seoFromRest(p);
    return {
      id: p.id,
      type: "post",
      lang: "en",
      slug: p.slug,
      path: pathFromLink(p.link),
      link: p.link,
      title: p.title?.rendered || "",
      content,
      bodyHtml: content,
      excerpt: stripDomain(p.excerpt?.rendered || ""),
      date: p.date,
      modified: p.modified,
      categories: p.categories || [],
      tags: p.tags || [],
      author: p.author || 0,
      authorName: p._embedded?.author?.[0]?.name || "Connect HR",
      authorSlug: p._embedded?.author?.[0]?.slug || "connecthr",
      featuredImage: rewriteUrl(p._embedded?.["wp:featuredmedia"]?.[0]?.source_url || ""),
      elementorCss: `/wp-content/uploads/elementor/css/post-${p.id}.css`,
      seo,
    };
  };

  const mapCaseStudy = (p) => {
    const content = stripDomain(p.content?.rendered || "");
    collectAssets(content, assetSet);
    const seo = seoFromRest(p);
    return {
      id: p.id,
      type: "case_study",
      lang: "en",
      slug: p.slug,
      path: pathFromLink(p.link),
      link: p.link,
      title: p.title?.rendered || "",
      content,
      bodyHtml: content,
      excerpt: stripDomain(p.excerpt?.rendered || ""),
      date: p.date,
      modified: p.modified,
      parent: 0,
      menuOrder: 0,
      featuredImage: rewriteUrl(p._embedded?.["wp:featuredmedia"]?.[0]?.source_url || ""),
      elementorCss: `/wp-content/uploads/elementor/css/post-${p.id}.css`,
      seo,
    };
  };

  const pagesData = [...pagesEn.map((p) => mapPage(p, "en")), ...pagesAr.map((p) => mapPage(p, "ar"))];
  const postsData = posts.map(mapPost);
  const caseStudiesData = caseStudies.map(mapCaseStudy);

  const categoriesData = categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    path: `/category/${c.slug}/`,
    description: c.description || "",
    count: c.count || 0,
    parent: c.parent || 0,
  }));
  const tagsData = tags.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    path: `/tag/${t.slug}/`,
    description: t.description || "",
    count: t.count || 0,
  }));

  // Authors from embedded post data (users endpoint = 401)
  const authorMap = new Map();
  for (const p of posts) {
    const a = p._embedded?.author?.[0];
    if (a && a.id && !authorMap.has(a.id)) {
      authorMap.set(a.id, {
        id: a.id,
        name: a.name || "Connect HR",
        slug: a.slug || "connecthr",
        path: `/author/${a.slug || "connecthr"}/`,
        description: a.description || "",
        avatar: rewriteUrl(a.avatar_urls?.["96"] || ""),
      });
    }
  }
  if (authorMap.size === 0) {
    authorMap.set(1, { id: 1, name: "Connect HR", slug: "connecthr", path: "/author/connecthr/", description: "", avatar: "" });
  }
  const authorsData = [...authorMap.values()];

  // --- Homepage (EN + AR) for header/footer + CSS order ---
  console.log("Fetching homepage HTML (EN + AR)…");
  const homeEn = await fetchText(`${ORIGIN}/`);
  fs.writeFileSync(path.join(CRAWL, "homepage.html"), homeEn);
  let homeAr = "";
  try {
    homeAr = await fetchText(`${ORIGIN}/ar/`);
    fs.writeFileSync(path.join(CRAWL, "homepage-ar.html"), homeAr);
  } catch {
    console.warn("no AR homepage");
  }

  // CSS order from EN homepage <link rel=stylesheet>
  const cssUrls = [...homeEn.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi)]
    .map((m) => m[0].match(/href=["']([^"']+)["']/i)?.[1])
    .filter(Boolean)
    .map((u) => (u.startsWith("//") ? `https:${u}` : u));
  const liveCssOrder = [];
  for (const u of cssUrls) {
    const abs = u.startsWith("http") ? u : new URL(u, ORIGIN).href;
    const parsed = new URL(abs, ORIGIN);
    if (!isLocalHost(parsed.hostname)) continue;
    const rel = parsed.pathname; // keep querystring-free path for stable <link>
    if (!liveCssOrder.includes(rel)) liveCssOrder.push(rel);
    assetSet.add(parsed.origin + parsed.pathname);
  }
  fs.writeFileSync(path.join(DATA, "live-css-order.json"), JSON.stringify(liveCssOrder, null, 2));

  // Header/footer (Elementor theme-builder locations)
  const headerEn = extractByClass(homeEn, "elementor-location-header");
  const footerEn = extractByClass(homeEn, "elementor-location-footer");
  collectAssets(headerEn, assetSet);
  collectAssets(footerEn, assetSet);
  fs.writeFileSync(path.join(DATA, "header.html"), stripDomain(headerEn));
  fs.writeFileSync(path.join(DATA, "footer.html"), stripDomain(footerEn));

  let headerAr = headerEn;
  let footerAr = footerEn;
  if (homeAr) {
    const hAr = extractByClass(homeAr, "elementor-location-header");
    const fAr = extractByClass(homeAr, "elementor-location-footer");
    if (hAr) headerAr = hAr;
    if (fAr) footerAr = fAr;
    collectAssets(headerAr, assetSet);
    collectAssets(footerAr, assetSet);
  }
  fs.writeFileSync(path.join(DATA, "header.ar.html"), stripDomain(headerAr));
  fs.writeFileSync(path.join(DATA, "footer.ar.html"), stripDomain(footerAr));

  // Inline <head> CSS (wp-custom-css, global-styles/global colours, custom @font-face,
  // WP Rocket used-CSS). Injected globally by BaseLayout — this is where the accordion/FAQ
  // gradient, counter hover, sticky-bar gradient and footer colours actually live.
  const inlineCssEn = extractInlineHeadCss(homeEn);
  const inlineCssAr = homeAr ? extractInlineHeadCss(homeAr) : inlineCssEn;
  fs.writeFileSync(path.join(DATA, "inline-head.css"), inlineCssEn);
  fs.writeFileSync(path.join(DATA, "inline-head.ar.css"), inlineCssAr);
  // Fonts (@font-face) + background images referenced only from inline CSS (e.g. GeneralSans brand font).
  collectAssets(inlineCssEn, assetSet);
  collectAssets(inlineCssAr, assetSet);

  // featured images
  for (const row of [...pagesData, ...postsData, ...caseStudiesData]) {
    if (row.featuredImage) pushAsset(row.featuredImage, assetSet);
  }

  // --- site.json branding ---
  const logoMatch =
    homeEn.match(/<img[^>]+class="[^"]*(?:logo|site-logo)[^"]*"[^>]+src="([^"]+)"/i)?.[1] ||
    homeEn.match(/wp-content\/uploads\/[^"']*logo[^"']*\.(?:png|webp|svg|jpg)/i)?.[0] ||
    "";
  const faviconMatch =
    homeEn.match(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i)?.[1] || "";
  const site = {
    name: "Connect HR",
    shortName: "Connect HR",
    url: ORIGIN,
    description:
      "Connect HR — cloud HR, payroll and workforce management software for UAE businesses.",
    email: "info@connecthr.ae",
    phone: "",
    phoneTel: "",
    whatsapp: "",
    whatsappUrl: "",
    logo: rewriteUrl(logoMatch.startsWith("http") || logoMatch.startsWith("/") ? logoMatch : `/${logoMatch}`),
    favicon: rewriteUrl(faviconMatch),
    ogImage: "",
    colors: {},
    navigation: [],
    footerServices: [],
    footerQuickLinks: [],
    cssFiles: liveCssOrder,
  };
  if (site.logo) pushAsset(site.logo, assetSet);
  if (site.favicon) pushAsset(site.favicon, assetSet);
  fs.writeFileSync(path.join(DATA, "site.json"), JSON.stringify(site, null, 2));

  // --- per-URL Rank Math SEO (optional; big crawl) ---
  const seoMap = {};
  if (!SKIP_SEO) {
    console.log("Fetching Rank Math SEO from live pages…");
    const seoTargets = [...pagesData, ...postsData, ...caseStudiesData].map((r) => r.path);
    await pool(seoTargets, 8, async (pth) => {
      try {
        const html = await fetchText(ORIGIN + pth);
        const title = html.match(/<title>([^<]*)<\/title>/i)?.[1] || "";
        const desc =
          html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i)?.[1] ||
          html.match(/<meta\s+content=["']([^"']*)["']\s+name=["']description["']/i)?.[1] ||
          "";
        const canonical = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i)?.[1] || "";
        const ogImage = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']*)["']/i)?.[1] || "";
        const robotsRaw = html.match(/<meta\s+name=["']robots["']\s+content=["']([^"']*)["']/i)?.[1] || "";
        const schemas = [...html.matchAll(/<script type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
          .map((m) => {
            try {
              return JSON.parse(m[1]);
            } catch {
              return null;
            }
          })
          .filter(Boolean);
        const robots = robotsRaw
          ? { index: /noindex/i.test(robotsRaw) ? "noindex" : "index", follow: /nofollow/i.test(robotsRaw) ? "nofollow" : "follow" }
          : undefined;
        seoMap[pth] = {
          title: title.replace(/&amp;/g, "&").replace(/&#8211;/g, "–").trim(),
          description: desc,
          canonical: rewriteUrl(canonical),
          ogImage: rewriteUrl(ogImage),
          ...(robots ? { robots } : {}),
          schemas,
        };
        // also capture per-page elementor css hrefs
        for (const m of html.matchAll(/href=["']([^"']*elementor\/css\/[^"']+\.css)[^"']*["']/g)) {
          pushAsset(m[1], assetSet);
        }
      } catch (e) {
        /* skip */
      }
    });
    fs.writeFileSync(path.join(DATA, "seo.json"), JSON.stringify(seoMap, null, 2));

    const merge = (row) => {
      const s = seoMap[row.path];
      if (s) row.seo = { ...row.seo, ...s, schemas: s.schemas?.length ? s.schemas : row.seo.schemas };
    };
    pagesData.forEach(merge);
    postsData.forEach(merge);
    caseStudiesData.forEach(merge);
  }

  // Per-page/post/case-study Elementor CSS + kit/header/footer CSS
  for (const row of [...pagesData, ...postsData, ...caseStudiesData]) {
    assetSet.add(`${ORIGIN}/wp-content/uploads/elementor/css/post-${row.id}.css`);
  }

  // Elementor/theme runtime JS referenced by src/components/ElementorScripts.astro.
  // WP Rocket combines/defers these on the live page so they never appear in the
  // mirrored HTML — add them explicitly so the mirror ships the real frontend JS.
  for (const js of [
    "/wp-includes/js/jquery/jquery.min.js",
    "/wp-includes/js/jquery/jquery-migrate.min.js",
    "/wp-includes/js/jquery/ui/core.min.js",
    "/wp-content/themes/hello-elementor/assets/js/hello-frontend.js",
    "/wp-content/plugins/elementor/assets/js/webpack.runtime.min.js",
    "/wp-content/plugins/elementor/assets/js/frontend-modules.min.js",
    "/wp-content/plugins/elementor/assets/js/frontend.min.js",
    "/wp-content/plugins/elementor-pro/assets/lib/smartmenus/jquery.smartmenus.min.js",
    "/wp-content/plugins/elementor-pro/assets/js/webpack-pro.runtime.min.js",
    "/wp-content/plugins/elementor-pro/assets/js/frontend.min.js",
    "/wp-content/plugins/elementor-pro/assets/js/elements-handlers.min.js",
  ]) {
    assetSet.add(ORIGIN + js);
  }

  fs.writeFileSync(path.join(DATA, "pages.json"), JSON.stringify(pagesData, null, 2));
  fs.writeFileSync(path.join(DATA, "posts.json"), JSON.stringify(postsData, null, 2));
  fs.writeFileSync(path.join(DATA, "case-studies.json"), JSON.stringify(caseStudiesData, null, 2));
  fs.writeFileSync(path.join(DATA, "categories.json"), JSON.stringify(categoriesData, null, 2));
  fs.writeFileSync(path.join(DATA, "tags.json"), JSON.stringify(tagsData, null, 2));
  fs.writeFileSync(path.join(DATA, "authors.json"), JSON.stringify(authorsData, null, 2));

  // --- sitemap-urls.json from live sitemaps (lastmod + reconciliation) ---
  try {
    const idx = await fetchText(`${ORIGIN}/sitemap_index.xml`);
    const childUrls = [...idx.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    const pagesUrls = [];
    const postsUrls = [];
    for (const cu of childUrls) {
      if (/local-sitemap/.test(cu)) continue;
      const xml = await fetchText(cu);
      const locs = [...xml.matchAll(/<url>[\s\S]*?<loc>([^<]+)<\/loc>[\s\S]*?(?:<lastmod>([^<]+)<\/lastmod>)?[\s\S]*?<\/url>/g)]
        .map((m) => ({ path: new URL(m[1]).pathname, lastmod: m[2] || "" }));
      if (/post-sitemap/.test(cu)) postsUrls.push(...locs);
      else pagesUrls.push(...locs); // page + case_studies
    }
    fs.writeFileSync(
      path.join(DATA, "sitemap-urls.json"),
      JSON.stringify({ source: ORIGIN, pages: pagesUrls, posts: postsUrls }, null, 2),
    );
    console.log(`sitemap-urls: ${pagesUrls.length} page-ish, ${postsUrls.length} posts`);
  } catch (e) {
    console.warn("sitemap sync failed:", e.message);
  }

  // --- Download assets ---
  console.log(`Assets referenced: ${assetSet.size}`);
  if (!SKIP_MEDIA) {
    const list = [...assetSet];
    await pool(list, 12, async (u) => downloadFile(u));
    console.log(`Assets downloaded: ${dlOk} ok, ${dlSkip} skipped/missing`);
  } else {
    console.log("SKIP_MEDIA=1 — asset download skipped");
  }

  console.log("Done.", {
    pages: pagesData.length,
    posts: postsData.length,
    caseStudies: caseStudiesData.length,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
