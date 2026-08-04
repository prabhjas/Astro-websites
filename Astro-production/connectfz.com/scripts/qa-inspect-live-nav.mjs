import * as cheerio from "cheerio";
import fs from "node:fs";

const LIVE = "https://connectfz.com/?nowprocket=1";
const html = await (await fetch(LIVE, { headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)" } })).text();
const $ = cheerio.load(html);
const header = $("header.header1").first();
fs.writeFileSync("_crawl/live-header.html", $.html(header));
console.log("navbar-toggle", $(".navbar-toggle").length);
console.log("navbar classes", $("#navbar").attr("class"));
console.log("menu items top", $("#navbar .nav-menu > li").length);
// Sticky?
console.log("sticky classes", $("[class*='sticky'], .is-sticky, #modeltheme-main-head").attr("class"));
// Inline styles related to header
const styleHints = [];
for (const m of html.matchAll(/header1[\s\S]{0,200}|navbar-toggle[\s\S]{0,120}|#navbar[\s\S]{0,120}/g)) {
  /* skip */
}
console.log("oklahoma-custom present", html.includes("oklahoma-custom.js"));
console.log("bootstrap present", html.includes("bootstrap.min.js"));
console.log("mt-plugins", html.includes("mt-plugins.js"));
