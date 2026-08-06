#!/usr/bin/env node
/**
 * import-live-html.mjs — Fetch live ngmanpower.com pages, extract content,
 * download assets, and rebuild pages.json / posts.json / site.json etc.
 *
 * Usage:  node scripts/import-live-html.mjs
 */

import { load } from "cheerio";
import { writeFileSync, mkdirSync, existsSync, readFileSync, cpSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA = join(ROOT, "src", "data");
const PUBLIC = join(ROOT, "public");

const ORIGIN = "https://ngmanpower.com";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const PAGE_SITEMAP = `${ORIGIN}/page-sitemap.xml`;
const POST_SITEMAP = `${ORIGIN}/post-sitemap.xml`;

const CONCURRENCY = 8;
const FETCH_DELAY_MS = 150;

async function fetchText(url, accept = "*/*") {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: accept },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    clearTimeout(timer);
    return null;
  }
}

async function loadSitemapPaths(sitemapUrl) {
  const xml = await fetchText(sitemapUrl, "application/xml,text/xml,*/*");
  if (!xml || (!xml.includes("<urlset") && !xml.includes("<url>"))) {
    throw new Error(`Failed to load sitemap XML: ${sitemapUrl}`);
  }
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((m) => m[1].trim());
  const paths = [];
  const imageUrls = new Set();
  for (const loc of locs) {
    try {
      const u = new URL(loc);
      if (!u.hostname.includes("ngmanpower.com")) continue;
      if (u.pathname.includes("/wp-content/")) {
        imageUrls.add(u.pathname.split("?")[0]);
        continue;
      }
      paths.push(normPath(u.pathname));
    } catch {
      /* skip */
    }
  }
  // Rank Math also nests image:loc
  for (const m of xml.matchAll(/<image:loc>([^<]+)<\/image:loc>/gi)) {
    try {
      const u = new URL(m[1].trim());
      if (u.hostname.includes("ngmanpower.com") && u.pathname.startsWith("/wp-content/")) {
        imageUrls.add(u.pathname.split("?")[0]);
      }
    } catch {
      /* skip */
    }
  }
  return { paths: [...new Set(paths)], imageUrls };
}

function fixNavTrailingSlashes(html) {
  if (!html) return html;
  return html
    .replace(/href="\/industries"/g, 'href="/industries/"')
    .replace(/href="\/insights"/g, 'href="/insights/"')
    .replace(/href="\/logistics"/g, 'href="/logistics/"')
    .replace(/href="\/food-industry"/g, 'href="/food-industry/"')
    .replace(/href="\/manufacturing"/g, 'href="/manufacturing/"')
    .replace(/href="\/construction"/g, 'href="/construction/"')
    .replace(/href="\/electromechanical"/g, 'href="/electromechanical/"')
    .replace(/href="\/landscaping"/g, 'href="/landscaping/"')
    .replace(/href="\/oil-and-gas"/g, 'href="/oil-and-gas/"')
    .replace(/href="\/factories"/g, 'href="/factories/"')
    .replace(/href="\/warehouse"/g, 'href="/warehouse/"')
    .replace(/href="\/about-us"/g, 'href="/about-us/"')
    .replace(/href="\/contact-us"/g, 'href="/contact-us/"');
}

function normPath(p) {
  if (!p) return "/";
  let s = p.replace(/^https?:\/\/[^/]+/, "");
  if (!s.startsWith("/")) s = "/" + s;
  if (s !== "/" && !s.endsWith("/")) s += "/";
  return s;
}

async function fetchPage(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    // Bypass WP Rocket lazy placeholders so img src is real on import
    const u = new URL(url);
    if (!u.searchParams.has("nowprocket")) u.searchParams.set("nowprocket", "1");
    const res = await fetch(u.toString(), {
      headers: { "User-Agent": UA, Accept: "text/html" },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("text/html")) return null;
    return await res.text();
  } catch {
    clearTimeout(timer);
    return null;
  }
}

async function downloadAsset(url, dest) {
  if (existsSync(dest)) return false;
  mkdirSync(dirname(dest), { recursive: true });
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    const res = await fetch(url, {
      headers: { "User-Agent": UA },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!res.ok) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(dest, buf);
    return true;
  } catch {
    return false;
  }
}

async function runPool(tasks, concurrency) {
  const results = [];
  let idx = 0;
  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker()));
  return results;
}

function extractMeta($) {
  const title =
    $('meta[property="og:title"]').attr("content") ||
    $("title").text().trim() ||
    "";
  const description =
    $('meta[name="description"]').attr("content") ||
    $('meta[property="og:description"]').attr("content") ||
    "";
  const canonical =
    $('link[rel="canonical"]').attr("href") || "";
  const ogImage =
    $('meta[property="og:image"]').attr("content") || "";
  return { title, description, canonical, ogImage };
}

