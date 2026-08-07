import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pages = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/pages.json"), "utf8"));
const h = pages.find((p) => p.path === "/insights/")?.bodyHtml || "";

const art = h.match(/<article[^>]*post-29652[\s\S]*?<\/article>/i)?.[0] || "";
const img = art.match(/<img[\s\S]*?>/i)?.[0] || "";
const carousel = h.match(/elementor-widget-loop-carousel[\s\S]{0,2500}/i)?.[0]?.replace(/\s+/g, " ") || "";
const swiper = [...h.matchAll(/class="([^"]*swiper[^"]*)"/gi)].slice(0, 8).map((m) => m[1]);
const arrows = h.match(/elementor-swiper-button[\s\S]{0,200}/i)?.[0] || "";

console.log(
  JSON.stringify(
    {
      img,
      hasSrcset: /srcset=/i.test(img),
      carousel: carousel.slice(0, 900),
      swiper,
      arrows: arrows.slice(0, 300),
      template21574: /elementor-21574|template_id&quot;:&quot;21574/.test(h),
    },
    null,
    2,
  ),
);

// Check image files for first article
const src = img.match(/src=["']([^"']+)["']/i)?.[1];
const srcset = [...(img.matchAll(/(\/wp-content\/uploads\/[^\s,"']+)/g) || [])].map((m) => m[1]);
const checks = [];
for (const u of [src, ...srcset].filter(Boolean).slice(0, 8)) {
  const rel = u.replace(/^https?:\/\/[^/]+/, "");
  const dest = path.join(ROOT, "public", rel.replace(/^\//, ""));
  checks.push({
    rel,
    exists: fs.existsSync(dest),
    size: fs.existsSync(dest) ? fs.statSync(dest).size : 0,
  });
}
console.log("files", JSON.stringify(checks, null, 2));
