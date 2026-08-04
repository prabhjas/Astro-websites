import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "src", "data");
const ORIGIN = "https://iberiaeor.com";
const UA = "IberiaEOR-Astro/1.0";

const TARGETS = [
  { lang: "es", path: "/es/iberia-eor-landing-page-english-2/", id: 4838 },
  { lang: "es", path: "/es/privacy-policy/", id: 3789 },
  { lang: "ru", path: "/ru/about-us/", id: 3743 },
  { lang: "ru", path: "/ru/privacy-policy/", id: 3788 },
];

function rewrite(html) {
  return String(html || "")
    .replaceAll("https://dev.iberiaeor.com", "")
    .replaceAll("http://dev.iberiaeor.com", "")
    .replaceAll("https://iberiaeor.com", "")
    .replaceAll("http://iberiaeor.com", "")
    .replaceAll("https://www.iberiaeor.com", "")
    .replaceAll("http://www.iberiaeor.com", "");
}

function extractBody(html) {
  const $ = cheerio.load(html);
  const candidates = [
    $('[data-elementor-type="wp-page"]').first(),
    $('[data-elementor-type="wp-post"]').first(),
    $('[data-elementor-type="single-page"]').first(),
    $("main .elementor").first(),
    $("main .page-content").first(),
    $("main .entry-content").first(),
    $("article").first(),
    $("main").first(),
  ];
  for (const el of candidates) {
    if (el && el.length) {
      const out = $.html(el);
      if (out && out.length >= 200) return out;
    }
  }
  return "";
}

function extractSeo(html) {
  const $ = cheerio.load(html);
  return {
    title: $("title").first().text().trim(),
    description:
      $('meta[name="description"]').attr("content") ||
      $('meta[property="og:description"]').attr("content") ||
      "",
    canonical: ($('link[rel="canonical"]').attr("href") || "").replace(ORIGIN, "") || undefined,
    ogImage: ($('meta[property="og:image"]').attr("content") || "").replace(ORIGIN, "") || undefined,
    schemas: [],
  };
}

const pages = JSON.parse(fs.readFileSync(path.join(DATA, "pages.json"), "utf8"));
const bodies = JSON.parse(fs.readFileSync(path.join(DATA, "bodies.json"), "utf8"));

const results = [];
for (const t of TARGETS) {
  const url = `${ORIGIN}${t.path}?nowprocket=1`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  const text = await res.text();
  const bodyHtml = rewrite(extractBody(text));
  const seo = extractSeo(text);
  seo.canonical = seo.canonical || t.path;

  // Prefer REST content as fallback for non-Elementor privacy pages
  let finalBody = bodyHtml;
  if (!finalBody || finalBody.length < 200) {
    const jr = await fetch(`${ORIGIN}/wp-json/wp/v2/pages/${t.id}?lang=${t.lang}`, {
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
    if (jr.ok) {
      const data = await jr.json();
      const content = data.content?.rendered || "";
      if (content.length > 100) {
        finalBody = rewrite(
          `<div class="sp-page-content sp-lang-page"><article class="page type-page status-publish"><div class="entry-content">${content}</div></article></div>`,
        );
      }
    }
  }

  if (!finalBody || finalBody.length < 200) {
    results.push({ path: t.path, ok: false, status: res.status, body: finalBody.length });
    continue;
  }

  const entry = {
    id: t.id,
    type: "page",
    path: t.path,
    slug: t.path.replace(/^\/|\/$/g, "").split("/").pop(),
    title: seo.title.replace(/\s*[|\-].*IberiaEOR.*$/i, "").trim() || t.path,
    content: finalBody,
    bodyHtml: finalBody,
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
    elementorCss: `/wp-content/uploads/elementor/css/post-${t.id}.css`,
    lang: t.lang,
    seo: { ...seo, title: seo.title, description: seo.description },
    pageCss: [],
  };

  const idx = pages.findIndex((p) => p.path === t.path);
  if (idx >= 0) pages[idx] = { ...pages[idx], ...entry };
  else pages.push(entry);
  bodies[t.path] = finalBody;

  // CSS
  if (entry.elementorCss) {
    const dest = path.join(ROOT, "public", entry.elementorCss.replace(/^\//, ""));
    try {
      const cssRes = await fetch(ORIGIN + entry.elementorCss, { headers: { "User-Agent": UA } });
      if (cssRes.ok) {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, Buffer.from(await cssRes.arrayBuffer()));
      }
    } catch {
      /* ignore */
    }
  }

  results.push({ path: t.path, ok: true, body: finalBody.length, title: seo.title.slice(0, 70) });
  console.log("ok", t.path, finalBody.length);
}

fs.writeFileSync(path.join(DATA, "pages.json"), JSON.stringify(pages, null, 2));
fs.writeFileSync(path.join(DATA, "bodies.json"), JSON.stringify(bodies, null, 2));
console.log(JSON.stringify({ results, langPages: pages.filter((p) => /^\/(es|ru)/.test(p.path)).map((p) => p.path) }, null, 2));
