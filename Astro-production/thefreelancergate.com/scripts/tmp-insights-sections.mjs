import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pages = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/pages.json"), "utf8"));
const h = pages.find((p) => p.path === "/insights/")?.bodyHtml || "";

const payroll = [...h.matchAll(/payroll-outsourcing-process[^"'\s>]*/gi)].slice(0, 5);
const featured = h.match(/ecs-posts[\s\S]{0,2500}/i)?.[0]?.replace(/\s+/g, " ").slice(0, 800);
const popular = h.match(/POPULAR[\s\S]{0,1500}/i)?.[0]?.replace(/\s+/g, " ").slice(0, 700);
const owlClasses = [...h.matchAll(/class="([^"]*owl[^"]*)"/gi)].slice(0, 10).map((m) => m[1]);
const postSlider = [...h.matchAll(/class="([^"]*post-slider[^"]*)"/gi)].slice(0, 5).map((m) => m[1]);
const navIcons = [...h.matchAll(/owl-nav|owl-prev|owl-next|fa-angle/gi)].slice(0, 10).map((m) => m[0]);

console.log(
  JSON.stringify(
    {
      payroll,
      featured,
      popular,
      owlClasses,
      postSlider,
      navIcons,
      hasEcs: /ecs-posts/.test(h),
      hasBlogCarousel: /blog_carousel/.test(h),
    },
    null,
    2,
  ),
);
