#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const LOCAL = "http://127.0.0.1:5113";
const posts = JSON.parse(fs.readFileSync("src/data/posts.json", "utf8"));
const bad = [];
let ok = 0;

for (const p of posts) {
  const src = (p.featuredImage || "").trim();
  if (!src || src.includes("placeholder")) continue;
  const disk = path.join("public", src.replace(/^\//, ""));
  const exists = fs.existsSync(disk);
  let status = 0;
  let ct = "";
  try {
    const res = await fetch(LOCAL + encodeURI(src));
    status = res.status;
    ct = res.headers.get("content-type") || "";
  } catch (e) {
    status = -1;
  }
  const httpOk = status >= 200 && status < 300 && /image\//i.test(ct);
  if (!exists || !httpOk) {
    bad.push({
      path: p.path,
      src,
      exists,
      status,
      ct,
      bytes: exists ? fs.statSync(disk).size : 0,
      hasSpecial: /[^\x00-\x7F]/.test(src),
    });
  } else ok++;
}

console.log(JSON.stringify({ ok, badCount: bad.length, bad }, null, 2));
