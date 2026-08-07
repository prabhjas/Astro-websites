import { readFileSync, mkdirSync, writeFileSync, existsSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const pages = JSON.parse(readFileSync(join(ROOT, "src/data/pages.json"), "utf8"));
const team = pages.find((p) => p.path === "/meet-our-team/");
const html = team?.bodyHtml || team?.content || "";
console.log("html len", html.length);
console.log("has Neelisha", html.includes("Neelisha"));
console.log("has 2026/05", html.includes("2026/05"));
console.log("has scaled", html.includes("scaled"));

// Extract any upload paths
const uploads = [...html.matchAll(/\/wp-content\/uploads\/[^\"'\\]+/g)].map((m) => m[0].split("?")[0]);
console.log("uploads count", uploads.length);
console.log([...new Set(uploads)].slice(0, 40).join("\n"));

// Show snippet around Neelisha
const i = html.indexOf("Neelisha");
console.log("\nsnippet", html.slice(Math.max(0, i - 200), i + 300).replace(/\s+/g, " "));

// Try live meet-our-team
for (const u of [
  "https://connectresources.ae/meet-our-team/?nowprocket=1",
  "https://c-uae.com/meet-our-team/?nowprocket=1",
]) {
  const r = await fetch(u, { headers: { "User-Agent": "Mozilla/5.0" } });
  console.log("\nlive", r.status, u);
  if (!r.ok) continue;
  const t = await r.text();
  const imgs = [...new Set([...t.matchAll(/https?:\/\/[^\"'\s>]+\/uploads\/[^\"'\s>]+\.(?:png|jpg|webp)/gi)].map((m) => m[0]))];
  const localImgs = [...new Set([...t.matchAll(/\/wp-content\/uploads\/[^\"'\s>]+\.(?:png|jpg|webp)/gi)].map((m) => m[0]))];
  console.log("abs imgs", imgs.slice(0, 10));
  console.log("rel imgs sample", localImgs.filter((x) => /2026|scaled|Neelisha|Harneet/i.test(x)).slice(0, 20));
}
