import fs from "node:fs";
import * as cheerio from "cheerio";

const ORIGIN = "https://spheavyrental.ae";
const paths = ["/about-us/", "/heavy-machinery-rental/"];
const pages = JSON.parse(fs.readFileSync("src/data/pages.json", "utf8"));

function stripDomain(html) {
  return html
    .replaceAll("https://spheavyrental.ae", "")
    .replaceAll("http://spheavyrental.ae", "")
    .replaceAll("//spheavyrental.ae", "");
}

for (const pathUrl of paths) {
  console.log("SSR extract", pathUrl);
  const html = await (
    await fetch(`${ORIGIN}${pathUrl}?nowprocket=1`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    })
  ).text();
  const $ = cheerio.load(html);
  const el = $('[data-elementor-type="wp-page"]').first();
  // strip initialized swiper classes if any leaked
  el.find(".swiper-initialized").removeClass("swiper-initialized");
  el.find(".swiper-slide-duplicate").remove();
  el.find("[data-swiper-slide-index]").removeAttr("data-swiper-slide-index");
  const body = stripDomain(el.toString());
  const entry = pages.find((p) => p.path === pathUrl);
  if (entry) {
    entry.bodyHtml = body;
    console.log(
      "  slides",
      (body.match(/swiper-slide/g) || []).length,
      "len",
      body.length,
    );
  }
}

fs.writeFileSync("src/data/pages.json", JSON.stringify(pages, null, 2));

// Prepare single post template placeholders
let tpl = fs.readFileSync("src/data/single-post-template.html", "utf8");
const $t = cheerio.load(tpl, { decodeEntities: false, xmlMode: false });

// Title
$t(".elementor-widget-theme-post-title .elementor-heading-title").html("<!--POST_TITLE-->");
// Post info / date / author — keep structure, replace text nodes carefully
$t(".elementor-widget-theme-post-content .elementor-widget-container").html("<!--POST_CONTENT-->");

// Featured image if present
const featured = $t(".elementor-widget-theme-post-featured-image img").first();
if (featured.length) {
  featured.attr("src", "<!--POST_FEATURED_SRC-->");
  featured.attr("srcset", "");
  featured.attr("alt", "<!--POST_TITLE_TEXT-->");
}

tpl = $t.root().children().toString();
if (!tpl.includes("<!--POST_CONTENT-->")) {
  // fallback string replace
  tpl = fs.readFileSync("src/data/single-post-template.html", "utf8");
}
fs.writeFileSync("src/data/single-post-template.html", tpl);
console.log(
  "template placeholders",
  {
    title: tpl.includes("<!--POST_TITLE-->"),
    content: tpl.includes("<!--POST_CONTENT-->"),
    featured: tpl.includes("<!--POST_FEATURED_SRC-->"),
    len: tpl.length,
  },
);
