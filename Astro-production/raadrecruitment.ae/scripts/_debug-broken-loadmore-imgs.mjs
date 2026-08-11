#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const LOCAL = "http://127.0.0.1:5113";
const posts = JSON.parse(fs.readFileSync("src/data/posts.json", "utf8"));
const targets = ["/fazaa-card-uae/", "/employee-benefits-in-uae/"];

for (const t of targets) {
  const p = posts.find((x) => (x.path.endsWith("/") ? x.path : `${x.path}/`) === t);
  const src = p?.featuredImage || "";
  const rel = src.replace(/^\//, "");
  const pub = path.join("public", rel);
  const dist = path.join("dist", "client", rel);
  console.log("---", t);
  console.log("src:", src);
  console.log("public:", fs.existsSync(pub), fs.existsSync(pub) ? fs.statSync(pub).size : 0);
  console.log("dist:", fs.existsSync(dist), fs.existsSync(dist) ? fs.statSync(dist).size : 0);
  for (const u of [src, encodeURI(src)]) {
    try {
      const r = await fetch(LOCAL + u);
      const buf = Buffer.from(await r.arrayBuffer());
      console.log("http", r.status, r.headers.get("content-type"), buf.length, u.slice(0, 140));
    } catch (e) {
      console.log("http err", e.message);
    }
  }
}

// Sample first Load More batch paths and check each file
const exclude = [
  "/employers-end-of-service-benefits-in-the-uae/",
  "/contract-staffing-company-in-uae/",
  "/headhunters-vs-recruitment-agencies-explained/",
  "/temporary-work-permit-uae/",
  "/recruitment-agencies-in-uae/",
  "/emiratisation-law-uae-a-complete-guide/",
  "/what-is-wps-in-the-uae/",
].join(",");
const api = await (await fetch(`${LOCAL}/api/blog/load-more/?perPage=6&excludePaths=${encodeURIComponent(exclude)}`)).json();
console.log("\nAPI ids", api.ids);
const srcs = [...(api.html || "").matchAll(/src="([^"]+)"/g)].map((m) => m[1]);
console.log("API imgs", srcs);
for (const src of srcs) {
  if (!src.includes("uploads")) continue;
  const rel = src.replace(/^\//, "");
  const pub = path.join("public", rel);
  const dist = path.join("dist", "client", rel);
  const r = await fetch(LOCAL + encodeURI(src));
  console.log({
    src: src.slice(0, 100),
    pub: fs.existsSync(pub),
    dist: fs.existsSync(dist),
    status: r.status,
    ct: r.headers.get("content-type"),
    bytes: (await r.arrayBuffer()).byteLength,
  });
}
