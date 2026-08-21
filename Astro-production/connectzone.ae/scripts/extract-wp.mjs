/**
 * Extract WordPress content, assets, and Elementor CSS for Astro migration.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CRAWL = path.join(ROOT, "_crawl");
const DATA = path.join(ROOT, "src", "data");
const PUBLIC = path.join(ROOT, "public");
const ORIGIN = "";

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "ConnectZone-Astro-Migration/1.0" },
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "ConnectZone-Astro-Migration/1.0", Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return { data: await res.json(), headers: res.headers };
}

async function fetchAll(endpoint) {
  const items = [];
  let page = 1;
  while (true) {
    const url = `${ORIGIN}/wp-json/wp/v2/${endpoint}${endpoint.includes("?") ? "&" : "?"}per_page=100&page=${page}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "ConnectZone-Astro-Migration/1.0", Accept: "application/json" },
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

async function downloadFile(url, dest) {
  ensureDir(path.dirname(dest));
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return dest;
  const res = await fetch(url, { headers: { "User-Agent": "ConnectZone-Astro-Migration/1.0" } });
  if (!res.ok) {
    console.warn("skip", res.status, url);
    return null;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return dest;
}

function localPathFromWpUrl(url) {
  try {
    const u = new URL(url, ORIGIN);
    if (!u.hostname.includes("connectzone.ae")) return null;
    return path.join(PUBLIC, u.pathname.replace(/^\//, ""));
  } catch {
    return null;
  }
}

function rewriteUrl(url) {
  if (!url) return url;
  return url.replaceAll(ORIGIN, "").replaceAll("", "");
}

function stripDomainInHtml(html) {
  if (!html) return html;
  return html
    .replaceAll("", "")
    .replaceAll("", "")
    .replaceAll("//connectzone.ae", "");
}

function pathFromLink(link) {
  const u = new URL(link);
  let p = u.pathname;
  if (!p.endsWith("/") && !path.extname(p)) p += "/";
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
    schema: yoast.schema || null,
  };
}

async function main() {
  ensureDir(CRAWL);
  ensureDir(DATA);
  ensureDir(path.join(PUBLIC, "wp-content", "uploads"));
  ensureDir(path.join(PUBLIC, "fonts"));

  console.log("Fetching WP content…");
  const softFetchAll = async (endpoint) => {
    try {
      return await fetchAll(endpoint);
    } catch (err) {
      console.warn(`soft-fail ${endpoint}:`, err.message || err);
      return [];
    }
  };
  const [pages, posts, categories, tags, users, media] = await Promise.all([
    fetchAll("pages?_embed=1"),
    fetchAll("posts?_embed=1"),
    softFetchAll("categories"),
    softFetchAll("tags"),
    softFetchAll("users"),
    softFetchAll("media"),
  ]);

  console.log({
    pages: pages.length,
    posts: posts.length,
    categories: categories.length,
    tags: tags.length,
    users: users.length,
    media: media.length,
  });

  // Homepage HTML for header/footer/CSS discovery
  console.log("Fetching homepage HTML…");
  const homeHtml = await fetchText(`${ORIGIN}/`);
  fs.writeFileSync(path.join(CRAWL, "homepage.html"), homeHtml);

  const cssUrls = [...homeHtml.matchAll(/(?:href)=["']([^"']+\.css[^"']*)["']/g)].map((m) => m[1]);
  const uniqueCss = [...new Set(cssUrls.map((u) => (u.startsWith("//") ? `https:${u}` : u)))];
  fs.writeFileSync(path.join(CRAWL, "css-urls.txt"), uniqueCss.join("\n"));

  // Download critical CSS into public
  const cssLocal = [];
  for (const cssUrl of uniqueCss) {
    const abs = cssUrl.startsWith("http") ? cssUrl : new URL(cssUrl, ORIGIN).href;
    const dest = localPathFromWpUrl(abs);
    if (!dest) continue;
    await downloadFile(abs, dest);
    cssLocal.push(rewriteUrl(abs));
  }

  // Fonts
  const fontUrls = [
    `${ORIGIN}/wp-content/uploads/2025/06/SFPRODISPLAYREGULAR.woff`,
    `${ORIGIN}/wp-content/uploads/elementor/google-fonts/fonts/bebasneue-jtusjig69ck48gw7pxoo9wlhyw.woff2`,
  ];
  // Try to find more font files referenced
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
      fontUrls.push(fu);
    }
  }
  for (const fu of [...new Set(fontUrls)]) {
    const dest = localPathFromWpUrl(fu);
    if (dest) await downloadFile(fu, dest);
  }

  // Logo / favicon / key images
  const keyAssets = [
    `${ORIGIN}/wp-content/uploads/2025/06/logo@2x.webp`,
    `${ORIGIN}/wp-content/uploads/2025/06/logo.svg`,
    `${ORIGIN}/wp-content/uploads/2026/01/output-onlinepngtools-Picsart-BackgroundChanger-150x150.png`,
    `${ORIGIN}/wp-content/uploads/2026/01/output-onlinepngtools-Picsart-BackgroundChanger-e1767787044178.png`,
    `${ORIGIN}/wp-content/uploads/2026/01/PHOTO-2026-01-07-10-35-07.jpg`,
  ];
  for (const a of keyAssets) {
    const dest = localPathFromWpUrl(a);
    if (dest) await downloadFile(a, dest);
  }

  // Download all media files (may take a while)
  const skipMedia = process.env.SKIP_MEDIA === "1";
  console.log(skipMedia ? "Skipping media download (SKIP_MEDIA=1)…" : "Downloading media…");
  let mediaCount = 0;
  for (const m of skipMedia ? [] : media) {
    const src = m.source_url;
    if (!src) continue;
    const dest = localPathFromWpUrl(src);
    if (!dest) continue;
    await downloadFile(src, dest);
    mediaCount++;
    // also medium/large sizes if present
    for (const size of Object.values(m.media_details?.sizes || {})) {
      if (size.source_url) {
        const d = localPathFromWpUrl(size.source_url);
        if (d) await downloadFile(size.source_url, d);
      }
    }
    if (mediaCount % 20 === 0) console.log(`  media ${mediaCount}/${media.length}`);
  }

  // Extract header & footer HTML from homepage (Elementor theme builder)
  function extractByClass(html, className) {
    const idx = html.indexOf(className);
    if (idx < 0) return "";
    // find opening tag start
    const start = html.lastIndexOf("<", idx);
    // crude depth walk for the outer element
    let i = start;
    let depth = 0;
    let tagStart = -1;
    while (i < html.length) {
      if (html.startsWith("<", i) && !html.startsWith("<!", i) && !html.startsWith("<?", i)) {
        const isClose = html.startsWith("</", i);
        const tagEnd = html.indexOf(">", i);
        if (tagEnd < 0) break;
        const selfClosing = html[tagEnd - 1] === "/" || /^<(img|br|hr|input|meta|link|source)\b/i.test(html.slice(i, tagEnd + 1));
        if (isClose) {
          depth--;
          i = tagEnd + 1;
          if (depth === 0) return html.slice(start, i);
          continue;
        } else if (!selfClosing) {
          if (depth === 0) tagStart = i;
          depth++;
        }
        i = tagEnd + 1;
      } else {
        i++;
      }
    }
    return html.slice(start, Math.min(start + 50000, html.length));
  }

  const headerHtml = extractByClass(homeHtml, "elementor-location-header") || extractByClass(homeHtml, 'data-elementor-id="153"');
  const footerHtml = extractByClass(homeHtml, "elementor-location-footer") || extractByClass(homeHtml, 'data-elementor-id="158"');

  fs.writeFileSync(path.join(CRAWL, "header.html"), headerHtml);
  fs.writeFileSync(path.join(CRAWL, "footer.html"), footerHtml);

  // Normalize content items
  const mapPage = (p) => ({
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
  });

  const mapPost = (p) => ({
    id: p.id,
    type: "post",
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
    seo: (() => {
      const s = seoFromYoastOrRank(p);
      return {
        ...s,
        canonical: rewriteUrl(s.canonical),
        ogImage: rewriteUrl(s.ogImage),
      };
    })(),
  });

  const pagesData = pages.map(mapPage);
  const postsData = posts.map(mapPost);
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
  const authorsFromUsers = users.map((u) => ({
    id: u.id,
    name: u.name,
    slug: u.slug,
    path: `/author/${u.slug}/`,
    description: u.description,
    avatar: u.avatar_urls?.["96"] || "",
  }));
  const authorsFromPosts = [];
  const seenAuthors = new Set(authorsFromUsers.map((a) => a.id));
  for (const p of posts) {
    const a = p._embedded?.author?.[0];
    if (!a?.id || seenAuthors.has(a.id)) continue;
    seenAuthors.add(a.id);
    authorsFromPosts.push({
      id: a.id,
      name: a.name || "",
      slug: a.slug || String(a.id),
      path: `/author/${a.slug || a.id}/`,
      description: a.description || "",
      avatar: a.avatar_urls?.["96"] || "",
    });
  }
  const authorsData = [...authorsFromUsers, ...authorsFromPosts];

  const site = {
    name: "Connect Zone",
    shortName: "Connect Zone",
    url: "",
    description:
      "Business setup, company formation, free zone and mainland licensing services in the UAE.",
    email: "info@connectzone.ae",
    phone: "+971 43316688",
    phoneTel: "+97143316688",
    whatsapp: "+971504018624",
    whatsappUrl: "https://wa.me/971504018624?text=Hello",
    logo: "/wp-content/uploads/2025/06/logo@2x.webp",
    logoSvg: "/wp-content/uploads/2025/06/logo.svg",
    ogImage: "/wp-content/uploads/2026/01/PHOTO-2026-01-07-10-35-07.jpg",
    favicon: "/wp-content/themes/jupiterx/lib/favicon.ico",
    appleTouchIcon:
      "/wp-content/uploads/2026/01/output-onlinepngtools-Picsart-BackgroundChanger-e1767787044178.png",
    colors: {
      primary: "#000000",
      secondary: "#54595F",
      text: "#767676",
      accent: "#DF790D",
      yellow: "#FFDD04",
      white: "#FFFFFF",
    },
    navigation: [
      { label: "Home", href: "/" },
      {
        label: "Services",
        href: "/services/",
        children: [
          {
            label: "Heavy Machinery Rental",
            href: "/heavy-machinery-rental/",
            children: [{ label: "Forklift Rental", href: "/heavy-machinery-rental/forklift-rental/" }],
          },
          { label: "Construction Equipment Rental", href: "/construction-equipment-rental/" },
          { label: "Generator Rental", href: "/generator-rental/" },
          { label: "Scaffold Rental", href: "/scaffold-rental/" },
        ],
      },
      { label: "About us", href: "/about-us/" },
      { label: "Blog", href: "/blog/" },
      { label: "Contact us", href: "/contact-us/" },
    ],
    footerServices: [
      { label: "Generator Rental", href: "/generator-rental/" },
      { label: "Heavy Machinery Rental", href: "/heavy-machinery-rental/" },
      { label: "Construction Equipment Rental", href: "/construction-equipment-rental/" },
      { label: "Scaffold Rental", href: "/scaffold-rental/" },
    ],
    footerQuickLinks: [
      { label: "Blog", href: "/blog/" },
      { label: "About us", href: "/about-us/" },
      { label: "Contact us", href: "/contact-us/" },
    ],
    cssFiles: cssLocal,
    headerHtml: stripDomainInHtml(headerHtml),
    footerHtml: stripDomainInHtml(footerHtml),
  };

  fs.writeFileSync(path.join(DATA, "site.json"), JSON.stringify(site, null, 2));
  fs.writeFileSync(path.join(DATA, "pages.json"), JSON.stringify(pagesData, null, 2));
  fs.writeFileSync(path.join(DATA, "posts.json"), JSON.stringify(postsData, null, 2));
  fs.writeFileSync(path.join(DATA, "categories.json"), JSON.stringify(categoriesData, null, 2));
  fs.writeFileSync(path.join(DATA, "tags.json"), JSON.stringify(tagsData, null, 2));
  fs.writeFileSync(path.join(DATA, "authors.json"), JSON.stringify(authorsData, null, 2));

  // Per-page Elementor CSS (post-{id}.css)
  console.log("Downloading Elementor post CSS…");
  for (const p of [...pages, ...posts]) {
    const cssUrl = `${ORIGIN}/wp-content/uploads/elementor/css/post-${p.id}.css`;
    const dest = localPathFromWpUrl(cssUrl);
    if (dest) await downloadFile(cssUrl, dest);
  }
  // header/footer/kit
  for (const id of [153, 158, 19, 10]) {
    const cssUrl = `${ORIGIN}/wp-content/uploads/elementor/css/post-${id}.css`;
    const dest = localPathFromWpUrl(cssUrl);
    if (dest) await downloadFile(cssUrl, dest);
  }

  // Fetch full HTML for each page to capture Rank Math SEO + schema if REST lacks it
  console.log("Fetching Rank Math / meta from live pages…");
  const seoMap = {};
  const allUrls = [
    ...pagesData.map((p) => p.path),
    ...postsData.map((p) => p.path),
  ];
  for (const pth of allUrls) {
    try {
      const html = await fetchText(ORIGIN + pth);
      const title = html.match(/<title>([^<]*)<\/title>/i)?.[1] || "";
      const desc =
        html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i)?.[1] ||
        html.match(/<meta\s+content=["']([^"']*)["']\s+name=["']description["']/i)?.[1] ||
        "";
      const canonical =
        html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i)?.[1] || "";
      const ogImage =
        html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']*)["']/i)?.[1] || "";
      const schemas = [...html.matchAll(/<script type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(
        (m) => {
          try {
            return JSON.parse(m[1]);
          } catch {
            return null;
          }
        },
      ).filter(Boolean);
      seoMap[pth] = {
        title: title.replace(/&amp;/g, "&").replace(/&#8211;/g, "–"),
        description: desc,
        canonical: rewriteUrl(canonical),
        ogImage: rewriteUrl(ogImage),
        schemas,
      };
      // also grab page-specific elementor CSS not yet downloaded
      for (const m of html.matchAll(/href=["']([^"']*elementor\/css\/[^"']+)["']/g)) {
        let u = m[1];
        if (u.startsWith("//")) u = `https:${u}`;
        else if (u.startsWith("/")) u = ORIGIN + u;
        const dest = localPathFromWpUrl(u.split("?")[0]);
        if (dest) await downloadFile(u.split("?")[0], dest);
      }
    } catch (e) {
      console.warn("seo fail", pth, e.message);
    }
  }
  fs.writeFileSync(path.join(DATA, "seo.json"), JSON.stringify(seoMap, null, 2));

  // Merge SEO into pages/posts
  for (const p of pagesData) {
    if (seoMap[p.path]) p.seo = { ...p.seo, ...seoMap[p.path] };
  }
  for (const p of postsData) {
    if (seoMap[p.path]) p.seo = { ...p.seo, ...seoMap[p.path] };
  }
  fs.writeFileSync(path.join(DATA, "pages.json"), JSON.stringify(pagesData, null, 2));
  fs.writeFileSync(path.join(DATA, "posts.json"), JSON.stringify(postsData, null, 2));

  console.log("Done. CSS files:", cssLocal.length);
  console.log("Pages:", pagesData.map((p) => p.path).join(", "));
  console.log("Posts:", postsData.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
