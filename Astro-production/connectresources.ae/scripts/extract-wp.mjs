/**
 * Extract WordPress content + critical assets for Connect Resources → Astro.
 *
 * Usage (from site dir or via pnpm --filter):
 *   node scripts/extract-wp.mjs
 *   node scripts/extract-wp.mjs --skip-assets
 *   node scripts/extract-wp.mjs --limit-pages=20 --limit-posts=20
 *
 * Does NOT download the full media library (~7.8k). Downloads:
 * - homepage CSS / fonts / chrome assets
 * - Elementor post-{id}.css for each content item
 * - images referenced in content HTML
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
const ORIGIN = "https://connectresources.ae";
const UA = "ConnectResources-Astro-Migration/1.0";

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
    if (!u.hostname.includes("connectresources.ae")) return null;
    return path.join(PUBLIC, u.pathname.replace(/^\//, ""));
  } catch {
    return null;
  }
}

function rewriteUrl(url) {
  if (!url) return url;
  return String(url)
    .replaceAll(ORIGIN, "")
    .replaceAll("https://connectresources.ae", "")
    .replaceAll("http://connectresources.ae", "")
    .replaceAll("https://www.connectresources.ae", "")
    .replaceAll("http://www.connectresources.ae", "");
}

function stripDomainInHtml(html) {
  if (!html) return html;
  return html
    .replaceAll("https://www.connectresources.ae", "")
    .replaceAll("http://www.connectresources.ae", "")
    .replaceAll("https://connectresources.ae", "")
    .replaceAll("http://connectresources.ae", "")
    .replaceAll("//connectresources.ae", "")
    .replaceAll("//www.connectresources.ae", "");
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

function collectAssetUrls(html) {
  const urls = new Set();
  if (!html) return urls;
  for (const m of html.matchAll(/(?:src|href)=["']([^"']+)["']/gi)) {
    urls.add(m[1]);
  }
  for (const m of html.matchAll(/url\((['"]?)([^)'"]+)\1\)/gi)) {
    urls.add(m[2]);
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
    if (!u || u.startsWith("data:") || u.startsWith("#") || u.startsWith("mailto:") || u.startsWith("tel:")) {
      continue;
    }
    if (u.startsWith("//")) u = `https:${u}`;
    else if (u.startsWith("/")) u = ORIGIN + u;
    if (!u.includes("connectresources.ae")) continue;
    // Skip HTML pages
    const clean = u.split("?")[0];
    if (/\.(html?|php)$/i.test(clean) || clean.endsWith("/")) continue;
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

async function main() {
  ensureDir(CRAWL);
  ensureDir(DATA);
  ensureDir(path.join(PUBLIC, "wp-content", "uploads"));

  console.log("Fetching WP content…");
  let [pages, posts, guides, press, categories, tags] = await Promise.all([
    fetchAll("pages?_embed=1"),
    fetchAll("posts?_embed=1"),
    fetchAll("guides?_embed=1"),
    fetchAll("press-release?_embed=1"),
    fetchAll("categories"),
    fetchAll("tags"),
  ]);

  if (limitPages > 0) {
    // Always keep front page 54471
    const home = pages.find((p) => p.id === 54471);
    pages = pages.filter((p) => p.id !== 54471).slice(0, Math.max(0, limitPages - 1));
    if (home) pages.unshift(home);
  }
  if (limitPosts > 0) {
    posts = posts.slice(0, limitPosts);
    guides = guides.slice(0, Math.min(guides.length, Math.ceil(limitPosts / 4)));
    press = press.slice(0, Math.min(press.length, 15));
  }

  console.log({
    pages: pages.length,
    posts: posts.length,
    guides: guides.length,
    press: press.length,
    categories: categories.length,
    tags: tags.length,
  });

  console.log("Fetching homepage HTML…");
  const homeHtml = await fetchText(`${ORIGIN}/`);
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

    // Fonts referenced from CSS
    for (const cssPath of cssLocal) {
      const full = path.join(PUBLIC, cssPath.replace(/^\//, ""));
      if (!fs.existsSync(full)) continue;
      const css = fs.readFileSync(full, "utf8");
      for (const m of css.matchAll(/url\((['"]?)([^)'"]+\.(?:woff2?|ttf|otf))\1\)/gi)) {
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
    "";
  const footerHtml =
    extractByMarker(homeHtml, "elementor-location-footer") ||
    extractByMarker(homeHtml, 'data-elementor-type="footer"') ||
    "";
  fs.writeFileSync(path.join(CRAWL, "header.html"), headerHtml);
  fs.writeFileSync(path.join(CRAWL, "footer.html"), footerHtml);
  fs.writeFileSync(path.join(DATA, "header.html"), stripDomainInHtml(headerHtml) || "<!-- missing header -->\n");
  fs.writeFileSync(path.join(DATA, "footer.html"), stripDomainInHtml(footerHtml) || "<!-- missing footer -->\n");

  const pagesData = pages.map(mapPage);
  const postsData = [
    ...posts.map((p) => mapPost(p, "post")),
    ...guides.map((p) => mapPost(p, "guides")),
    ...press.map((p) => mapPost(p, "press-release")),
  ];

  // Authors from embeds + author sitemap
  const authorMap = new Map();
  for (const p of [...posts, ...guides, ...press]) {
    const a = p._embedded?.author?.[0];
    if (!a?.slug) continue;
    authorMap.set(a.slug, {
      id: a.id,
      name: a.name,
      slug: a.slug,
      path: `/author/${a.slug}/`,
      description: a.description || "",
      avatar: a.avatar_urls?.["96"] || "",
    });
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

  // Preserve navigation from existing site.json if present
  let existingSite = {};
  try {
    existingSite = JSON.parse(fs.readFileSync(path.join(DATA, "site.json"), "utf8"));
  } catch {
    /* ok */
  }

  const site = {
    ...existingSite,
    name: "Connect Resources",
    shortName: "Connect Resources",
    url: ORIGIN,
    description:
      "Leading staff outsourcing, EOR, PEO & contract staffing company in Dubai, UAE. Official alliance of Randstad in UAE.",
    email: existingSite.email || "info@connectresources.ae",
    phone: existingSite.phone || "+971 43316688",
    phoneTel: existingSite.phoneTel || "+97143316688",
    logo:
      existingSite.logo ||
      "/wp-content/uploads/2017/07/Logo-Connect-Resources-Intense-red-1-1-e1761843890948.png",
    cssFiles: cssLocal,
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
        guides: postsData.filter((p) => p.type === "guides").map((p) => p.path),
        pressRelease: postsData.filter((p) => p.type === "press-release").map((p) => p.path),
      },
      null,
      2,
    ),
  );

  if (!skipAssets) {
    // CR is Impreza/VC — only fetch Elementor CSS IDs actually linked from homepage HTML
    const elIds = new Set(
      [...homeHtml.matchAll(/elementor\/css\/post-(\d+)\.css/g)].map((m) => Number(m[1])),
    );
    if (elIds.size) {
      console.log(`Downloading ${elIds.size} Elementor CSS files referenced on homepage…`);
      for (const id of elIds) {
        const cssUrl = `${ORIGIN}/wp-content/uploads/elementor/css/post-${id}.css`;
        const dest = localPathFromWpUrl(cssUrl);
        if (dest) await downloadFile(cssUrl, dest);
      }
    }

    console.log("Downloading assets referenced in content + chrome…");
    await downloadReferencedAssets([
      homeHtml,
      headerHtml,
      footerHtml,
      ...pagesData.map((p) => p.content),
      ...postsData.map((p) => p.content),
    ]);
  }

  console.log("Done.");
  console.log("Home path present:", pagesData.some((p) => p.path === "/"));
  console.log("Pages:", pagesData.length, "Posts+CPT:", postsData.length, "Authors:", authorMap.size);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
