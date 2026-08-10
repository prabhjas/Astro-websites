/**
 * Refresh ALL page bodies from live nowprocket HTML with improved extractor.
 * Also refresh header/footer and collect per-page CSS URLs.
 */
import fs from "node:fs";
import path from "node:path";

const ORIGIN = "";
const DATA = "src/data";
const PUBLIC = "public";

function stripDomain(html) {
  return html
    .replaceAll("", "")
    .replaceAll("", "")
    .replaceAll("//spheavyrental.ae", "");
}

function extractElement(html, marker) {
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

async function download(url) {
  const u = url.startsWith("http") ? url.split("?")[0] : ORIGIN + url.split("?")[0];
  if (!u.includes("spheavyrental.ae") && !u.startsWith(ORIGIN)) return null;
  const dest = path.join(PUBLIC, new URL(u).pathname.replace(/^\//, ""));
  if (fs.existsSync(dest) && fs.statSync(dest).size > 50) return new URL(u).pathname;
  try {
    const res = await fetch(u);
    if (!res.ok) return null;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
    return new URL(u).pathname;
  } catch {
    return null;
  }
}

async function fetchPage(pathname) {
  const url = `${ORIGIN}${pathname === "/" ? "/" : pathname}?nowprocket=1`;
  const html = await (await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } })).text();
  return html;
}

const pages = JSON.parse(fs.readFileSync(path.join(DATA, "pages.json"), "utf8"));
const pageCssMap = {};

for (const p of pages) {
  console.log("refresh", p.path);
  try {
    const html = await fetchPage(p.path);
    let body =
      extractElement(html, 'data-elementor-type="wp-page"') ||
      extractElement(html, `data-elementor-id="${p.id}"`);
    if (body && body.length > 1000) {
      p.bodyHtml = stripDomain(body);
      console.log("  body", p.bodyHtml.length);
    } else {
      console.warn("  keep previous body", body?.length || 0);
    }

    // Collect and download CSS
    const css = [...html.matchAll(/href="([^"]+\.css[^"]*)"/g)].map((m) => m[1]);
    const localCss = [];
    for (let u of css) {
      if (u.startsWith("//")) u = "https:" + u;
      else if (u.startsWith("/")) u = ORIGIN + u;
      if (!u.includes("spheavyrental.ae")) continue;
      const rel = await download(u);
      if (rel) localCss.push(rel);
    }
    pageCssMap[p.path] = [...new Set(localCss)];
    p.pageCss = pageCssMap[p.path];
    p.elementorCss = `/wp-content/uploads/elementor/css/post-${p.id}.css`;
  } catch (e) {
    console.warn("  fail", e.message);
  }
}

fs.writeFileSync(path.join(DATA, "pages.json"), JSON.stringify(pages, null, 2));
fs.writeFileSync(path.join(DATA, "page-css.json"), JSON.stringify(pageCssMap, null, 2));

// header/footer
const home = await fetchPage("/");
fs.writeFileSync(
  path.join(DATA, "header.html"),
  stripDomain(extractElement(home, 'data-elementor-id="153"')),
);
fs.writeFileSync(
  path.join(DATA, "footer.html"),
  stripDomain(extractElement(home, 'data-elementor-id="158"')),
);
console.log("done");
