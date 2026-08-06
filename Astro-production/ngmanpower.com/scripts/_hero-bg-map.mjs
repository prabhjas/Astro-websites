import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const slugs = [
  "construction",
  "manufacturing",
  "oil-and-gas",
  "logistics",
  "electromechanical",
  "factories",
  "food-industry",
  "landscaping",
  "warehouse",
];

for (const slug of slugs) {
  const css = readFileSync(join(ROOT, `public/css/page-design/${slug}.css`), "utf8");
  // first hero rule = default desktop person image
  const m = css.match(/^\.(us_custom_[a-f0-9]+)\{([^}]+)\}/);
  console.log(slug, m?.[1], m?.[2]?.slice(0, 220));
}
