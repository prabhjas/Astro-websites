/**
 * Extract WordPress/Elementor content for c-uae.com → Astro fleet.
 * Fetches pages, posts, guides CPT; syncs Rank Math sitemaps; downloads CSS/assets;
 * extracts Elementor bodies for every sitemap URL.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CRAWL = path.join(ROOT, "_crawl");
const DATA = path.join(ROOT, "src", "data");
const PUBLIC = path.join(ROOT, "public");
const ORIGIN = "https://c-uae.com";
const UA = "CUAE-Astro-Migration/1.0";

const SKIP_MEDIA = process.env.CUAE_SKIP_MEDIA === "1";
const BODY_CONCURRENCY = Number(process.env.CUAE_BODY_CONCURRENCY || 4);

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

async function fetchAll(endpoint) {
  const items = [];
  let page = 1;
  while (true) {
    const url = `${ORIGIN}/wp-json/wp/v2/${endpoint}${endpoint.includes("?") ? "&" : "?"}per_page=100&page=${page}&_embed=1`;
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

async function downloadFile(url, dest) {
  ensureDir(path.dirname(dest));
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return dest;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) {
    console.warn("skip", res.status, url);
    return null;
  }
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  return dest;
}

function localPathFromWpUrl(url) {
  try {
    const u = new URL(url, ORIGIN);
    if (!u.hostname.includes("c-uae.com")) return null;
    return path.join(PUBLIC, u.pathname.replace(/^\//, ""));
  } catch {
    return null;
  }
}

function rewriteUrl(url) {
  if (!url) return url;
  return String(url)
    .replaceAll(ORIGIN, "")
    .replaceAll("https://c-uae.com", "")
    .replaceAll("http://c-uae.com", "")
    .replaceAll("https://www.c-uae.com", "")
    .replaceAll("http://www.c-uae.com", "");
}

function stripDomainInHtml(html) {
  if (!html) return html;
  return html
    .replaceAll("https://www.c-uae.com", "")
    .replaceAll("http://www.c-uae.com", "")
    .replaceAll("https://c-uae.com", "")
    .replaceAll("http://c-uae.com", "")
    .replaceAll("//c-uae.com", "")
    .replaceAll("//www.c-uae.com", "");
}

function pathFromLink(link) {
  const u = new URL(link);
  let p = u.pathname;
  if (!p.endsWith("/") && !path.extname(p)) p += "/";
  return p;
}

function normalizePath(p) {
  if (!p || p === "/") return "/";
  let out = p.startsWith("/") ? p : `/${p}`;
  if (!out.endsWith("/")) out += "/";
  return out;
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

function extractByMarker(html, marker) {
  const idx = html.indexOf(marker);
  if (idx < 0) return "";
  const start = html.lastIndexOf("<", idx);
  let i = start;
  let depth = 0;
  while (i < html.length) {
    const nextLt = html.indexOf("<", i);
    if (nextLt < 0) break;
    const nextGt = html.indexOf(">", nextLt);
    if (nextGt < 0) break;
    const tag = html.slice(nextLt, nextGt + 1);
    if (tag.startsWith("<!--")) {
      const endComment = html.indexOf("-->", nextLt);
      i = endComment >= 0 ? endComment + 3 : nextGt + 1;
      continue;
    }
    const isClose = /^<\//.test(tag);
    const nameMatch = tag.match(/^<\/?\s*([a-zA-Z0-9:-]+)/);
    const name = (nameMatch?.[1] || "").toLowerCase();
    const selfClosing =
      /\/>$/.test(tag) ||
      ["img", "br", "hr", "input", "meta", "link", "source", "area", "base", "col", "embed", "wbr"].includes(
        name,
      );
    if (isClose) {
      depth--;
      i = nextGt + 1;
      if (depth === 0) return html.slice(start, i);
      continue;
    }
    if (!selfClosing) depth++;
    i = nextGt + 1;
  }
  return "";
}

function extractBody(html) {
  return (
    extractByMarker(html, 'data-elementor-type="wp-page"') ||
    extractByMarker(html, 'data-elementor-type="wp-post"') ||
    extractByMarker(html, 'data-elementor-type="single-post"') ||
    extractByMarker(html, 'data-elementor-type="cpt"') ||
    extractByMarker(html, 'id="content"') ||
    extractByMarker(html, 'class="site-main"')
  );
}

function parseUrlset(xml, type) {
  const entries = [];
  const blocks = xml.split(/<url>/i).slice(1);
  for (const block of blocks) {
    const loc = block.match(/<loc>([^<]+)<\/loc>/i)?.[1]?.trim();
    if (!loc) continue;
    const lastmod = block.match(/<lastmod>([^<]+)<\/lastmod>/i)?.[1]?.trim();
    let p = "/";
    try {
      p = new URL(loc).pathname || "/";
    } catch {
      continue;
    }
    p = normalizePath(p);
    entries.push({ path: p, type, ...(lastmod ? { lastmod } : {}) });
  }
  return entries;
}

async function syncSitemaps() {
  const bucket = { pages: [], posts: [], guides: [], country: [], eor: [] };
  try {
    const indexXml = await fetchText(`${ORIGIN}/sitemap_index.xml`);
    const childLocs = [...indexXml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((m) => m[1].trim());
    for (const child of childLocs) {
      try {
        const xml = await fetchText(child);
        if (/page-sitemap/i.test(child)) bucket.pages.push(...parseUrlset(xml, "page"));
        else if (/post-sitemap/i.test(child)) bucket.posts.push(...parseUrlset(xml, "post"));
      } catch (err) {
        console.warn("sitemap child fail", child, err.message);
      }
    }
  } catch (err) {
    console.warn("sitemap index fail", err.message);
  }

  // Seed from uploaded Rank Math dumps when live children are empty/failing
  const uploadsRoot = path.resolve(ROOT, "../../.cursor/projects/c-Users-DELL-Desktop-Astro-New-Setup-Astro-websites/uploads");
  const altUploads = [
    path.resolve("C:/Users/DELL/.cursor/projects/c-Users-DELL-Desktop-Astro-New-Setup-Astro-websites/uploads"),
    path.join(ROOT, "_crawl", "sitemaps"),
  ];
  const uploadDirs = [uploadsRoot, ...altUploads];
  if (!bucket.pages.length || !bucket.posts.length) {
    for (const dir of uploadDirs) {
      if (!fs.existsSync(dir)) continue;
      if (!bucket.pages.length) {
        for (const name of ["page-sitemap-1.xml", "page-sitemap.xml"]) {
          const p = path.join(dir, name);
          if (fs.existsSync(p)) {
            bucket.pages.push(...parseUrlset(fs.readFileSync(p, "utf8"), "page"));
            console.log("seeded pages from", p, bucket.pages.length);
            break;
          }
        }
      }
      if (!bucket.posts.length) {
        for (const name of ["post-sitemap-0.xml", "post-sitemap.xml"]) {
          const p = path.join(dir, name);
          if (fs.existsSync(p)) {
            bucket.posts.push(...parseUrlset(fs.readFileSync(p, "utf8"), "post"));
            console.log("seeded posts from", p, bucket.posts.length);
            break;
          }
        }
      }
    }
  }

  const payload = {
    source: `${ORIGIN}/sitemap_index.xml`,
    fetchedAt: new Date().toISOString(),
    ...bucket,
  };
  fs.writeFileSync(path.join(DATA, "sitemap-urls.json"), `${JSON.stringify(payload, null, 2)}\n`);
  console.log(
    `sitemap-urls: pages=${bucket.pages.length} posts=${bucket.posts.length}`,
  );
  return payload;
}

async function downloadCssFromHtml(html) {
  const out = [];
  for (const m of html.matchAll(/href=["']([^"']+\.css[^"']*)["']/g)) {
    let u = m[1];
    if (u.startsWith("//")) u = `https:${u}`;
    else if (u.startsWith("/")) u = ORIGIN + u;
    if (!u.includes("c-uae.com")) continue;
    const clean = u.split("?")[0];
    const dest = localPathFromWpUrl(clean);
    if (dest) {
      await downloadFile(clean, dest);
      out.push(new URL(clean).pathname);
    }
  }
  return [...new Set(out)];
}

async function downloadReferencedAssets(html) {
  const urls = new Set();
  for (const m of html.matchAll(/(?:src|href)=["']([^"']+)["']/gi)) {
    let u = m[1];
    if (!u || u.startsWith("data:") || u.startsWith("mailto:") || u.startsWith("tel:") || u.startsWith("#")) continue;
    if (u.startsWith("//")) u = `https:${u}`;
    else if (u.startsWith("/")) u = ORIGIN + u;
    else if (!u.startsWith("http")) continue;
    try {
      const parsed = new URL(u);
      if (!parsed.hostname.includes("c-uae.com")) continue;
      if (!/\/wp-content\//i.test(parsed.pathname)) continue;
      urls.add(parsed.href.split("?")[0]);
    } catch {
      /* ignore */
    }
  }
  for (const u of urls) {
    const dest = localPathFromWpUrl(u);
    if (dest) await downloadFile(u, dest);
  }
}

