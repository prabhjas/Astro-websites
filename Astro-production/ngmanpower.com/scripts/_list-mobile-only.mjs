import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const pages = JSON.parse(readFileSync(join(ROOT, "src/data/pages.json"), "utf8"));
const paths = [
  "/construction/",
  "/manufacturing/",
  "/oil-and-gas/",
  "/logistics/",
  "/electromechanical/",
  "/factories/",
  "/food-industry/",
  "/landscaping/",
  "/warehouse/",
];

for (const path of paths) {
  const html = pages.find((p) => p.path === path).bodyHtml;
  const mobileSecs = [...html.matchAll(/<section class="([^"]*hide_on_default[^"]*)"[^>]*>[\s\S]*?<\/section>/g)];
  const imgs = mobileSecs.flatMap((m) => [...m[0].matchAll(/src="([^"]+\.(?:png|jpg|webp))"/g)].map((x) => x[1]));
  console.log(path, "mobile-only sections", mobileSecs.length, imgs.slice(0, 5));
}
