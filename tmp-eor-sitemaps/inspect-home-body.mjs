import fs from "node:fs";
const pages = JSON.parse(
  fs.readFileSync("Astro-production/eormiddleast.com/src/data/pages.json", "utf8"),
);
const home = pages.find((p) => p.path === "/");
const h = home?.bodyHtml || home?.content || "";
console.log({
  id: home?.id,
  title: home?.title,
  bodyLen: (home?.bodyHtml || "").length,
  contentLen: (home?.content || "").length,
  hasForm: /<form/i.test(h),
  hasGetInTouch: /get in touch/i.test(h),
  hasContact: /contact/i.test(h),
  hasWpcf7: /wpcf7/i.test(h),
});

const live = fs.readFileSync("tmp-eor-sitemaps/live-home.html", "utf8");
// extract wp-page body length from live
const idx = live.indexOf('data-elementor-type="wp-page"');
console.log("live wp-page idx", idx, "live len", live.length);
console.log("live forms in page", (live.match(/<form/gi) || []).length);

// How live hides transaction_hide
const cssHits = [...live.matchAll(/transaction_hide[^,{]*\{[^}]+\}/gi)].slice(0, 5);
console.log("css rules", cssHits.map((m) => m[0]));
const styleBlocks = [...live.matchAll(/#transaction_hide[^<{]*\{[^}]*\}/gi)];
console.log("id rules", styleBlocks.slice(0, 5).map((m) => m[0]));
