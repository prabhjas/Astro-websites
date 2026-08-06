/**
 * Extract WordPress content + critical assets for MBS Consultancy → Astro.
 *
 * Usage:
 *   node scripts/extract-wp.mjs
 *   node scripts/extract-wp.mjs --skip-assets
 *   node scripts/extract-wp.mjs --limit-pages=20 --limit-posts=20
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CRAWL = path.join(ROOT, "_crawl");
const DATA = path.join(ROOT, "src", "data");
const PUBLIC = path.join(ROOT, "public");
const ORIGIN = "https://mbs-consultancy.com";
const UA = "MBSConsultancy-Astro-Migration/1.0";

const args = process.argv.slice(2);
const skipAssets = args.includes("--skip-assets");
const limitPages = Number(args.find((a) => a.startsWith("--limit-pages="))?.split("=")[1] || 0);
const limitPosts = Number(args.find((a) => a.startsWith("--limit-posts="))?.split("=")[1] || 0);

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "*/*" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

async function fetchAll(endpoint) {
  const items = [];
  let page = 1;
  while (true) {
    const join = endpoint.includes("?") ? "&" : "?";
    const url = `${ORIGIN}/wp-json/wp/v2/${endpoint}${join}per_page=100&page=${page}`;
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
    if (res.status === 400 || res.status === 404) break;
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

async function downloadFile(url, dest) {
  ensureDir(path.dirname(dest));
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return dest;
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) {
      console.warn("skip", res.status, url);
      return null;
    }
    fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
    return dest;
  } catch (e) {
    console.warn("skip", url, e.message);
    return null;
  }
}