function extractContent($) {
  const selectors = [
    "#page-content",
    ".l-main",
    ".l-canvas .l-main",
    '[data-elementor-type="wp-page"]',
    '[data-elementor-type="wp-post"]',
    "article.post",
    "article",
    ".w-blog",
    ".elementor",
    "main",
    ".l-canvas",
  ];
  for (const sel of selectors) {
    const el = $(sel);
    if (el.length && el.html().trim().length > 100) {
      return el.html().trim();
    }
  }
  const body = $("body");
  return body.html() || "";
}

function extractHeader($) {
  const selectors = [
    "header.l-header",
    "header#l-header",
    ".l-header",
    "header.us_header",
    "header",
  ];
  for (const sel of selectors) {
    const el = $(sel);
    if (el.length) {
      return $.html(el).trim();
    }
  }
  return "";
}

function extractFooter($) {
  const selectors = [
    "footer.l-footer",
    "footer#l-footer",
    ".l-footer",
    "footer.us_footer",
    "footer",
  ];
  for (const sel of selectors) {
    const el = $(sel);
    if (el.length) {
      return $.html(el).trim();
    }
  }
  return "";
}

function rewriteUrls(html) {
  if (!html) return html;
  return html
    .replace(new RegExp(`https?://(?:www\\.)?ngmanpower\\.com/`, "g"), "/")
    .replace(new RegExp(`https?://(?:www\\.)?ngmanpower\\.com`, "g"), "");
}

function extractStylesheets($) {
  const hrefs = [];
  $('link[rel="stylesheet"]').each((_, el) => {
    const href = $(el).attr("href") || "";
    if (href) {
      const cleaned = href
        .replace(/^https?:\/\/(?:www\.)?ngmanpower\.com/, "")
        .split("?")[0];
      if (
        cleaned.startsWith("/wp-content/") ||
        cleaned.startsWith("/wp-includes/")
      ) {
        hrefs.push(cleaned);
      }
    }
  });
  return hrefs;
}

function collectAssetUrls(html) {
  const urls = new Set();
  const patterns = [
    /(?:href|src|srcset)="(\/wp-content\/[^"\s,]+)"/g,
    /(?:href|src|srcset)="(\/wp-includes\/[^"\s,]+)"/g,
    /(?:href|src)="(https?:\/\/(?:www\.)?ngmanpower\.com\/wp-content\/[^"\s]+)"/g,
    /(?:href|src)="(https?:\/\/(?:www\.)?ngmanpower\.com\/wp-includes\/[^"\s]+)"/g,
    /url\(['"]?(\/wp-content\/[^'")]+)['"]?\)/g,
    /url\(['"]?(\/wp-includes\/[^'")]+)['"]?\)/g,
    /,\s*(\/wp-content\/[^\s,]+)/g,
  ];
  for (const pat of patterns) {
    let m;
    while ((m = pat.exec(html))) {
      let u = m[1].replace(/^https?:\/\/(?:www\.)?ngmanpower\.com/, "").split("?")[0];
      if (u.startsWith("/wp-content/") || u.startsWith("/wp-includes/")) {
        urls.add(u);
      }
    }
  }
  return urls;
}

