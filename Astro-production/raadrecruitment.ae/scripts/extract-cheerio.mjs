import * as cheerio from "cheerio";
import fs from "node:fs";
import path from "node:path";

const ORIGIN = "https://spheavyrental.ae";

function stripDomain(html) {
  return html
    .replaceAll("https://spheavyrental.ae", "")
    .replaceAll("http://spheavyrental.ae", "")
    .replaceAll("//spheavyrental.ae", "");
}

async function download(url) {
  const clean = url.split("?")[0];
  const abs = clean.startsWith("http") ? clean : ORIGIN + clean;
  if (!abs.includes("spheavyrental.ae")) return null;
  const rel = new URL(abs).pathname;
  const dest = path.join("public", rel.replace(/^\//, ""));
  if (fs.existsSync(dest) && fs.statSync(dest).size > 50) return rel;
  try {
    const res = await fetch(abs);
    if (!res.ok) return null;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
    return rel;
  } catch {
    return null;
  }
}

const pages = JSON.parse(fs.readFileSync("src/data/pages.json", "utf8"));

for (const p of pages) {
  console.log("cheerio extract", p.path);
  const html = await (
    await fetch(`${ORIGIN}${p.path}?nowprocket=1`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    })
  ).text();
  const $ = cheerio.load(html);
  const el = $('[data-elementor-type="wp-page"]').first();
  const body = el.toString();
  console.log(
    "  body",
    body.length,
    "sections",
    el.find(".elementor-top-section").length,
    "accordion",
    el.find(".elementor-accordion-item").length,
  );
  if (body.length > 2000) p.bodyHtml = stripDomain(body);

  const cssHrefs = [];
  $('link[rel="stylesheet"]').each((_, node) => {
    const href = $(node).attr("href");
    if (href) cssHrefs.push(href);
  });
  const pageCss = [];
  for (const href of cssHrefs) {
    const rel = await download(href.startsWith("//") ? `https:${href}` : href);
    if (rel) pageCss.push(rel);
  }
  // always include page css
  const postCss = await download(`${ORIGIN}/wp-content/uploads/elementor/css/post-${p.id}.css`);
  if (postCss) pageCss.push(postCss);
  p.pageCss = [...new Set(pageCss)];
  p.elementorCss = `/wp-content/uploads/elementor/css/post-${p.id}.css`;
}

fs.writeFileSync("src/data/pages.json", JSON.stringify(pages, null, 2));
console.log("done");
