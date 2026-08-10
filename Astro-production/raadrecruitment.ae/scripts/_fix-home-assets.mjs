import { createWriteStream, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = join(ROOT, "public");
const ORIGIN = "";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

async function forceDownload(path) {
  const dest = join(PUBLIC, ...path.split("/").filter(Boolean));
  mkdirSync(dirname(dest), { recursive: true });
  const res = await fetch(ORIGIN + path + "?v=" + Date.now(), {
    headers: { "User-Agent": UA, Referer: ORIGIN + "/", "Cache-Control": "no-cache" },
    redirect: "follow",
  });
  if (!res.ok || !res.body) throw new Error(`${res.status} ${path}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
  console.log("DL", path, "bytes", (await import("node:fs")).statSync(dest).size);
}

// Force re-fetch icon assets that may be wrong locally
const force = [
  "/wp-content/uploads/2023/05/Vector.png",
  "/wp-content/uploads/2023/05/Frame-338.png",
  "/wp-content/uploads/2023/05/Ellipse-1.png",
  "/wp-content/uploads/2023/05/arrow-inclined.png",
  "/wp-content/uploads/2023/05/Placeholder.jpg",
  "/wp-content/uploads/2023/12/ManP.png",
  "/wp-content/uploads/2023/05/bxs_quote-right.png",
  "/wp-content/uploads/2023/06/testimonial2.png",
  "/wp-content/uploads/2023/06/testimonial4.png",
  "/wp-content/uploads/2023/05/Group-21.png",
];
for (const p of force) {
  try {
    await forceDownload(p);
  } catch (e) {
    console.warn("FAIL", p, e.message);
  }
}

// Inspect live homepage for icon srcs near Govt Authorized / different icon files
const live = await (
  await fetch(ORIGIN + "/?nowprocket=1", { headers: { "User-Agent": UA } })
).text();
const chunkStart = live.indexOf("We are Govt Authorized");
const chunk = live.slice(chunkStart - 500, chunkStart + 3000);
const imgs = [...chunk.matchAll(/src=["']([^"']+)["']/gi)].map((m) => m[1]);
console.log("live govt-area imgs", imgs);

// Smart slider slide layer texts
const ss = live.match(/id="n2-ss-2"[\s\S]{0,8000}/)?.[0] || "";
const texts = [...ss.matchAll(/n2-ss-layer[^>]*>([\s\S]*?)<\/div>/gi)]
  .map((m) => m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
  .filter((t) => t.length > 20)
  .slice(0, 10);
console.log("live slider layer texts", texts);

// Check if local home slider has layer text
const pages = JSON.parse(
  (await import("node:fs")).readFileSync(join(ROOT, "src/data/pages.json"), "utf8"),
);
const home = pages.find((p) => p.path === "/")?.bodyHtml || "";
const ssLocal = home.match(/id="n2-ss-2"[\s\S]{0,8000}/)?.[0] || "";
const textsLocal = [...ssLocal.matchAll(/n2-ss-layer[^>]*>([\s\S]*?)<\/div>/gi)]
  .map((m) => m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
  .filter((t) => t.length > 20)
  .slice(0, 10);
console.log("local slider layer texts", textsLocal);
console.log("local ss len", ssLocal.length, "live ss snippet len", ss.length);
