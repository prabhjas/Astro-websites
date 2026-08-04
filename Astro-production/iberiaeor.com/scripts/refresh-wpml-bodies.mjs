/**
 * Refresh WPML privacy + ensure lang pages have usable HTML bodies.
 * Live currently only has 4 translated pages (2 ES + 2 RU); home ES/RU page_ids 404.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ORIGIN = "https://iberiaeor.com";
const DATA = path.join(ROOT, "src", "data");
const UA = "IberiaEOR-Astro/1.0";

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
    $("main .elementor").first(),
    $("main .entry-content").first(),
    $("article .entry-content").first(),
    $("main").first(),
  ];
  for (const el of candidates) {
    if (el && el.length) {
      const htmlOut = $.html(el);
      if (htmlOut && htmlOut.length > 200) return htmlOut;
    }
  }
  return "";
}

async function fetchPage(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  const text = await res.text();
  return { status: res.status, text, title: (text.match(/<title>([^<]+)/i) || [])[1] || "" };
}

const targets = [
  { path: "/es/privacy-policy/", url: `${ORIGIN}/es/privacy-policy/?nowprocket=1`, lang: "es", id: 3789 },
  { path: "/ru/privacy-policy/", url: `${ORIGIN}/ru/privacy-policy/?nowprocket=1`, lang: "ru", id: 3788 },
  { path: "/es/iberia-eor-landing-page-english-2/", url: `${ORIGIN}/es/iberia-eor-landing-page-english-2/?nowprocket=1`, lang: "es", id: 4838 },
  { path: "/ru/about-us/", url: `${ORIGIN}/ru/about-us/?nowprocket=1`, lang: "ru", id: 3743 },
];

const pages = JSON.parse(fs.readFileSync(path.join(DATA, "pages.json"), "utf8"));
const bodies = JSON.parse(fs.readFileSync(path.join(DATA, "bodies.json"), "utf8"));

for (const t of targets) {
  const { status, text, title } = await fetchPage(t.url);
  if (status !== 200 || /page not found/i.test(title)) {
    console.warn("fail", t.path, status, title);
    continue;
  }
  const bodyHtml = rewrite(extractBody(text));
  const description =
    (text.match(/name=["']description["'][^>]*content=["']([^"']+)/i) ||
      text.match(/content=["']([^"']+)["'][^>]*name=["']description["']/i) ||
      [])[1] || "";
  const idx = pages.findIndex((p) => p.path === t.path);
  const entry = {
    ...(idx >= 0 ? pages[idx] : {}),
    id: t.id,
    type: "page",
    path: t.path,
    slug: t.path.replace(/^\/|\/$/g, "").split("/").pop(),
    title: title.replace(/\s*[-|].*$/, "").trim(),
    content: bodyHtml,
    bodyHtml,
    status: "published",
    lang: t.lang,
    elementorCss: `/wp-content/uploads/elementor/css/post-${t.id}.css`,
    seo: {
      ...(idx >= 0 ? pages[idx].seo : {}),
      title,
      description,
      canonical: t.path,
      schemas: [],
    },
  };
  if (idx >= 0) pages[idx] = entry;
  else pages.push(entry);
  bodies[t.path] = bodyHtml;
  console.log("ok", t.path, bodyHtml.length);

  const cssRel = entry.elementorCss;
  const dest = path.join(ROOT, "public", cssRel.replace(/^\//, ""));
  if (!fs.existsSync(dest) || fs.statSync(dest).size < 20) {
    const cssRes = await fetch(ORIGIN + cssRel, { headers: { "User-Agent": UA } });
    if (cssRes.ok) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, Buffer.from(await cssRes.arrayBuffer()));
      console.log("css", cssRel);
    }
  }
}

// Drop broken language home stubs if present without body
const cleaned = pages.filter((p) => {
  if ((p.path === "/es/" || p.path === "/ru/") && !(p.bodyHtml && p.bodyHtml.length > 200)) {
    console.log("drop empty", p.path);
    return false;
  }
  return true;
});

// Add redirects note as pages? Better: middleware redirects for /es/ and /ru/
fs.writeFileSync(path.join(DATA, "pages.json"), JSON.stringify(cleaned, null, 2));
fs.writeFileSync(path.join(DATA, "bodies.json"), JSON.stringify(bodies, null, 2));

const lang = cleaned.filter((p) => p.lang || /^\/(es|ru)\//.test(p.path));
console.log(
  JSON.stringify(
    {
      langPages: lang.map((p) => ({ path: p.path, lang: p.lang, body: (p.bodyHtml || "").length })),
      total: cleaned.length,
    },
    null,
    2,
  ),
);
