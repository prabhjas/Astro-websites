import fs from "node:fs";

const pages = JSON.parse(
  fs.readFileSync("Astro-production/eormiddleast.com/src/data/pages.json", "utf8"),
);
const posts = JSON.parse(
  fs.readFileSync("Astro-production/eormiddleast.com/src/data/posts.json", "utf8"),
);
const all = [...pages, ...posts];
const withBody = all.filter((p) => p.bodyHtml && p.bodyHtml.length > 500);
const withContent = all.filter((p) => p.content && p.content.length > 200);
const thin = all.filter(
  (p) =>
    (!p.bodyHtml || p.bodyHtml.length < 500) &&
    (!p.content || p.content.length < 200),
);
const usable = all.filter(
  (p) =>
    (p.bodyHtml && p.bodyHtml.length > 500) ||
    (p.content && p.content.length > 200),
);
console.log({
  total: all.length,
  withBody: withBody.length,
  withContent: withContent.length,
  usable: usable.length,
  thin: thin.length,
});
console.log(
  "thin sample",
  thin.slice(0, 20).map((p) => ({
    path: p.path,
    c: (p.content || "").length,
    b: (p.bodyHtml || "").length,
    wp: p.wpType || p.type,
  })),
);

const samplePath = "tmp-eor-sitemaps/sample-post.html";
if (fs.existsSync(samplePath)) {
  const h = fs.readFileSync(samplePath, "utf8");
  console.log("sample len", h.length);
  const types = [...h.matchAll(/data-elementor-type="([^"]+)"/g)].map((x) => x[1]);
  console.log("elementor types", [...new Set(types)]);
  console.log("has site-main", h.includes("site-main"));
  console.log("has entry-content", h.includes("entry-content"));
}