function discoverLinks($) {
  const links = new Set();
  $("a[href]").each((_, el) => {
    let href = $(el).attr("href") || "";
    if (href.startsWith("//")) href = "https:" + href;
    if (href.startsWith(ORIGIN)) href = href.slice(ORIGIN.length);
    if (href.startsWith("https://www.ngmanpower.com"))
      href = href.slice("https://www.ngmanpower.com".length);
    if (!href.startsWith("/")) return;
    if (href.includes("#") || href.includes("?")) href = href.split(/[#?]/)[0];
    if (/\.(pdf|jpg|jpeg|png|webp|gif|svg|css|js|xml|zip)$/i.test(href)) return;
    if (href.startsWith("/wp-")) return;
    const path = normPath(href);
    if (path.startsWith("/tag/") || path.startsWith("/author/") || path.startsWith("/category/")) return;
    if (path === "/feed/" || path === "/xmlrpc.php/") return;
    links.add(path);
  });
  return links;
}

function isPostPath(path) {
  const postPatterns = [
    /\/types-of-contract/,
    /\/in-house-hiring/,
    /\/increasing-demand/,
    /\/working-hours/,
    /\/article-\d+/,
    /\/outsourced-staff/,
    /-uae\//,
    /-dubai\//,
    /-law\//,
    /-labor\//,
    /-hiring\//,
  ];
  const pagePatterns = [
    /^\/$/, /^\/about/, /^\/contact/, /^\/insights\/$/, /^\/industries\//,
    /^\/construction\//, /^\/electromechanical\//, /^\/factories\//,
    /^\/food-industry\//, /^\/landscaping\//, /^\/logistics\//,
    /^\/manufacturing\//, /^\/oil-and-gas\//, /^\/warehouse\//,
    /^\/services\//, /^\/privacy-policy\//, /^\/terms/,
    /^\/free-zones\//, /^\/pro-services\//, /^\/locations\//,
    /^\/categories\//, /^\/set-up-remotely\//, /^\/refer-a-friend\//,
    /^\/review\//, /^\/ads-page\//,
  ];
  if (pagePatterns.some((p) => p.test(path))) return false;
  if (postPatterns.some((p) => p.test(path))) return true;
  const depth = path.replace(/^\/|\/$/g, "").split("/").length;
  return depth === 1;
}

function extractExcerpt(html) {
  if (!html) return "";
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const words = text.split(" ").slice(0, 35);
  return `<p>${words.join(" ")}${words.length >= 35 ? " [&hellip;]" : ""}</p>`;
}

function extractContactInfo($, html) {
  const phoneMatch = html.match(/(\+971[\s\d-]{8,})/);
  const emailMatch = html.match(/([\w.-]+@ngmanpower\.com)/);
  return {
    phone: phoneMatch ? phoneMatch[1].replace(/\s+/g, " ").trim() : "",
    email: emailMatch ? emailMatch[1] : "",
  };
}

function extractNavLinks($) {
  const nav = [];
  const seen = new Set();
  const navEls = $("nav .w-nav-list > .w-nav-item > a, nav .menu-item > a, header nav a, .w-nav a.w-nav-anchor");
  navEls.each((_, el) => {
    let href = $(el).attr("href") || "";
    const label = $(el).text().trim();
    if (!label || !href) return;
    href = href.replace(/^https?:\/\/(?:www\.)?ngmanpower\.com/, "");
    if (!href.startsWith("/")) return;
    href = normPath(href.split(/[#?]/)[0]);
    if (seen.has(href)) return;
    seen.add(href);
    if (href.startsWith("/wp-") || href === "/feed/") return;
    nav.push({ label, href });
  });
  return nav.length > 0 ? nav : null;
}

function extractLogos($) {
  const logos = [];
  $("img").each((_, el) => {
    const src = $(el).attr("src") || "";
    if (/logo.*ng.*manpower|ng.*manpower.*logo|cropped-logo-NG/i.test(src)) {
      const cleaned = src.replace(/^https?:\/\/(?:www\.)?ngmanpower\.com/, "");
      if (!logos.includes(cleaned)) logos.push(cleaned);
    }
  });
  return logos;
}

// ---------- Main ----------

async function main() {
  console.log("=== NG Manpower Live HTML Import (full sitemaps) ===\n");

  console.log("Loading Rank Math sitemaps...");
  const pageSm = await loadSitemapPaths(PAGE_SITEMAP);
  const postSm = await loadSitemapPaths(POST_SITEMAP);
  console.log(`Page sitemap: ${pageSm.paths.length} URLs`);
  console.log(`Post sitemap: ${postSm.paths.length} URLs`);

  console.log("\nFetching homepage...");
  const homeHtml = await fetchPage(ORIGIN + "/");
  if (!homeHtml) {
    console.error("FATAL: Cannot fetch homepage. Aborting.");
    process.exit(1);
  }
  const $home = load(homeHtml);

  const navLinks = extractNavLinks($home);
  console.log(`Nav links: ${navLinks ? navLinks.length : 0}`);
  const logos = extractLogos($home);
  console.log(`Logos found: ${logos.join(", ") || "none"}`);
  const contactInfo = extractContactInfo($home, homeHtml);
  console.log(`Phone: ${contactInfo.phone}, Email: ${contactInfo.email}`);

  const pageQueue = new Set(pageSm.paths);
  const postQueue = new Set(postSm.paths.filter((p) => !pageQueue.has(p)));

  console.log(`\nQueue: ${pageQueue.size} pages, ${postQueue.size} posts\n`);

  // Phase 2: Fetch all pages
  const allUrls = [...pageQueue, ...postQueue];
  const fetched = new Map();
  const failed = [];
  let fetchCount = 0;

  console.log("Fetching pages...");
  for (const path of allUrls) {
    fetchCount++;
    if (fetchCount % 10 === 0 || fetchCount === 1) {
      console.log(`  [${fetchCount}/${allUrls.length}] ${path}`);
    }
    const html = path === "/" ? homeHtml : await fetchPage(ORIGIN + path);
    if (html) {
      fetched.set(path, html);
    } else {
      failed.push(path);
      console.log(`  SKIP (404/error): ${path}`);
    }
    if (path !== "/" && fetchCount < allUrls.length) {
      await new Promise((r) => setTimeout(r, FETCH_DELAY_MS));
    }
  }

  console.log(`\nFetched: ${fetched.size} pages, Failed: ${failed.length}`);

  // Phase 3: Extract stylesheets from homepage for live-css-order
  const homeCss = extractStylesheets($home);
  console.log(`Homepage stylesheets: ${homeCss.length}`);

  // Phase 4: Build pages.json and posts.json
  const pages = [];
  const posts = [];
  let pageId = 100001;
  let postId = 200001;
  const allAssetUrls = new Set([...pageSm.imageUrls, ...postSm.imageUrls]);

  // Process homepage header and footer
  let headerHtml = fixNavTrailingSlashes(extractHeader($home));
  const footerHtml = extractFooter($home);

  for (const [path, html] of fetched.entries()) {
    const $ = load(html);
    const meta = extractMeta($);
    const contentHtml = rewriteUrls(extractContent($));
    const pageCss = extractStylesheets($);
    const slug = path.replace(/^\/|\/$/g, "") || "homepage";

    const canonicalRaw = meta.canonical
      ? meta.canonical.replace(/^https?:\/\/(?:www\.)?ngmanpower\.com/, "")
      : path;
    const canonical = normPath(canonicalRaw);

    let ogImageClean = meta.ogImage
      ? meta.ogImage.replace(/^https?:\/\/(?:www\.)?ngmanpower\.com/, "")
      : "";

    for (const assetUrl of collectAssetUrls(html)) {
      allAssetUrls.add(assetUrl);
    }

    const isPost = postQueue.has(path);
    const entry = {
      id: isPost ? postId++ : pageId++,
      type: isPost ? "post" : "page",
      ...(isPost ? {} : { wpType: "page" }),
      slug: slug.includes("/") ? slug.split("/").pop() : slug,
      path,
      link: `${ORIGIN}${path}`,
      title: meta.title.replace(/\s*[-–|].*$/, "") || slug.replace(/-/g, " "),
      content: contentHtml,
      bodyHtml: contentHtml,
      excerpt: extractExcerpt(contentHtml),
      date: new Date().toISOString().replace("Z", ""),
      modified: new Date().toISOString().replace("Z", ""),
      ...(isPost
        ? {
            categories: [],
            tags: [],
            author: 1,
            authorName: "NG Manpower",
            authorSlug: "ng-manpower",
            featuredImage: ogImageClean || "",
            status: "published",
          }
        : {}),
      elementorCss: pageCss.find((h) => /\/elementor\/css\/post-\d+/.test(h)) || "",
      pageCss: pageCss.filter((h) => !/\/elementor\/css\/post-\d+/.test(h)),
      seo: {
        title: meta.title || slug.replace(/-/g, " "),
        description: meta.description,
        canonical,
        ogImage: ogImageClean,
        robots: { index: "index", follow: "follow" },
        schemas: [],
      },
    };

    if (isPost) {
      posts.push(entry);
    } else {
      pages.push(entry);
    }
  }

  // Sort: homepage first for pages
  pages.sort((a, b) => (a.path === "/" ? -1 : b.path === "/" ? 1 : a.path.localeCompare(b.path)));
  posts.sort((a, b) => a.path.localeCompare(b.path));

  console.log(`\nBuilt: ${pages.length} page entries, ${posts.length} post entries`);

  // Phase 5: Write JSON files
  writeFileSync(join(DATA, "pages.json"), JSON.stringify(pages, null, 2));
  console.log("Wrote pages.json");

  writeFileSync(join(DATA, "posts.json"), JSON.stringify(posts, null, 2));
  console.log("Wrote posts.json");

  writeFileSync(join(DATA, "live-css-order.json"), JSON.stringify(homeCss, null, 2));
  console.log("Wrote live-css-order.json");

  // Phase 6: Update site.json
  const siteJsonPath = join(DATA, "site.json");
  let siteJson = {};
  try {
    siteJson = JSON.parse(readFileSync(siteJsonPath, "utf8"));
  } catch { /* fresh */ }

  siteJson.name = "NG Manpower";
  siteJson.shortName = "NGManpower";
  siteJson.url = ORIGIN;
  siteJson.description = "Manpower outsourcing, staffing solutions & workforce management in the UAE.";
  siteJson.email = contactInfo.email || "contact@ngmanpower.com";
  siteJson.phone = contactInfo.phone || "+971 43 316 688";
  siteJson.phoneTel = (contactInfo.phone || "+97143316688").replace(/[\s-]/g, "");
  siteJson.whatsapp = siteJson.phoneTel;
  siteJson.whatsappUrl = `https://wa.me/${siteJson.phoneTel.replace("+", "")}`;

  if (logos.length > 0) {
    siteJson.logo = logos[0];
  }

  if (navLinks && navLinks.length > 0) {
    siteJson.navigation = navLinks.map((n) => ({
      ...n,
      href: normPath(n.href),
    }));
  }

  siteJson.cssFiles = homeCss;
  siteJson.colors = siteJson.colors || {
    primary: "#0557CF",
    secondary: "#00C5F9",
    text: "#333333",
    accent: "#0557CF",
    white: "#FFFFFF",
  };

  writeFileSync(siteJsonPath, JSON.stringify(siteJson, null, 2));
  console.log("Wrote site.json");

  // Phase 7: Write header.html and footer.html
  if (headerHtml) {
    writeFileSync(join(DATA, "header.html"), rewriteUrls(headerHtml));
    console.log("Wrote header.html (industries dropdown trailing slashes fixed)");
  } else {
    console.log("WARNING: Could not extract header from homepage");
  }

  if (footerHtml) {
    writeFileSync(join(DATA, "footer.html"), rewriteUrls(footerHtml));
    console.log("Wrote footer.html");
  } else {
    console.log("WARNING: Could not extract footer from homepage");
  }

  // Phase 8: Download assets
  console.log(`\nCollecting asset URLs from ${fetched.size} pages...`);
  for (const [, html] of fetched.entries()) {
    for (const u of collectAssetUrls(html)) allAssetUrls.add(u);
  }
  if (headerHtml) for (const u of collectAssetUrls(headerHtml)) allAssetUrls.add(u);
  if (footerHtml) for (const u of collectAssetUrls(footerHtml)) allAssetUrls.add(u);

  const assetList = [...allAssetUrls].filter(
    (u) => !u.includes("?") && !u.endsWith("/")
  );
  console.log(`Total unique assets to check: ${assetList.length}`);

  let downloaded = 0;
  let skipped = 0;
  let assetFailed = 0;

  const downloadTasks = assetList.map((assetPath) => async () => {
    const dest = join(PUBLIC, assetPath.replace(/^\//, ""));
    if (existsSync(dest)) {
      skipped++;
      return;
    }
    const url = ORIGIN + assetPath;
    const ok = await downloadAsset(url, dest);
    if (ok) {
      downloaded++;
    } else {
      assetFailed++;
    }
    await new Promise((r) => setTimeout(r, 50));
  });

  await runPool(downloadTasks, CONCURRENCY);
  console.log(`Assets: ${downloaded} downloaded, ${skipped} existed, ${assetFailed} failed`);

  // Phase 8b: Try to copy Impreza theme from kinzahr if available
  const kinzahrImpreza = join(ROOT, "..", "kinzahr.com", "public", "wp-content", "themes", "Impreza");
  const kinzahrImpresaChild = join(ROOT, "..", "kinzahr.com", "public", "wp-content", "themes", "Impreza-child");
  const localImpreza = join(PUBLIC, "wp-content", "themes", "Impreza");
  const localImpresaChild = join(PUBLIC, "wp-content", "themes", "Impreza-child");

  if (existsSync(kinzahrImpreza) && !existsSync(localImpreza)) {
    try {
      cpSync(kinzahrImpreza, localImpreza, { recursive: true });
      console.log("Copied Impreza theme from kinzahr.com");
    } catch (e) {
      console.log(`Could not copy Impreza from kinzahr: ${e.message}`);
    }
  }
  if (existsSync(kinzahrImpresaChild) && !existsSync(localImpresaChild)) {
    try {
      cpSync(kinzahrImpresaChild, localImpresaChild, { recursive: true });
      console.log("Copied Impreza-child theme from kinzahr.com");
    } catch (e) {
      console.log(`Could not copy Impreza-child from kinzahr: ${e.message}`);
    }
  }

  // Summary
  console.log("\n=== IMPORT COMPLETE ===");
  console.log(`Pages imported: ${pages.length}`);
  console.log(`Posts imported: ${posts.length}`);
  console.log(`Assets: ${downloaded} new, ${skipped} existed, ${assetFailed} failed`);
  console.log(`Failed URLs: ${failed.length > 0 ? failed.join(", ") : "none"}`);

  return { pages, posts, downloaded, skipped, assetFailed, failed };
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
