/**
 * Download any missing images referenced in page bodies.
 */
import fs from "node:fs";
import path from "node:path";

const ORIGIN = process.env.ASSET_ORIGIN || "https://connectzone.ae";
const pages = JSON.parse(fs.readFileSync("src/data/pages.json", "utf8"));
const urls = new Set();

for (const p of pages) {
  const html = p.bodyHtml || p.content || "";
  for (const m of html.matchAll(/(?:src|data-src|data-lazy-src)=["']([^"']+)["']/gi)) {
    urls.add(m[1].split("?")[0]);
  }
  for (const m of html.matchAll(/url\((['"]?)([^)'"]+)\1\)/gi)) {
    urls.add(m[2].split("?")[0]);
  }
}

let got = 0;
let miss = 0;
for (const u of urls) {
  let rel = u;
  if (u.startsWith("http")) {
    try {
      rel = new URL(u).pathname;
    } catch {
      continue;
    }
  }
  if (!rel.startsWith("/wp-content")) continue;
  const dest = path.join("public", rel.slice(1));
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) continue;
  try {
    const res = await fetch(ORIGIN + rel);
    if (!res.ok) {
      miss++;
      console.warn("miss", res.status, rel);
      continue;
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
    got++;
    console.log("got", rel);
  } catch (e) {
    miss++;
  }
}
console.log({ got, miss, totalRefs: urls.size });
