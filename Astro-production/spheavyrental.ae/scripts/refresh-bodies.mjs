/**
 * Refresh homepage (and optionally other pages) body HTML from live ?nowprocket=1
 * so Astro matches the current Elementor markup exactly.
 */
import fs from "node:fs";
import path from "node:path";

const ORIGIN = "https://spheavyrental.ae";
const DATA = "src/data";

function stripDomain(html) {
  return html
    .replaceAll("https://spheavyrental.ae", "")
    .replaceAll("http://spheavyrental.ae", "")
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

async function fetchBody(pathname) {
  const html = await (await fetch(`${ORIGIN}${pathname}?nowprocket=1`)).text();
  const body =
    extractElement(html, 'data-elementor-type="wp-page"') ||
    extractElement(html, 'data-elementor-type="wp-post"');
  return stripDomain(body);
}

async function main() {
  const pages = JSON.parse(fs.readFileSync(path.join(DATA, "pages.json"), "utf8"));
  for (const p of pages) {
    console.log("refresh", p.path);
    try {
      const body = await fetchBody(p.path === "/" ? "/" : p.path);
      if (body && body.length > 500) {
        p.bodyHtml = body;
        console.log("  ok", body.length);
      } else {
        console.warn("  short/empty, keeping previous");
      }
    } catch (e) {
      console.warn("  fail", e.message);
    }
  }
  fs.writeFileSync(path.join(DATA, "pages.json"), JSON.stringify(pages, null, 2));

  // Refresh header/footer too
  const home = await (await fetch(`${ORIGIN}/?nowprocket=1`)).text();
  const header = stripDomain(extractElement(home, 'data-elementor-id="153"'));
  const footer = stripDomain(extractElement(home, 'data-elementor-id="158"'));
  fs.writeFileSync(path.join(DATA, "header.html"), header);
  fs.writeFileSync(path.join(DATA, "footer.html"), footer);
  console.log("header", header.length, "footer", footer.length);
}

main();
