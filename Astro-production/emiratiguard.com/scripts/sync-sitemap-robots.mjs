/**
 * Sync every URL from live page-sitemap.xml + post-sitemap.xml:
 * - fetch HTML (?nowprocket=1)
 * - preserve EXACT <meta name="robots" content="…">
 * - refresh bodyHtml from rendered main content when extractable
 * - update pages.json / posts.json / seo.json / bodies.json / sitemap-urls.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ORIGIN = "https://emiratiguard.com";
const UA = "EMIRATIGUARD-Sitemap-Clone/1.0";
const DATA = path.join(ROOT, "src", "data");
const CONCURRENCY = Number(process.env.EG_SYNC_CONCURRENCY || 4);

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function normalizePath(pathname) {
  let p = pathname || "/";
  if (!p.startsWith("/")) p = `/${p}`;
  if (p !== "/" && !p.endsWith("/")) p += "/";
  return p;
}

function pathFromLoc(loc) {
  return normalizePath(new URL(loc).pathname);
}

function stripDomain(html) {
  if (!html) return html;
  return html
    .replaceAll("https://www.emiratiguard.com", "")
    .replaceAll("http://www.emiratiguard.com", "")
    .replaceAll("https://emiratiguard.com", "")
    .replaceAll("http://emiratiguard.com", "")
    .replaceAll("//emiratiguard.com", "")
    .replaceAll("//www.emiratiguard.com", "");
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

async function fetchSitemapLocs(sitemapUrl) {
  const xml = await fetchText(sitemapUrl);
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1].trim());
}

function extractRobotsExact(html) {
  const $ = cheerio.load(html);
  const robotsEl = $('meta[name="robots"]').first();
  if (robotsEl.length) {
    const content = robotsEl.attr("content");
    if (content && content.trim()) return content.trim();
  }
  // googlebot / secondary — only if primary robots missing
  const gb = $('meta[name="googlebot"]').first().attr("content");
  if (gb && gb.trim()) return gb.trim();
  return null;
}

function extractMainBody(html) {
  const $ = cheerio.load(html, { decodeEntities: false });
  // Prefer Visual Composer / theme main content, avoid re-including site header/footer.
  const candidates = [
    $("#site-content .entry-content").first(),
    $("#site-content article").first(),
    $("#site-content").first(),
    $(".entry-content").first(),
    $("main#site-content").first(),
    $('[data-elementor-type="wp-page"]').first(),
    $('[data-elementor-type="wp-post"]').first(),
  ];
  for (const el of candidates) {
    if (el && el.length) {
      const out = $.html(el);
      if (out && out.length > 200) return out;
    }
  }
  return null;
}

function extractSeoBasics(html, pathKey) {
  const $ = cheerio.load(html);
  const title = $("title").first().text().trim();
  const description =
    $('meta[name="description"]').attr("content")?.trim() ||
    $('meta[property="og:description"]').attr("content")?.trim() ||
    "";
  const canonical =
    $('link[rel="canonical"]').attr("href")?.trim() || `${ORIGIN}${pathKey}`;
  const ogImage =
    $('meta[property="og:image"]').attr("content")?.trim() ||
    $('meta[property="og:image:secure_url"]').attr("content")?.trim() ||
    "";
  const schemas = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).html();
    if (!raw) return;
    try {
      schemas.push(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  });
  return {
    title,
    description,
    canonical: stripDomain(canonical) || pathKey,
    ogImage: stripDomain(ogImage),
    schemas,
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

async function downloadAsset(url) {
  try {
    const u = new URL(url, ORIGIN);
    if (!u.hostname.includes("emiratiguard.com")) return;
    const dest = path.join(ROOT, "public", u.pathname.replace(/^\//, ""));
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return;
    ensureDir(path.dirname(dest));
    const res = await fetch(u.href, { headers: { "User-Agent": UA } });
    if (!res.ok) return;
    fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  } catch {
    /* skip */
  }
}

async function downloadReferencedImages(html) {
  const $ = cheerio.load(html);
  const urls = new Set();
  $("img[src]").each((_, el) => {
    const src = $(el).attr("src");
    if (src) urls.add(src);
  });
  $("img[srcset]").each((_, el) => {
    const srcset = $(el).attr("srcset") || "";
    for (const part of srcset.split(",")) {
      const u = part.trim().split(/\s+/)[0];
      if (u) urls.add(u);
    }
  });
  for (const u of urls) {
    await downloadAsset(u);
  }
}

