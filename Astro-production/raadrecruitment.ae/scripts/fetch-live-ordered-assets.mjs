#!/usr/bin/env node
/**
 * Download every path listed in live-css-order.json + live-js-order.json
 * (+ any extraCss from pages.json) into public/.
 */
import fs from "node:fs";
import path from "node:path";

const ORIGIN = "https://raadrecruitment.ae";
const PUBLIC = path.join(process.cwd(), "public");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const css = JSON.parse(fs.readFileSync("src/data/live-css-order.json", "utf8"));
const js = JSON.parse(fs.readFileSync("src/data/live-js-order.json", "utf8"));
const pages = JSON.parse(fs.readFileSync("src/data/pages.json", "utf8"));
const posts = JSON.parse(fs.readFileSync("src/data/posts.json", "utf8"));

const urls = new Set([...css, ...js]);
for (const p of [...pages, ...posts.slice(0, 30)]) {
  for (const u of p.pageCss || []) {
    if (typeof u === "string" && u.startsWith("/")) urls.add(u.split("?")[0]);
  }
}

let dl = 0;
let skip = 0;
let fail = 0;

for (const rel of urls) {
  if (!rel.startsWith("/wp-") && !rel.startsWith("/css/")) continue;
  const dest = path.join(PUBLIC, rel.replace(/^\//, "").replace(/[?#].*$/, ""));
  if (fs.existsSync(dest) && fs.statSync(dest).size > 20) {
    skip++;
    continue;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  try {
    const res = await fetch(ORIGIN + rel, { headers: { "User-Agent": UA } });
    if (!res.ok) {
      fail++;
      console.log("FAIL", res.status, rel);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const head = buf.slice(0, 120).toString("utf8").toLowerCase();
    if (head.includes("<!doctype html") || head.includes("<html")) {
      fail++;
      console.log("HTML", rel);
      continue;
    }
    fs.writeFileSync(dest, buf);
    dl++;
    console.log("DL", rel, buf.length);
  } catch (e) {
    fail++;
    console.log("ERR", rel, e.message);
  }
}
console.log({ dl, skip, fail, total: urls.size });
