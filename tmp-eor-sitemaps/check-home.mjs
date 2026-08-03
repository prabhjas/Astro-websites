import fs from "node:fs";
const pages = JSON.parse(
  fs.readFileSync("Astro-production/eormiddleast.com/src/data/pages.json", "utf8"),
);
const home = pages.find((p) => p.path === "/");
console.log(home ? { id: home.id, title: home.title, css: home.elementorCss, body: (home.bodyHtml || "").length } : "NO HOME");
const site = JSON.parse(
  fs.readFileSync("Astro-production/eormiddleast.com/src/data/site.json", "utf8"),
);
console.log({
  name: site.name,
  logo: site.logo,
  header: (site.headerHtml || "").length,
  footer: (site.footerHtml || "").length,
  css: site.cssFiles?.length,
});
