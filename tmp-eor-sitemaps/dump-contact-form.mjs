import fs from "node:fs";
const pages = JSON.parse(
  fs.readFileSync("Astro-production/eormiddleast.com/src/data/pages.json", "utf8"),
);
const p = pages.find((x) => x.path === "/contact-us/");
const h = p?.bodyHtml || "";
const start = h.indexOf("<form");
const end = h.indexOf("</form>") + 7;
fs.writeFileSync("tmp-eor-sitemaps/contact-form-snippet.html", h.slice(start, end));
console.log("wrote snippet", end - start);

// also find CF7 forms in other pages (footer/header)
const site = JSON.parse(
  fs.readFileSync("Astro-production/eormiddleast.com/src/data/site.json", "utf8"),
);
for (const [label, html] of [
  ["header", site.headerHtml || ""],
  ["footer", site.footerHtml || ""],
]) {
  console.log(label, "wpcf7", html.includes("wpcf7"), "phonetext", /phonetext/i.test(html));
}