function localPathFromWpUrl(url) {
  try {
    const u = new URL(url, ORIGIN);
    if (!u.hostname.includes("mbs-consultancy.com")) return null;
    return path.join(PUBLIC, u.pathname.replace(/^\//, ""));
  } catch {
    return null;
  }
}

function rewriteUrl(url) {
  if (!url) return url;
  return String(url)
    .replaceAll(ORIGIN, "")
    .replaceAll("https://mbs-consultancy.com", "")
    .replaceAll("http://mbs-consultancy.com", "")
    .replaceAll("https://www.mbs-consultancy.com", "")
    .replaceAll("http://www.mbs-consultancy.com", "");
}

function stripDomainInHtml(html) {
  if (!html) return html;
  return html
    .replaceAll("https://www.mbs-consultancy.com", "")
    .replaceAll("http://www.mbs-consultancy.com", "")
    .replaceAll("https://mbs-consultancy.com", "")
    .replaceAll("http://mbs-consultancy.com", "")
    .replaceAll("//mbs-consultancy.com", "")
    .replaceAll("//www.mbs-consultancy.com", "");
}

function pathFromLink(link) {
  const u = new URL(link);
  let p = u.pathname || "/";
  if (p !== "/" && !p.endsWith("/") && !path.extname(p)) p += "/";
  return p;
}

function seoFromYoastOrRank(item) {
  const yoast = item.yoast_head_json || {};
  const rank = item.rank_math || {};
  return {
    title: yoast.title || item.title?.rendered || "",
    description:
      yoast.description ||
      rank.description ||
      item.excerpt?.rendered?.replace(/<[^>]+>/g, "").trim() ||
      "",
    canonical: yoast.canonical || item.link || "",
    ogImage:
      yoast.og_image?.[0]?.url ||
      item._embedded?.["wp:featuredmedia"]?.[0]?.source_url ||
      "",
    robots: yoast.robots || { index: "index", follow: "follow" },
    schemas: yoast.schema ? [yoast.schema] : [],
  };
}

function extractByMarker(html, marker) {
  const idx = html.indexOf(marker);
  if (idx < 0) return "";
  const start = html.lastIndexOf("<", idx);
  let i = start;
  let depth = 0;
  while (i < html.length) {
    if (html[i] === "<") {
      const tagEnd = html.indexOf(">", i);
      if (tagEnd < 0) break;
      const snippet = html.slice(i, tagEnd + 1);
      const selfClosing =
        /\/\s*>$/.test(snippet) ||
        /^<(img|br|hr|input|meta|link|source|area|base|col|embed|wbr)\b/i.test(snippet);
      if (snippet.startsWith("</")) {
        depth--;
        i = tagEnd + 1;
        if (depth === 0) return html.slice(start, i);
        continue;
      } else if (!snippet.startsWith("<!") && !snippet.startsWith("<?")) {
        if (!selfClosing) depth++;
      }
      i = tagEnd + 1;
    } else i++;
  }
  return "";
}

function extractMainContent(html) {
  const markers = [
    'id="page-content"',
    'class="l-main"',
    'data-elementor-type="wp-page"',
    'data-elementor-type="wp-post"',
    'id="main"',
    'role="main"',
  ];
  for (const m of markers) {
    const block = extractByMarker(html, m);
    if (block && block.length > 200) return block;
  }
  const m = html.match(/<main\b[^>]*>[\s\S]*?<\/main>/i);
  return m ? m[0] : "";
}

function collectAssetUrls(html) {
  const urls = new Set();
  if (!html) return urls;
  for (const m of html.matchAll(/(?:src|href)=["']([^"']+)["']/gi)) {
    urls.add(m[1]);
  }
  for (const m of html.matchAll(/url\((['"]?)([^)'"]+)\1\)/gi)) {
    urls.add(m[2]);
  }
  for (const m of html.matchAll(/srcset=["']([^"']+)["']/gi)) {
    for (const part of m[1].split(",")) {
      const u = part.trim().split(/\s+/)[0];
      if (u) urls.add(u);
    }
  }
  return urls;
}

async function downloadReferencedAssets(htmlChunks) {
  const urls = new Set();
  for (const html of htmlChunks) {
    for (const u of collectAssetUrls(html)) urls.add(u);
  }
  let n = 0;
  for (let u of urls) {
    if (!u || u.startsWith("data:") || u.startsWith("#") || u.startsWith("mailto:") || u.startsWith("tel:") || u.startsWith("javascript:")) {
      continue;
    }
    if (u.startsWith("//")) u = `https:${u}`;
    else if (u.startsWith("/")) u = ORIGIN + u;
    if (!u.includes("mbs-consultancy.com")) continue;
    // Strip query/hash; skip page paths & anchors mistaken for assets
    const clean = u.split("#")[0].split("?")[0];
    if (!clean || clean.endsWith("/") || /\.(html?|php)$/i.test(clean)) continue;
    if (!/\.(css|js|mjs|map|woff2?|ttf|otf|eot|svg|png|jpe?g|gif|webp|avif|ico|pdf|mp4|webm|json|xml)$/i.test(clean) && !clean.includes("/wp-content/") && !clean.includes("/wp-includes/")) continue;
    const dest = localPathFromWpUrl(clean);
    if (!dest) continue;
    const ok = await downloadFile(clean, dest);
    if (ok) {
      n++;
      if (n % 50 === 0) console.log(`  assets ${n}`);
    }
  }
  console.log(`Downloaded ${n} referenced assets`);
}

function mapPage(p) {
  return {
    id: p.id,
    type: "page",
    slug: p.slug,
    path: pathFromLink(p.link),
    link: p.link,
    title: p.title?.rendered || "",
    content: stripDomainInHtml(p.content?.rendered || ""),
    excerpt: stripDomainInHtml(p.excerpt?.rendered || ""),
    date: p.date,
    modified: p.modified,
    parent: p.parent,
    menuOrder: p.menu_order,
    featuredImage: p._embedded?.["wp:featuredmedia"]?.[0]?.source_url
      ? rewriteUrl(p._embedded["wp:featuredmedia"][0].source_url)
      : "",
    seo: (() => {
      const s = seoFromYoastOrRank(p);
      return {
        ...s,
        canonical: rewriteUrl(s.canonical),
        ogImage: rewriteUrl(s.ogImage),
      };
    })(),
  };
}

function mapPost(p, type = "post") {
  return {
    id: p.id,
    type,
    slug: p.slug,
    path: pathFromLink(p.link),
    link: p.link,
    title: p.title?.rendered || "",
    content: stripDomainInHtml(p.content?.rendered || ""),
    excerpt: stripDomainInHtml(p.excerpt?.rendered || ""),
    date: p.date,
    modified: p.modified,
    categories: p.categories || [],
    tags: p.tags || [],
    author: p.author,
    authorName: p._embedded?.author?.[0]?.name || "",
    authorSlug: p._embedded?.author?.[0]?.slug || "",
    featuredImage: p._embedded?.["wp:featuredmedia"]?.[0]?.source_url
      ? rewriteUrl(p._embedded["wp:featuredmedia"][0].source_url)
      : "",
    status: "published",
    seo: (() => {
      const s = seoFromYoastOrRank(p);
      return {
        ...s,
        canonical: rewriteUrl(s.canonical),
        ogImage: rewriteUrl(s.ogImage),
      };
    })(),
  };
}

async function downloadElementorCss(ids) {
  const unique = [...new Set([...ids].filter(Boolean))];
  console.log(`Downloading ${unique.length} Elementor CSS files…`);
  for (const id of unique) {
    const cssUrl = `${ORIGIN}/wp-content/uploads/elementor/css/post-${id}.css`;
    const dest = localPathFromWpUrl(cssUrl);
    if (dest) await downloadFile(cssUrl, dest);
  }
}

async function main() {
  ensureDir(CRAWL);
  ensureDir(DATA);
  ensureDir(path.join(PUBLIC, "wp-content", "uploads"));
  ensureDir(path.join(PUBLIC, "media", "signatures"));

  console.log("Fetching WP content…");
  let [pages, posts, categories, tags, users] = await Promise.all([
    fetchAll("pages?_embed=1"),
    fetchAll("posts?_embed=1"),
    fetchAll("categories"),
    fetchAll("tags"),
    fetchAll("users?who=authors").catch(() => []),
  ]);

  // Front page id from WP site settings (page_on_front=298)
  const HOME_ID = 298;
  if (limitPages > 0) {
    const home = pages.find((p) => p.id === HOME_ID);
    pages = pages.filter((p) => p.id !== HOME_ID).slice(0, Math.max(0, limitPages - 1));
    if (home) pages.unshift(home);
  }
  if (limitPosts > 0) posts = posts.slice(0, limitPosts);

  console.log({
    pages: pages.length,
    posts: posts.length,
    categories: categories.length,
    tags: tags.length,
    users: users.length,
  });

  console.log("Fetching homepage HTML…");
  const homeHtml = await fetchText(`${ORIGIN}/?nowprocket=1`);
  fs.writeFileSync(path.join(CRAWL, "homepage.html"), homeHtml);

  const cssUrls = [...homeHtml.matchAll(/(?:href)=["']([^"']+\.css[^"']*)["']/g)].map((m) => m[1]);
  const uniqueCss = [...new Set(cssUrls.map((u) => (u.startsWith("//") ? `https:${u}` : u)))];
  fs.writeFileSync(path.join(CRAWL, "css-urls.txt"), uniqueCss.join("\n"));

  const cssLocal = [];
  if (!skipAssets) {
    for (const cssUrl of uniqueCss) {
      const abs = cssUrl.startsWith("http")
        ? cssUrl
        : cssUrl.startsWith("/")
          ? ORIGIN + cssUrl
          : new URL(cssUrl, ORIGIN).href;
      const dest = localPathFromWpUrl(abs.split("?")[0]);
      if (!dest) continue;
      await downloadFile(abs.split("?")[0], dest);
      cssLocal.push(rewriteUrl(abs.split("?")[0]));
    }

    for (const cssPath of cssLocal) {
      const full = path.join(PUBLIC, cssPath.replace(/^\//, ""));
      if (!fs.existsSync(full)) continue;
      const css = fs.readFileSync(full, "utf8");
      for (const m of css.matchAll(/url\((['"]?)([^)'"]+\.(?:woff2?|ttf|otf|svg|png|jpg|jpeg|gif|webp))\1\)/gi)) {
        let fu = m[2];
        if (fu.startsWith("data:")) continue;
        if (fu.startsWith("//")) fu = `https:${fu}`;
        else if (fu.startsWith("/")) fu = ORIGIN + fu;
        else if (!fu.startsWith("http")) {
          fu = new URL(fu, ORIGIN + path.posix.dirname(cssPath) + "/").href;
        }
        const dest = localPathFromWpUrl(fu.split("?")[0]);
        if (dest) await downloadFile(fu.split("?")[0], dest);
      }
    }
  }

  const headerHtml =
    extractByMarker(homeHtml, "elementor-location-header") ||
    extractByMarker(homeHtml, 'data-elementor-type="header"') ||
    extractByMarker(homeHtml, 'class="l-header') ||
    extractByMarker(homeHtml, 'id="page-header"') ||
    "";
  const footerHtml =
    extractByMarker(homeHtml, "elementor-location-footer") ||
    extractByMarker(homeHtml, 'data-elementor-type="footer"') ||
    extractByMarker(homeHtml, 'class="l-footer') ||
    extractByMarker(homeHtml, 'id="page-footer"') ||
    "";
  fs.writeFileSync(path.join(CRAWL, "header.html"), headerHtml);
  fs.writeFileSync(path.join(CRAWL, "footer.html"), footerHtml);
  fs.writeFileSync(path.join(DATA, "header.html"), stripDomainInHtml(headerHtml) || "<!-- missing header -->\n");
  fs.writeFileSync(path.join(DATA, "footer.html"), stripDomainInHtml(footerHtml) || "<!-- missing footer -->\n");

  // Extract bodyHtml for homepage
  const homeBody = stripDomainInHtml(extractMainContent(homeHtml));

  const pagesData = pages.map((p) => {
    const mapped = mapPage(p);
    if (mapped.path === "/" && homeBody) {
      mapped.bodyHtml = homeBody;
    }
    return mapped;
  });
  const postsData = posts.map((p) => mapPost(p, "post"));

  const authorMap = new Map();
  for (const u of users) {
    if (!u?.slug) continue;
    authorMap.set(u.slug, {
      id: u.id,
      name: u.name,
      slug: u.slug,
      path: `/author/${u.slug}/`,
      description: u.description || "",
      avatar: u.avatar_urls?.["96"] || "",
      link: u.link || "",
    });
  }
  for (const p of posts) {
    const a = p._embedded?.author?.[0];
    if (!a?.slug) continue;
    if (!authorMap.has(a.slug)) {
      authorMap.set(a.slug, {
        id: a.id,
        name: a.name,
        slug: a.slug,
        path: `/author/${a.slug}/`,
        description: a.description || "",
        avatar: a.avatar_urls?.["96"] || "",
      });
    }
  }
  try {
    const authorSm = await fetchText(`${ORIGIN}/author-sitemap.xml`);
    for (const m of authorSm.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)) {
      const u = new URL(m[1].trim());
      const slug = u.pathname.replace(/\/+$/, "").split("/").pop();
      if (!slug || authorMap.has(slug)) continue;
      authorMap.set(slug, {
        id: createHash("sha1").update(slug).digest("hex").slice(0, 8),
        name: slug,
        slug,
        path: `/author/${slug}/`,
        description: "",
        avatar: "",
      });
    }
  } catch (e) {
    console.warn("author sitemap:", e.message);
  }

  const categoriesData = categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    path: `/category/${c.slug}/`,
    description: c.description,
    count: c.count,
    parent: c.parent,
  }));
  const tagsData = tags.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    path: `/tag/${t.slug}/`,
    description: t.description,
    count: t.count,
  }));

  // Contact details from live footer crawl
  const phoneMatch = homeHtml.match(/\+971[\s-]?\d[\d\s-]{6,}/);
  const emailMatch = homeHtml.match(/[a-zA-Z0-9._%+-]+@mbs-consultancy\.com/);

  const site = {
    name: "MBS Consultancy",
    shortName: "MBS",
    url: ORIGIN,
    description:
      "Top business consultants in Dubai, UAE for strategy, audit, immigration, legal, and growth.",
    email: emailMatch?.[0] || "info@mbs-consultancy.com",
    phone: phoneMatch?.[0]?.replace(/\s+/g, " ").trim() || "+971 4331 6688",
    phoneTel: (phoneMatch?.[0] || "+97143316688").replace(/[^\d+]/g, ""),
    logo: "/wp-content/uploads/2026/06/logo-mbs.png",
    address: "P.O. Box: 58526, 8th Floor, City Tower-2, Sheikh Zayed Road, Dubai – UAE",
    social: {
      linkedin: "https://www.linkedin.com/company/mbs-consultancy/",
      facebook: "",
      instagram: "",
    },
    analytics: {
      ga4: "G-ZBM6WBL0ZX",
      gtm: "",
      hotjar: "3535132",
    },
    cssFiles: cssLocal,
    cf7FormIds: ["86", "311"],
  };

  fs.writeFileSync(path.join(DATA, "site.json"), JSON.stringify(site, null, 2));
  fs.writeFileSync(path.join(DATA, "pages.json"), JSON.stringify(pagesData, null, 2));
  fs.writeFileSync(path.join(DATA, "posts.json"), JSON.stringify(postsData, null, 2));
  fs.writeFileSync(path.join(DATA, "categories.json"), JSON.stringify(categoriesData, null, 2));
  fs.writeFileSync(path.join(DATA, "tags.json"), JSON.stringify(tagsData, null, 2));
  fs.writeFileSync(path.join(DATA, "authors.json"), JSON.stringify([...authorMap.values()], null, 2));
  fs.writeFileSync(
    path.join(DATA, "sitemap-urls.json"),
    JSON.stringify(
      {
        pages: pagesData.map((p) => p.path),
        posts: postsData.map((p) => p.path),
        authors: [...authorMap.values()].map((a) => a.path),
        categories: categoriesData.map((c) => c.path),
        tags: tagsData.map((t) => t.path),
      },
      null,
      2,
    ),
  );

  // Inventory report
  fs.writeFileSync(
    path.join(CRAWL, "inventory.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        origin: ORIGIN,
        counts: {
          pages: pagesData.length,
          posts: postsData.length,
          categories: categoriesData.length,
          tags: tagsData.length,
          authors: authorMap.size,
        },
        analytics: site.analytics,
        cf7FormIds: site.cf7FormIds,
        headerBytes: headerHtml.length,
        footerBytes: footerHtml.length,
      },
      null,
      2,
    ),
  );

  if (!skipAssets) {
    const elIds = new Set([
      ...[...homeHtml.matchAll(/elementor\/css\/post-(\d+)\.css/g)].map((m) => Number(m[1])),
      ...pages.map((p) => p.id),
      ...posts.map((p) => p.id),
    ]);
    await downloadElementorCss(elIds);

    console.log("Downloading assets referenced in content + chrome…");
    await downloadReferencedAssets([
      homeHtml,
      headerHtml,
      footerHtml,
      ...pagesData.map((p) => p.content),
      ...postsData.map((p) => p.content),
      ...pagesData.map((p) => p.bodyHtml || ""),
    ]);

    // Common theme/plugin JS needed for Elementor + CF7 chrome
    const criticalJs = [
      "/wp-includes/js/jquery/jquery.min.js",
      "/wp-content/plugins/contact-form-7/includes/js/index.js",
      "/wp-content/plugins/elementor/assets/js/frontend.min.js",
      "/wp-content/plugins/elementor-pro/assets/js/frontend.min.js",
    ];
    for (const rel of criticalJs) {
      await downloadFile(ORIGIN + rel, path.join(PUBLIC, rel.replace(/^\//, "")));
    }
  }

  console.log("Done.");
  console.log("Home path present:", pagesData.some((p) => p.path === "/"));
  console.log("Header bytes:", headerHtml.length, "Footer bytes:", footerHtml.length);
  console.log("Pages:", pagesData.length, "Posts:", postsData.length, "Authors:", authorMap.size);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
