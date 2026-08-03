import fs from "node:fs";

for (const f of ["sample-post.html", "sample-country.html"]) {
  const h = fs.readFileSync(new URL(`./${f}`, import.meta.url), "utf8");
  const types = [...h.matchAll(/data-elementor-type="([^"]+)"/g)].map((x) => x[1]);
  console.log(f, "len", h.length, "types", [...new Set(types)]);
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

const post = fs.readFileSync(new URL("./sample-post.html", import.meta.url), "utf8");
for (const m of [
  'data-elementor-type="single-post"',
  'data-elementor-type="wp-page"',
  'data-elementor-type="cpt"',
]) {
  const body = extractByMarker(post, m);
  console.log("post marker", m, "bodyLen", body.length);
}
const country = fs.readFileSync(new URL("./sample-country.html", import.meta.url), "utf8");
for (const m of [
  'data-elementor-type="wp-page"',
  'data-elementor-type="single-post"',
  'data-elementor-type="cpt"',
]) {
  const body = extractByMarker(country, m);
  console.log("country marker", m, "bodyLen", body.length);
}
