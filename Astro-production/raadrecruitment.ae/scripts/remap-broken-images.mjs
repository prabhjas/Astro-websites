#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ORIGIN = "https://raadrecruitment.ae";
const PUBLIC = "public";
const UA = "Mozilla/5.0";

const map = {
  "/wp-content/uploads/2025/10/services-we-offer.webp":
    "/wp-content/uploads/2023/07/services-we-offer.jpg",
  "/wp-content/uploads/2025/10/Staff-Outsourcing-Services-RAAD.webp":
    "/wp-content/uploads/2023/07/Staff-Outsourcingv2.jpg",
  "/wp-content/uploads/2025/10/Staff-Outsourcingv3.webp":
    "/wp-content/uploads/2023/07/Staff-Outsourcingv2.jpg",
  "/wp-content/uploads/2025/10/Audit-Accounting.webp":
    "/wp-content/uploads/2023/08/Audit-Accounting.jpg",
  // closest public asset for talent visual (exists on live)
  "/wp-content/uploads/2025/10/emirati-talent-acquisition-services.webp":
    "/wp-content/uploads/2023/07/person-for-raad.png",
};

function isImage(buf) {
  return (
    (buf[0] === 0xff && buf[1] === 0xd8) ||
    (buf[0] === 0x89 && buf[1] === 0x50) ||
    (buf.slice(0, 4).toString() === "RIFF" &&
      buf.slice(8, 12).toString() === "WEBP") ||
    buf.slice(0, 6).toString() === "GIF89a" ||
    buf.slice(0, 6).toString() === "GIF87a"
  );
}

async function download(rel) {
  const dest = path.join(PUBLIC, rel.slice(1));
  if (fs.existsSync(dest) && isImage(fs.readFileSync(dest))) return dest;
  const res = await fetch(ORIGIN + rel, {
    headers: { "User-Agent": UA, Accept: "image/*" },
  });
  const buf = Buffer.from(await res.arrayBuffer());
  if (!isImage(buf)) throw new Error("not image " + rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
  return dest;
}

// download targets
for (const target of new Set(Object.values(map))) {
  try {
    await download(target);
    console.log("ok", target);
  } catch (e) {
    console.log("fail", target, e.message);
  }
}

// also copy mapped sources onto broken paths so existing markup still works
for (const [from, to] of Object.entries(map)) {
  const src = path.join(PUBLIC, to.slice(1));
  const dest = path.join(PUBLIC, from.slice(1));
  if (!fs.existsSync(src)) continue;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  console.log("copied", to, "->", from);
}

// rewrite content to prefer working originals (cleaner)
function rewriteFile(file) {
  let raw = fs.readFileSync(file, "utf8");
  let next = raw;
  for (const [from, to] of Object.entries(map)) {
    next = next.split(from).join(to);
  }
  // protocol-relative media -> root relative
  next = next
    .replace(/https?:\/\/(?:www\.)?raadrecruitment\.ae\//g, "/")
    .replace(/\/\/(?:www\.)?raadrecruitment\.ae\//g, "/");
  if (next !== raw) {
    fs.writeFileSync(file, next);
    console.log("rewrote", file);
  }
}

for (const f of [
  "src/data/pages.json",
  "src/data/posts.json",
  "src/data/header.html",
  "src/data/footer.html",
]) {
  rewriteFile(f);
}

// Hide broken avatar PNGs (dead on live origin too) — swap to transparent 1x1 to avoid layout shift
const dead = [
  "/wp-content/uploads/2024/03/Female-01.png",
  "/wp-content/uploads/2024/03/Male-01.png",
  "/wp-content/uploads/2024/03/Female-02.png",
  "/wp-content/uploads/2024/03/Male-03.png",
  "/wp-content/uploads/2024/03/Female-03.png",
  "/wp-content/uploads/2024/03/Female-04.png",
  "/wp-content/uploads/2024/03/Male-02.png",
  "/wp-content/uploads/2024/03/Male-04.png",
  "/wp-content/uploads/2024/03/Female-05.png",
  "/wp-content/uploads/2024/03/Female-06.png",
  "/wp-content/uploads/2024/03/Female-07.png",
  "/wp-content/uploads/2024/03/Female-08.png",
  "/wp-content/uploads/2024/03/Female-09.png",
  "/wp-content/uploads/2024/03/Female-10.png",
  "/wp-content/uploads/2024/03/Female-11.png",
  "/wp-content/uploads/2024/03/Male-05.png",
  "/wp-content/uploads/2024/03/Male-06.png",
  "/wp-content/uploads/2024/03/Male-07.png",
  "/wp-content/uploads/2024/03/Male-08.png",
  "/wp-content/uploads/2024/03/Male-09.png",
];
// 1x1 png
const png1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5W3qUAAAAASUVORK5CYII=",
  "base64",
);
for (const rel of dead) {
  const dest = path.join(PUBLIC, rel.slice(1));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, png1x1);
}
console.log("wrote placeholder avatars", dead.length);