async function main() {
  console.log("Fetching live sitemaps…");
  const [pageLocs, postLocs] = await Promise.all([
    fetchSitemapLocs(`${ORIGIN}/page-sitemap.xml`),
    fetchSitemapLocs(`${ORIGIN}/post-sitemap.xml`),
  ]);
  console.log({ pages: pageLocs.length, posts: postLocs.length });

  const pagesPath = path.join(DATA, "pages.json");
  const postsPath = path.join(DATA, "posts.json");
  const seoPath = path.join(DATA, "seo.json");
  const bodiesPath = path.join(DATA, "bodies.json");
  const sitemapUrlsPath = path.join(DATA, "sitemap-urls.json");

  const pages = JSON.parse(fs.readFileSync(pagesPath, "utf8"));
  const posts = JSON.parse(fs.readFileSync(postsPath, "utf8"));
  const seoMap = fs.existsSync(seoPath) ? JSON.parse(fs.readFileSync(seoPath, "utf8")) : {};
  const bodies = fs.existsSync(bodiesPath) ? JSON.parse(fs.readFileSync(bodiesPath, "utf8")) : {};

  const pageByPath = new Map(pages.map((p) => [normalizePath(p.path), p]));
  const postByPath = new Map(posts.map((p) => [normalizePath(p.path), p]));

  const pageJobs = pageLocs.map((loc) => ({ loc, kind: "page", path: pathFromLoc(loc) }));
  const postJobs = postLocs.map((loc) => ({ loc, kind: "post", path: pathFromLoc(loc) }));
  const jobs = [...pageJobs, ...postJobs];

  const report = [];
  let done = 0;

  await mapPool(
    jobs,
    async (job) => {
      const url = `${ORIGIN}${job.path === "/" ? "/" : job.path}?nowprocket=1`;
      try {
        const html = await fetchText(url);
        const robotsExact = extractRobotsExact(html);
        if (!robotsExact) {
          report.push({ path: job.path, ok: false, error: "no robots meta" });
          return;
        }
        const basics = extractSeoBasics(html, job.path);
        const body = extractMainBody(html);
        await downloadReferencedImages(body || html);

        const entry =
          job.kind === "page" ? pageByPath.get(job.path) : postByPath.get(job.path);

        const seo = {
          ...(entry?.seo || {}),
          title: basics.title || entry?.seo?.title || "",
          description: basics.description || entry?.seo?.description || "",
          canonical: basics.canonical || job.path,
          ogImage: basics.ogImage || entry?.seo?.ogImage || "",
          // CRITICAL: store exact live robots string — do not rebuild from flags
          robots: robotsExact,
          schemas: basics.schemas?.length ? basics.schemas : entry?.seo?.schemas || [],
        };

        if (entry) {
          entry.seo = seo;
          entry.title = basics.title || entry.title;
          if (body && body.length > 200) {
            const cleaned = stripDomain(body);
            entry.bodyHtml = cleaned;
            if (job.kind === "page") entry.content = cleaned;
            bodies[job.path] = cleaned;
          }
        } else {
          // Create stub entry so sitemap URL is routable
          const stub = {
            id: 0,
            type: job.kind,
            slug: job.path.replace(/^\/|\/$/g, "") || "home",
            path: job.path,
            link: `${ORIGIN}${job.path === "/" ? "/" : job.path}`,
            title: basics.title || job.path,
            content: body ? stripDomain(body) : "",
            bodyHtml: body ? stripDomain(body) : "",
            excerpt: "",
            date: "",
            modified: "",
            parent: 0,
            menuOrder: 0,
            featuredImage: basics.ogImage || "",
            seo,
            ...(job.kind === "post"
              ? {
                  categories: [],
                  tags: [],
                  author: 0,
                  authorName: "",
                  authorSlug: "",
                }
              : {}),
          };
          if (job.kind === "page") {
            pages.push(stub);
            pageByPath.set(job.path, stub);
          } else {
            posts.push(stub);
            postByPath.set(job.path, stub);
          }
          if (stub.bodyHtml) bodies[job.path] = stub.bodyHtml;
        }

        seoMap[job.path] = {
          title: seo.title,
          description: seo.description,
          canonical: seo.canonical,
          ogImage: seo.ogImage,
          robots: robotsExact,
          schemas: seo.schemas,
        };

        report.push({ path: job.path, kind: job.kind, robots: robotsExact, ok: true });
      } catch (e) {
        report.push({ path: job.path, ok: false, error: e.message });
      }
      done += 1;
      if (done % 10 === 0 || done === jobs.length) {
        console.log(`  synced ${done}/${jobs.length}`);
      }
    },
    CONCURRENCY,
  );

  // Mark pages not in page-sitemap (e.g. /author/) — keep data but do not invent index
  const sitemapPageSet = new Set(pageJobs.map((j) => j.path));
  for (const p of pages) {
    const key = normalizePath(p.path);
    if (!sitemapPageSet.has(key)) {
      const liveRobots = p.seo?.robots;
      // If already a string keep; otherwise leave object alone — not in sitemap
      if (!p.seo) p.seo = {};
      if (typeof liveRobots !== "string") {
        // don't force-change unknown offline pages
      }
      p.inPageSitemap = false;
    } else {
      p.inPageSitemap = true;
    }
  }

  const sitemapUrls = {
    source: `${ORIGIN}/sitemap_index.xml`,
    generatedAt: new Date().toISOString(),
    pages: pageJobs.map((j) => ({
      path: j.path,
      loc: j.loc,
      robots: seoMap[j.path]?.robots || null,
    })),
    posts: postJobs.map((j) => ({
      path: j.path,
      loc: j.loc,
      robots: seoMap[j.path]?.robots || null,
    })),
    guides: [],
    country: [],
    eor: [],
  };

  fs.writeFileSync(pagesPath, JSON.stringify(pages, null, 2));
  fs.writeFileSync(postsPath, JSON.stringify(posts, null, 2));
  fs.writeFileSync(seoPath, JSON.stringify(seoMap, null, 2));
  fs.writeFileSync(bodiesPath, JSON.stringify(bodies, null, 2));
  fs.writeFileSync(sitemapUrlsPath, JSON.stringify(sitemapUrls, null, 2));
  ensureDir(path.join(ROOT, "_crawl"));
  fs.writeFileSync(
    path.join(ROOT, "_crawl", "robots-sync-report.json"),
    JSON.stringify({ syncedAt: new Date().toISOString(), report }, null, 2),
  );

  const ok = report.filter((r) => r.ok);
  const fail = report.filter((r) => !r.ok);
  const robotsUnique = [...new Set(ok.map((r) => r.robots))];
  console.log({
    ok: ok.length,
    fail: fail.length,
    robotsUnique,
    fails: fail,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
