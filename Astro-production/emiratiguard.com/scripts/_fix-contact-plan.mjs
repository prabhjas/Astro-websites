import fs from "node:fs";
import * as cheerio from "cheerio";

const pages = JSON.parse(fs.readFileSync("src/data/pages.json", "utf8"));
const page = pages.find((p) => p.path === "/contact-us/");
const $ = cheerio.load(page.bodyHtml);
const wrap = $(".wpcf7").parent().parent();
console.log("form ancestors classes:");
$(".wpcf7").each((_, el) => {
  let cur = $(el);
  for (let i = 0; i < 8; i++) {
    console.log(i, cur.attr("class") || cur.prop("tagName"));
    cur = cur.parent();
  }
});

const child = fs.readFileSync("public/wp-content/themes/hello-elementor-child-theme/style.css", "utf8");
const mainForm = [...child.matchAll(/\.main-form[^{]*\{[^}]*\}/g)].map((m) => m[0]);
console.log("\nmain-form rules sample", mainForm.slice(0, 10));
console.log("has main-form submit", /main-form[^{]*\[type=.submit/.test(child));

const footer = fs.readFileSync("src/data/footer.html", "utf8");
const $f = cheerio.load(footer);
console.log("\nfooter top children:");
$f("footer").children().each((i, el) => {
  const $el = $f(el);
  console.log(i, $el.attr("data-id"), $el.attr("class")?.slice(0, 100), "form?", $el.find(".wpcf7").length > 0);
});