function mapPage(p, wpType = "page") {
  const s = seoFromYoastOrRank(p);
  return {
    id: p.id,
    type: "page",
    wpType,
    slug: p.slug,
    path: pathFromLink(p.link),
    link: p.link,
    title: p.title?.rendered || "",
    content: stripDomainInHtml(p.content?.rendered || ""),
    excerpt: stripDomainInHtml(p.excerpt?.rendered || ""),
    date: p.date,
    modified: p.modified,
    parent: p.parent || 0,
    menuOrder: p.menu_order || 0,
    featuredImage: p._embedded?.["wp:featuredmedia"]?.[0]?.source_url
      ? rewriteUrl(p._embedded["wp:featuredmedia"][0].source_url)
      : "",
    elementorCss: `/wp-content/uploads/elementor/css/post-${p.id}.css`,
    seo: {
      ...s,
      canonical: rewriteUrl(s.canonical),
      ogImage: rewriteUrl(s.ogImage),
    },
  };
}

function mapPost(p) {
  const s = seoFromYoastOrRank(p);
  return {
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
    status: "published",
    elementorCss: `/wp-content/uploads/elementor/css/post-${p.id}.css`,
    seo: {
      ...s,
      canonical: rewriteUrl(s.canonical),
      ogImage: rewriteUrl(s.ogImage),
    },
  };
}

