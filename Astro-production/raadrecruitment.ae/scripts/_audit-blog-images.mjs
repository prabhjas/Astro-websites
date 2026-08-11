#!/usr/bin/env node
/** Audit all post featured images: local file exists + not placeholder. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const posts = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/posts.json"), "utf8"));

const missing = [];
const placeholder = [];
const external = [];
const ok = [];

for (const p of posts) {
  const src = (p.featuredImage || p.seo?.ogImage || "").trim();
  if (!src) {
    missing.push({ id: p.id, path: p.path });
    continue;
  }
  if (/^https?:\/\//i.test(src) && !src.includes("127.0.0.1")) {
    external.push({ id: p.id, path: p.path, src });
  }
  if (src.includes("blog-placeholder")) {
    placeholder.push({ id: p.id, path: p.path, src });
    continue;
  }
  const local = src.startsWith("/") ? path.join(ROOT, "public", src.slice(1)) : path.join(ROOT, "public", src);
  if (!fs.existsSync(local) || fs.statSync(local).size < 500) {
    missing.push({ id: p.id, path: p.path, src, reason: "file-missing-or-tiny" });
  } else {
    ok.push({ id: p.id, path: p.path, src, bytes: fs.statSync(local).size });
  }
}

console.log(
  JSON.stringify(
    {
      total: posts.length,
      ok: ok.length,
      missingMeta: missing.length,
      placeholder: placeholder.length,
      external: external.length,
      missing,
      placeholder,
      external: external.slice(0, 20),
    },
    null,
    2,
  ),
);
