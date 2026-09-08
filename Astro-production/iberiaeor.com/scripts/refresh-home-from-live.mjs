/**
 * Re-pull homepage Elementor body from live (full page - previous extract was truncated).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA = path.join(ROOT, "src", "data");
const ORIGIN = "https://iberiaeor.com";

function stripDomain(html) {
  return html
    .replaceAll("https://www.iberiaeor.com", "")
    .replaceAll("http://www.iberiaeor.com", "")
    .replaceAll("https://iberiaeor.com", "")
    .replaceAll("http://iberiaeor.com", "")
    .replaceAll("//iberiaeor.com", "")
    .replaceAll("//www.iberiaeor.com", "");
}

function extractByCheerio(html) {
  const $ = cheerio.load(html);
  const el = $('[data-elementor-type="wp-page"]').first();
  if (!el.length) return "";
  return $.html(el) || "";
}

function extractHeaderFooter(html) {
  const $ = cheerio.load(html);
  const header =
    $.html($('[data-elementor-type="header"]').first()) ||
    $.html($(".elementor-location-header").first()) ||
    "";
  const footer =
    $.html($('[data-elementor-type="footer"]').first()) ||
    $.html($(".elementor-location-footer").first()) ||
    "";
  return { header: stripDomain(header), footer: stripDomain(footer) };
}

async function downloadCssFromHtml(html) {
  const out = [];
  for (const m of html.matchAll(/href=["']([^"']+\.css[^"']*)["']/g)) {
    let u = m[1];
    if (u.startsWith("//")) u = `https:${u}`;
    else if (u.startsWith("/")) u = ORIGIN + u;
    if (!u.includes("iberiaeor.com")) continue;
    const clean = u.split("?")[0];
    const rel = new URL(clean).pathname;
    const dest = path.join(ROOT, "public", rel.replace(/^\//, ""));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (!fs.existsSync(dest) || fs.statSync(dest).size < 50) {
      try {
        const res = await fetch(clean, { headers: { "User-Agent": "EOR-Astro/1.0" } });
        if (res.ok) fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
      } catch {
        /* ignore */
      }
    }
    out.push(rel);
  }
  return [...new Set(out)];
}

const res = await fetch(`${ORIGIN}/?nowprocket=1`, {
  headers: { "User-Agent": "EOR-Astro/1.0" },
});
const html = await res.text();
const body = extractByCheerio(html);
if (body.length < 5000) {
  console.error("Home body too small", body.length);
  process.exit(1);
}

const cleaned = stripDomain(body);
const pageCss = await downloadCssFromHtml(html);
const { header, footer } = extractHeaderFooter(html);

const pages = JSON.parse(fs.readFileSync(path.join(DATA, "pages.json"), "utf8"));
const home = pages.find((p) => p.path === "/");
if (!home) {
  console.error("No home page in pages.json");
  process.exit(1);
}
home.bodyHtml = cleaned;
home.content = cleaned;
home.pageCss = pageCss;
home.elementorCss = `/wp-content/uploads/elementor/css/post-${home.id}.css`;

const title = html.match(/<title>([^<]*)<\/title>/i)?.[1]?.replace(/&amp;/g, "&") || home.seo?.title;
const desc =
  html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i)?.[1] ||
  home.seo?.description;
home.seo = {
  ...home.seo,
  title: title || home.seo?.title,
  description: desc || home.seo?.description,
};

fs.writeFileSync(path.join(DATA, "pages.json"), JSON.stringify(pages, null, 2));

const bodies = JSON.parse(fs.readFileSync(path.join(DATA, "bodies.json"), "utf8"));
bodies["/"] = cleaned;
fs.writeFileSync(path.join(DATA, "bodies.json"), JSON.stringify(bodies, null, 2));

const site = JSON.parse(fs.readFileSync(path.join(DATA, "site.json"), "utf8"));
if (header.length > 1000) site.headerHtml = header;
if (footer.length > 1000) site.footerHtml = footer;
site.cssFiles = [...new Set([...(site.cssFiles || []), ...pageCss])];

// Pull WhatsApp / phone from live footer if present
const wa = footer.match(/https?:\/\/wa\.me\/[0-9]+[^"'<\s]*/i)?.[0]
  || html.match(/https?:\/\/wa\.me\/[0-9]+[^"'<\s]*/i)?.[0]
  || "";
const tel = html.match(/href=["']tel:([^"']+)["']/i)?.[1] || "";
if (wa) {
  site.whatsappUrl = wa.split("?")[0];
  const digits = wa.replace(/\D/g, "");
  if (digits) site.whatsapp = `+${digits}`;
}
if (tel) {
  site.phoneTel = tel.replace(/\s+/g, "");
  site.phone = tel;
}
fs.writeFileSync(path.join(DATA, "site.json"), JSON.stringify(site, null, 2));
if (header) fs.writeFileSync(path.join(DATA, "header.html"), header);
if (footer) fs.writeFileSync(path.join(DATA, "footer.html"), footer);

console.log({
  bodyLen: cleaned.length,
  hasForm: /<form/i.test(cleaned),
  hasWpcf7: /wpcf7/i.test(cleaned),
  pageCss: pageCss.length,
  header: header.length,
  footer: footer.length,
  phone: site.phone,
  whatsappUrl: site.whatsappUrl,
});
