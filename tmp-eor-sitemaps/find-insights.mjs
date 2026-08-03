import fs from "node:fs";
const pages = JSON.parse(
  fs.readFileSync("Astro-production/eormiddleast.com/src/data/pages.json", "utf8"),
);
const hit = pages.filter((p) => /insight|news|article|blog/i.test(p.path + p.title));
console.log(hit.map((p) => ({ path: p.path, id: p.id, title: p.title.slice(0, 60), body: (p.bodyHtml || "").length })));
