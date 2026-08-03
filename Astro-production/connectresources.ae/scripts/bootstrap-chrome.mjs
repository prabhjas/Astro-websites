/**
 * One-shot: refresh homepage chrome + download CSS/images from crawl homepage.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(ROOT);
const ORIGIN = "https://connectresources.ae";
const UA = "ConnectResources-Astro-Migration/1.0";

const crawlHome = path.join(ROOT, "_crawl", "homepage.html");
if (!fs.existsSync(crawlHome) || fs.statSync(crawlHome).size < 1000) {
  console.log("Fetching homepage into _crawl…");
  const res = await fetch(`${ORIGIN}/`, { headers: { "User-Agent": UA } });
  fs.mkdirSync(path.dirname(crawlHome), { recursive: true });
  fs.writeFileSync(crawlHome, await res.text());
}

const html = fs.readFileSync(crawlHome, "utf8");
console.log("homepage bytes", html.length);

for (const s of [
  "elementor-location-header",
  "elementor-location-footer",
  'data-elementor-type="header"',
  'data-elementor-type="footer"',
  'data-elementor-type="wp-page"',
]) {
  console.log(s, html.includes(s));
}

const types = [...html.matchAll(/data-elementor-type="([^"]+)"/g)].map((m) => m[1]);
console.log("elementor types", [...new Set(types)]);

spawnSync(process.execPath, ["scripts/refresh-bodies.mjs", "--only=pages", "--paths=/", "--limit=5"], {
  cwd: ROOT,
  stdio: "inherit",
});

async function download(url) {
  let u = url.startsWith("//") ? `https:${url}` : url.startsWith("/") ? ORIGIN + url : url;
  if (!u.includes("connectresources.ae")) return null;
  const clean = u.split("?")[0];
  const dest = path.join(ROOT, "public", new URL(clean).pathname.replace(/^\//, ""));
  if (fs.existsSync(dest) && fs.statSync(dest).size > 50) return new URL(clean).pathname;
  try {
    const res = await fetch(clean, { headers: { "User-Agent": UA } });
    if (!res.ok) return null;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
    return new URL(clean).pathname;
  } catch {
    return null;
  }
}

const css = [...html.matchAll(/href=["']([^"']+\.css[^"']*)["']/g)].map((m) => m[1]);
const local = [];
for (const u of css) {
  const rel = await download(u);
  if (rel && !local.includes(rel)) {
    local.push(rel);
    console.log("css", rel);
  }
}
fs.writeFileSync(path.join(ROOT, "src/data/live-css-order.json"), JSON.stringify(local, null, 2) + "\n");
console.log("live-css-order", local.length);

// fonts from downloaded CSS
for (const rel of local) {
  const full = path.join(ROOT, "public", rel.replace(/^\//, ""));
  if (!fs.existsSync(full)) continue;
  const cssText = fs.readFileSync(full, "utf8");
  for (const m of cssText.matchAll(/url\((['"]?)([^)'"]+\.(?:woff2?|ttf|otf))\1\)/gi)) {
    let fu = m[2];
    if (fu.startsWith("data:")) continue;
    if (fu.startsWith("//")) fu = `https:${fu}`;
    else if (fu.startsWith("/")) fu = ORIGIN + fu;
    else if (!fu.startsWith("http")) fu = new URL(fu, ORIGIN + path.posix.dirname(rel) + "/").href;
    await download(fu);
  }
}

let imgs = 0;
for (const m of html.matchAll(/src=["']([^"']+)["']/g)) {
  const u = m[1];
  if (!/\.(png|jpe?g|webp|svg|gif|ico)(\?|$)/i.test(u)) continue;
  const rel = await download(u);
  if (rel) imgs++;
}
console.log("images", imgs);

console.log("header", fs.statSync("src/data/header.html").size);
console.log("footer", fs.statSync("src/data/footer.html").size);
const pages = JSON.parse(fs.readFileSync("src/data/pages.json", "utf8"));
const home = pages.find((p) => p.path === "/");
console.log("home bodyHtml", (home?.bodyHtml || "").length, "content", (home?.content || "").length);
