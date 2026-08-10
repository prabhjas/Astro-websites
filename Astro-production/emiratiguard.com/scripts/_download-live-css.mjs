import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ORIGIN = "https://emiratiguard.com";
const cssPath = path.join(ROOT, "src", "data", "live-css-order.json");
const css = JSON.parse(fs.readFileSync(cssPath, "utf8")).map((h) =>
  h.replace("/blog-designer//", "/blog-designer/"),
);
fs.writeFileSync(cssPath, JSON.stringify(css, null, 2));

async function download(rel) {
  const dest = path.join(ROOT, "public", rel.replace(/^\//, ""));
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return "exists";
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const res = await fetch(ORIGIN + rel, {
    headers: { "User-Agent": "EMIRATIGUARD-Astro-Migration/1.0" },
  });
  if (!res.ok) return `fail ${res.status}`;
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  return `ok ${fs.statSync(dest).size}`;
}

for (const href of css) {
  console.log(href, "->", await download(href));
}

// Pull fonts/url() from downloaded CSS
const fontRe = /url\(\s*['"]?([^'")]+)['"]?\s*\)/gi;
for (const href of css) {
  const full = path.join(ROOT, "public", href.replace(/^\//, ""));
  if (!fs.existsSync(full)) continue;
  const text = fs.readFileSync(full, "utf8");
  for (const m of text.matchAll(fontRe)) {
    let u = m[1];
    if (!u || u.startsWith("data:")) continue;
    if (u.startsWith("//")) u = `https:${u}`;
    else if (u.startsWith("/")) u = ORIGIN + u;
    else if (!u.startsWith("http")) {
      u = new URL(u, ORIGIN + path.posix.dirname(href) + "/").href;
    }
    if (!u.includes("emiratiguard.com")) continue;
    const local = new URL(u).pathname;
    console.log("asset", local, "->", await download(local));
  }
}
