/**
 * Download any missing images referenced in page bodies.
 * Rejects HTML soft-404 responses (Connect FZ failure mode).
 */
import fs from "node:fs";
import path from "node:path";

const ORIGIN = "https://mbs-consultancy.com";
const pages = JSON.parse(fs.readFileSync("src/data/pages.json", "utf8"));
const urls = new Set();

function isSoft404Buf(buf, dest = "") {
  if (!buf || buf.length < 20) return true;
  const ext = path.extname(dest).toLowerCase();
  if ([".svg", ".css", ".js", ".html", ".json"].includes(ext)) return false;
  const head = buf.subarray(0, 200).toString("utf8");
  return buf[0] === 0x3c && /<!DOCTYPE|<html\b/i.test(head);
}

function isSoft404File(dest) {
  try {
    if (!fs.existsSync(dest) || fs.statSync(dest).size < 40) return true;
    return isSoft404Buf(fs.readFileSync(dest).subarray(0, 200), dest);
  } catch {
    return true;
  }
}

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
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0 && !isSoft404File(dest)) continue;
  try {
    const res = await fetch(ORIGIN + rel, {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "*/*", Referer: `${ORIGIN}/` },
    });
    if (!res.ok) {
      miss++;
      console.warn("miss", res.status, rel);
      continue;
    }
    const ct = res.headers.get("content-type") || "";
    const buf = Buffer.from(await res.arrayBuffer());
    if (ct.includes("text/html") || isSoft404Buf(buf, dest)) {
      miss++;
      console.warn("soft404-html", rel);
      continue;
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, buf);
    got++;
    console.log("got", rel);
  } catch {
    miss++;
  }
}
console.log({ got, miss, totalRefs: urls.size });
