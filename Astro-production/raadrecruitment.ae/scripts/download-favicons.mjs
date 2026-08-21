#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ORIGIN = "https://raadrecruitment.ae";
const html = await (await fetch(ORIGIN + "/?nowprocket=1")).text();
const hrefs = [
  ...html.matchAll(
    /<link[^>]+rel=["'](?:shortcut icon|icon|apple-touch-icon)[^"']*["'][^>]*>/gi,
  ),
].map((m) => {
  const href = (m[0].match(/href=["']([^"']+)/i) || [])[1];
  return href;
}).filter(Boolean);

console.log("icon links", hrefs);

async function save(relOrAbs, destRel) {
  let url = relOrAbs;
  if (url.startsWith("//")) url = "https:" + url;
  if (url.startsWith("/")) url = ORIGIN + url;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "image/*,*/*" },
    redirect: "follow",
  });
  const buf = Buffer.from(await res.arrayBuffer());
  const ct = res.headers.get("content-type") || "";
  if (!res.ok || /text\/html/i.test(ct) || buf.length < 80) {
    console.warn("skip", url, res.status, ct, buf.length);
    return false;
  }
  const dest = path.join("public", destRel.replace(/^\//, ""));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
  console.log("OK", buf.length, ct, "->", destRel);
  return true;
}

// Prefer linked icons
for (const href of hrefs) {
  try {
    const u = new URL(href.startsWith("//") ? "https:" + href : href, ORIGIN);
    const dest = u.pathname;
    await save(u.href, dest);
  } catch {}
}

// Common WP paths + logo from site.json
const extras = [
  ["/wp-content/uploads/2023/10/logo-RAAD-Recruitment-UAE-normal.png", "/wp-content/uploads/logo.png"],
  ["/wp-content/uploads/2023/05/favicon.png", "/wp-content/uploads/favicon.png"],
  ["/wp-content/uploads/2023/10/favicon.png", "/wp-content/uploads/favicon.png"],
  ["/favicon.ico", "/favicon.ico"],
];

// Probe og:image / logo too
const og = (html.match(/property=["']og:image["'][^>]+content=["']([^"']+)/i) ||
  html.match(/content=["']([^"']+)["'][^>]+property=["']og:image["']/i) || [])[1];
console.log("og:image", og);

for (const [from, to] of extras) {
  if (fs.existsSync(path.join("public", to.replace(/^\//, ""))) &&
      fs.statSync(path.join("public", to.replace(/^\//, ""))).size > 200) continue;
  await save(from, to);
}

// If we still lack favicon.png, copy from any existing RAAD logo png as last resort? better use ico
if (!fs.existsSync("public/wp-content/uploads/favicon.png")) {
  // try scraping apple-touch from HTML absolute
  const apple = hrefs.find((h) => /apple/i.test(h));
  if (apple) {
    await save(apple, "/wp-content/uploads/favicon.png");
    await save(apple, "/wp-content/uploads/apple-touch-icon.png");
    await save(apple, "/wp-content/uploads/android-icon-192x192.png");
  }
}

// Update site.json to point at working assets if png still missing
const sitePath = "src/data/site.json";
const site = JSON.parse(fs.readFileSync(sitePath, "utf8"));
if (!fs.existsSync("public" + site.favicon) || fs.statSync("public" + site.favicon).size < 80) {
  if (fs.existsSync("public/favicon.ico")) {
    site.favicon = "/favicon.ico";
    console.log("site.favicon -> /favicon.ico");
  }
}
if (!fs.existsSync("public" + site.appleTouchIcon)) {
  site.appleTouchIcon = site.favicon;
}
if (!fs.existsSync("public" + site.favicon192)) {
  site.favicon192 = site.favicon;
}
fs.writeFileSync(sitePath, JSON.stringify(site, null, 2) + "\n");
console.log("site icons", { favicon: site.favicon, apple: site.appleTouchIcon, f192: site.favicon192 });
