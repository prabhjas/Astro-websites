import fs from "node:fs";
const s = JSON.parse(
  fs.readFileSync("Astro-production/eormiddleast.com/src/data/sitemap-urls.json", "utf8"),
);
const pages = JSON.parse(
  fs.readFileSync("Astro-production/eormiddleast.com/src/data/pages.json", "utf8"),
);
const all = [...s.pages, ...s.posts, ...s.guides, ...s.country, ...s.eor];
const blogish = all.filter((r) => /blog/i.test(r.path));
console.log("sitemap blog paths", blogish);
console.log(
  "pages with blog",
  pages.filter((p) => /blog/i.test(p.path)).map((p) => p.path),
);