async function mapPool(items, worker, concurrency) {
  const results = new Array(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => run()));
  return results;
}

async function main() {
  ensureDir(CRAWL);
  ensureDir(DATA);
  ensureDir(path.join(PUBLIC, "wp-content", "uploads"));

  console.log("Syncing Rank Math sitemaps…");
  const sitemap = await syncSitemaps();

  console.log("Fetching WP REST content…");
  const [pages, posts, categories, tags, users] = await Promise.all([
    fetchAll("pages"),
    fetchAll("posts"),
    fetchAll("categories"),
    fetchAll("tags"),
    fetchAll("users"),
  ]);
  const guides = [];
  console.log({
    pages: pages.length,
    posts: posts.length,
    guides: guides.length,
    categories: categories.length,
    tags: tags.length,
    users: users.length,
  });

  console.log("Fetching homepage…");
  const homeHtml = await fetchText(`${ORIGIN}/?nowprocket=1`);
  fs.writeFileSync(path.join(CRAWL, "homepage.html"), homeHtml);

  const cssLocal = await downloadCssFromHtml(homeHtml);
  fs.writeFileSync(path.join(CRAWL, "css-urls.txt"), cssLocal.join("\n"));

  // Fonts referenced from downloaded CSS
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
      const dest = localPathFromWpUrl(fu);
      if (dest) await downloadFile(fu, dest);
    }
  }

  const headerHtml =
    extractByMarker(homeHtml, "elementor-location-header") ||
    extractByMarker(homeHtml, 'data-elementor-type="header"');
  const footerHtml =
    extractByMarker(homeHtml, "elementor-location-footer") ||
    extractByMarker(homeHtml, 'data-elementor-type="footer"');
  fs.writeFileSync(path.join(CRAWL, "header.html"), headerHtml);
  fs.writeFileSync(path.join(CRAWL, "footer.html"), footerHtml);

  const pagesData = [
    ...pages.map((p) => mapPage(p, "page")),
    ...guides.map((p) => mapPage(p, "guides")),
  ];
  // Dedupe by path (prefer first)
  const pageByPath = new Map();
  for (const p of pagesData) {
    const key = normalizePath(p.path);
    if (!pageByPath.has(key)) pageByPath.set(key, { ...p, path: key });
  }

  // Ensure every sitemap page/country/eor/guides URL exists as a page entry
  const ensurePaths = [
    ...sitemap.pages,
    ...sitemap.guides,
    ...sitemap.country,
    ...sitemap.eor,
  ];
  for (const row of ensurePaths) {
    const key = normalizePath(row.path);
    if (key === "/") continue;
    if (pageByPath.has(key)) continue;
    // may be a post path mistakenly — skip if in posts later
    pageByPath.set(key, {
      id: 0,
      type: "page",
      wpType: row.type || "page",
      slug: key.replace(/^\/|\/$/g, "").split("/").pop() || "page",
      path: key,
      link: ORIGIN + key,
      title: "",
      content: "",
      excerpt: "",
      date: row.lastmod || new Date().toISOString(),
      modified: row.lastmod || new Date().toISOString(),
      parent: 0,
      menuOrder: 0,
      featuredImage: "",
      seo: { title: "", description: "", canonical: key, ogImage: "", robots: { index: "index", follow: "follow" } },
    });
  }

  const postsData = posts.map(mapPost);
  const postByPath = new Map(postsData.map((p) => [normalizePath(p.path), p]));

  // Move paths that are actually posts out of pages placeholder
  for (const [key, page] of [...pageByPath.entries()]) {
    if (postByPath.has(key) && page.id === 0) pageByPath.delete(key);
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
  const authorsData = users.map((u) => ({
    id: u.id,
    name: u.name,
    slug: u.slug,
    path: `/author/${u.slug}/`,
    description: u.description,
    avatar: u.avatar_urls?.["96"] || "",
  }));

  const title = (homeHtml.match(/<title>([^<]*)<\/title>/i)?.[1] || "Connect UAE")
    .replace(/&amp;/g, "&")
    .replace(/&#8211;/g, "–");
  const logo =
    [...homeHtml.matchAll(/src=["']([^"']*logo[^"']*)["']/gi)].map((m) => m[1])[0] || "";
  const favicon =
    homeHtml.match(/rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)/i)?.[1] ||
    homeHtml.match(/href=["']([^"']+)["'][^>]*rel=["'](?:shortcut )?icon["']/i)?.[1] ||
    "";

  const site = {
    name: "Connect UAE",
    shortName: "C-UAE",
    url: ORIGIN,
    description:
      homeHtml.match(/name=["']description["'][^>]*content=["']([^"']+)/i)?.[1] ||
      "Business setup, company formation, and visa services in the UAE.",
    email: "info@c-uae.com",
    phone: "",
    phoneTel: "",
    whatsapp: "",
    whatsappUrl: "",
    logo: rewriteUrl(logo),
    logoSvg: "",
    ogImage: "",
    favicon: rewriteUrl(favicon),
    appleTouchIcon: rewriteUrl(favicon),
    colors: {
      primary: "#0B1F3A",
      secondary: "#1B4F72",
      text: "#333333",
      accent: "#C9A227",
      white: "#FFFFFF",
    },
    navigation: [
      { label: "Home", href: "/" },
      { label: "About us", href: "/about-us/" },
      { label: "Contact us", href: "/contact-us/" },
    ],
    footerServices: [],
    footerQuickLinks: [
      { label: "About us", href: "/about-us/" },
      { label: "Contact us", href: "/contact-us/" },
    ],
    cssFiles: cssLocal,
    headerHtml: stripDomainInHtml(headerHtml),
    footerHtml: stripDomainInHtml(footerHtml),
  };

  // Extract bodies + assets for all unique content paths
  const allPaths = [
    ...new Set([
      "/",
      ...[...pageByPath.keys()],
      ...[...postByPath.keys()],
      ...sitemap.pages.map((r) => normalizePath(r.path)),
      ...sitemap.posts.map((r) => normalizePath(r.path)),
      ...sitemap.guides.map((r) => normalizePath(r.path)),
      ...sitemap.country.map((r) => normalizePath(r.path)),
      ...sitemap.eor.map((r) => normalizePath(r.path)),
    ]),
  ];

  console.log(`Extracting bodies for ${allPaths.length} URLs (concurrency ${BODY_CONCURRENCY})…`);
  const bodies = {};
  const seoMap = {};
  let done = 0;

  await mapPool(
    allPaths,
    async (pth) => {
      const url = `${ORIGIN}${pth === "/" ? "/" : pth}?nowprocket=1`;
      try {
        const html = await fetchText(url);
        const body = extractBody(html);
        const pageCss = await downloadCssFromHtml(html);
        await downloadReferencedAssets(html);
        if (body && body.length > 500) {
          bodies[pth] = stripDomainInHtml(body);
        }
        const page = pageByPath.get(pth);
        const post = postByPath.get(pth);
        const entry = page || post;
        if (entry) {
          if (bodies[pth]) entry.bodyHtml = bodies[pth];
          entry.pageCss = pageCss;
          if (!entry.title) {
            entry.title =
              html.match(/<title>([^<]*)<\/title>/i)?.[1]?.replace(/&amp;/g, "&") || entry.title;
          }
          if (!entry.content && bodies[pth]) entry.content = bodies[pth];
        }
        const titleMeta = html.match(/<title>([^<]*)<\/title>/i)?.[1] || "";
        const desc =
          html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i)?.[1] ||
          html.match(/<meta\s+content=["']([^"']*)["']\s+name=["']description["']/i)?.[1] ||
          "";
        const canonical =
          html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i)?.[1] || "";
        const ogImage =
          html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']*)["']/i)?.[1] || "";
        const schemas = [
          ...html.matchAll(
            /<script type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
          ),
        ]
          .map((m) => {
            try {
              return JSON.parse(m[1]);
            } catch {
              return null;
            }
          })
          .filter(Boolean);
        seoMap[pth] = {
          title: titleMeta.replace(/&amp;/g, "&").replace(/&#8211;/g, "–"),
          description: desc,
          canonical: rewriteUrl(canonical),
          ogImage: rewriteUrl(ogImage),
          schemas,
        };
        if (entry) entry.seo = { ...entry.seo, ...seoMap[pth] };
      } catch (e) {
        console.warn("body fail", pth, e.message);
      }
      done += 1;
      if (done % 25 === 0 || done === allPaths.length) {
        console.log(`  bodies ${done}/${allPaths.length}`);
      }
    },
    BODY_CONCURRENCY,
  );

  if (!SKIP_MEDIA) {
    console.log("Downloading REST media library (featured sizes)…");
    try {
      const media = await fetchAll("media");
      let mediaCount = 0;
      for (const m of media) {
        const src = m.source_url;
        if (!src) continue;
        const dest = localPathFromWpUrl(src);
        if (dest) await downloadFile(src, dest);
        for (const size of Object.values(m.media_details?.sizes || {})) {
          if (size?.source_url) {
            const d = localPathFromWpUrl(size.source_url);
            if (d) await downloadFile(size.source_url, d);
          }
        }
        mediaCount += 1;
        if (mediaCount % 50 === 0) console.log(`  media ${mediaCount}/${media.length}`);
      }
    } catch (e) {
      console.warn("media download incomplete:", e.message);
    }
  } else {
    console.log("Skipping full media library (CUAE_SKIP_MEDIA=1); page-referenced assets already fetched.");
  }

  const finalPages = [...pageByPath.values()].sort((a, b) => a.path.localeCompare(b.path));
  const finalPosts = [...postByPath.values()].sort((a, b) => a.path.localeCompare(b.path));

  fs.writeFileSync(path.join(DATA, "site.json"), JSON.stringify(site, null, 2));
  fs.writeFileSync(path.join(DATA, "pages.json"), JSON.stringify(finalPages, null, 2));
  fs.writeFileSync(path.join(DATA, "posts.json"), JSON.stringify(finalPosts, null, 2));
  fs.writeFileSync(path.join(DATA, "categories.json"), JSON.stringify(categoriesData, null, 2));
  fs.writeFileSync(path.join(DATA, "tags.json"), JSON.stringify(tagsData, null, 2));
  fs.writeFileSync(path.join(DATA, "authors.json"), JSON.stringify(authorsData, null, 2));
  fs.writeFileSync(path.join(DATA, "seo.json"), JSON.stringify(seoMap, null, 2));
  fs.writeFileSync(path.join(DATA, "bodies.json"), JSON.stringify(bodies, null, 2));
  fs.writeFileSync(path.join(DATA, "header.html"), site.headerHtml || "");
  fs.writeFileSync(path.join(DATA, "footer.html"), site.footerHtml || "");

  // Parity report vs live sitemaps
  const contentPaths = new Set([
    ...finalPages.map((p) => normalizePath(p.path)),
    ...finalPosts.map((p) => normalizePath(p.path)),
    "/",
  ]);
  const missing = [];
  for (const group of ["pages", "posts", "guides", "country", "eor"]) {
    for (const row of sitemap[group] || []) {
      const p = normalizePath(row.path);
      if (!contentPaths.has(p)) missing.push({ group, path: p });
    }
  }
  fs.writeFileSync(
    path.join(CRAWL, "sitemap-parity.json"),
    JSON.stringify(
      {
        contentPages: finalPages.length,
        contentPosts: finalPosts.length,
        bodies: Object.keys(bodies).length,
        missingFromContent: missing,
      },
      null,
      2,
    ),
  );
  console.log("Done.");
  console.log({
    pages: finalPages.length,
    posts: finalPosts.length,
    bodies: Object.keys(bodies).length,
    missing: missing.length,
    title,
  });
  if (missing.length) {
    console.warn("Missing content for sitemap URLs:", missing.slice(0, 20));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
