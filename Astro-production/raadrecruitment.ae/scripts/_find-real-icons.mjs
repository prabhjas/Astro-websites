import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const pages = JSON.parse(readFileSync(join(ROOT, "src/data/pages.json"), "utf8"));
const home = pages.find((p) => p.path === "/").bodyHtml;

// All iconbox blocks with titles + img src or i class
const boxes = [...home.matchAll(/w-iconbox[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g)];
console.log("box matches rough", boxes.length);

const simpler = [...home.matchAll(/<h4 class="w-iconbox-title">([^<]+)<\/h4>/g)].map((m) => m[1]);
console.log("titles", simpler);

const iconSrcs = [...home.matchAll(/w-iconbox-icon[^>]*>[\s\S]*?(?:src="([^"]+)"|class="([^"]*fas[^"]*)")/g)].map(
  (m) => m[1] || m[2],
);
console.log("icon sources", iconSrcs);

// List 2023/05 for anything icon-like
const dir = join(ROOT, "public/wp-content/uploads/2023/05");
const files = readdirSync(dir).filter((f) => /icon|vector|govt|check|cost|flex|train|time|shield|badge/i.test(f));
console.log("icon-like files", files);

// Also check 2023/06
try {
  const d2 = join(ROOT, "public/wp-content/uploads/2023/06");
  console.log(
    "2023/06 icon-like",
    readdirSync(d2).filter((f) => /icon|vector|govt|check|cost|flex|train|time|shield|badge/i.test(f)),
  );
} catch {}

// Check if live HTML uses different Vector or font icons now
const live = await (
  await fetch("/?nowprocket=1", { headers: { "User-Agent": "Mozilla/5.0" } })
).text();
const liveIcons = [...live.matchAll(/We are Govt[\s\S]{0,800}/)].map((m) => m[0].slice(0, 500));
console.log("\nlive govt chunk", liveIcons[0]?.replace(/\s+/g, " "));

// Try alternate Vector URLs
for (const u of [
  "/wp-content/uploads/2023/05/Vector.png",
  "/wp-content/uploads/2023/05/Vector-1.png",
  "/wp-content/uploads/2023/05/vector-icon.png",
]) {
  try {
    const r = await fetch(u, { method: "HEAD", headers: { "User-Agent": "Mozilla/5.0" } });
    console.log(u, r.status, r.headers.get("content-type"), r.headers.get("content-length"));
  } catch (e) {
    console.log(u, e.message);
  }
}
