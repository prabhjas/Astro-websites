/**
 * Robust Elementor page body extractor using cheerio-less regex + balanced div walk
 * focused on data-elementor-type="wp-page".
 */
import fs from "node:fs";
import path from "node:path";

const ORIGIN = "";

function stripDomain(html) {
  return html
    .replaceAll("", "")
    .replaceAll("", "")
    .replaceAll("//spheavyrental.ae", "");
}

function extractWpPage(html) {
  const marker = 'data-elementor-type="wp-page"';
  const idx = html.indexOf(marker);
  if (idx < 0) return "";
  // Walk back to opening '<' of this tag
  let start = html.lastIndexOf("<div", idx);
  if (start < 0) start = html.lastIndexOf("<", idx);

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
      ["img", "br", "hr", "input", "meta", "link", "source", "area", "base", "col", "embed", "wbr"].includes(name);

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

async function downloadCssFromHtml(html) {
  const css = [...html.matchAll(/href="([^"]+\.css[^"]*)"/g)].map((m) => m[1]);
  const out = [];
  for (let u of css) {
    if (u.startsWith("//")) u = "https:" + u;
    else if (u.startsWith("/")) u = ORIGIN + u;
    if (!u.includes("spheavyrental.ae")) continue;
    const clean = u.split("?")[0];
    const rel = new URL(clean).pathname;
    const dest = path.join("public", rel.replace(/^\//, ""));
    if (!fs.existsSync(dest) || fs.statSync(dest).size < 50) {
      try {
        const res = await fetch(clean);
        if (res.ok) {
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
        }
      } catch {}
    }
    if (fs.existsSync(dest)) out.push(rel);
  }
  return [...new Set(out)];
}

const pages = JSON.parse(fs.readFileSync("src/data/pages.json", "utf8"));

for (const p of pages) {
  const url = `${ORIGIN}${p.path}?nowprocket=1`;
  console.log("extract", p.path);
  const html = await (await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0" },
  })).text();
  const body = extractWpPage(html);
  console.log("  html", html.length, "body", body.length, "hasAccordion", (body.match(/elementor-accordion/g) || []).length);
  if (body.length > 2000) {
    p.bodyHtml = stripDomain(body);
  }
  p.pageCss = await downloadCssFromHtml(html);
  p.elementorCss = `/wp-content/uploads/elementor/css/post-${p.id}.css`;
  // ensure page css file
  await downloadCssFromHtml(`<link href="${ORIGIN}/wp-content/uploads/elementor/css/post-${p.id}.css">`);
}

fs.writeFileSync("src/data/pages.json", JSON.stringify(pages, null, 2));
console.log("saved");
