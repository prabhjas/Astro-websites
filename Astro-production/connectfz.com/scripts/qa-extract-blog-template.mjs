/**
 * Pull live single-post HTML structure for Connect FZ blog template.
 */
import fs from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";

const ORIGIN = "https://connectfz.com";
const SAMPLE = "/how-to-get-media-license-in-dubai/";

const html = await (
  await fetch(`${ORIGIN}${SAMPLE}?nowprocket=1`, { headers: { "User-Agent": "Mozilla/5.0" } })
).text();
const $ = cheerio.load(html);
fs.mkdirSync("_crawl", { recursive: true });
fs.writeFileSync("_crawl/live-blog-full.html", html);

console.log("body class", ($("body").attr("class") || "").slice(0, 250));
console.log(
  "h1",
  $("h1")
    .map((_, e) => $(e).text().trim())
    .get(),
);

// Find oklahoma / theme blog layout markers
const markers = [
  ".post-content",
  ".blog-post-single",
  ".single-post",
  "#content",
  ".main-content",
  ".sidebar",
  ".widget",
  ".wpcf7",
  ".author-bio",
  ".post-author",
  ".sharedaddy",
  ".elementor",
];
for (const sel of markers) {
  const n = $(sel).length;
  if (n) console.log(sel, n, $(sel).first().attr("class"));
}

// Dump content area between header and footer
const content =
  $("#content").html() ||
  $("main").html() ||
  $(".site-content").html() ||
  "";
fs.writeFileSync("_crawl/live-blog-content.html", content.slice(0, 200000));
console.log("content len", content.length);

// Structure outline
function outline(root, depth = 0) {
  if (depth > 4) return;
  root.children().each((_, el) => {
    const $el = $(el);
    const tag = el.tagName;
    if (!tag || ["script", "style", "link", "noscript"].includes(tag)) return;
    const cls = ($el.attr("class") || "").split(/\s+/).slice(0, 4).join(".");
    const id = $el.attr("id") || "";
    const text = $el.clone().children().remove().end().text().replace(/\s+/g, " ").trim().slice(0, 50);
    console.log(`${"  ".repeat(depth)}${tag}${id ? "#" + id : ""}${cls ? "." + cls : ""} ${text}`);
    if (["div", "section", "article", "aside", "main"].includes(tag)) outline($el, depth + 1);
  });
}
const root = $("#content").length ? $("#content") : $("main").length ? $("main") : $("body");
console.log("\n--- outline ---");
outline(root, 0);

// Extract CF7 form HTML for sidebar reuse
const form = $(".wpcf7").first();
if (form.length) {
  fs.writeFileSync("_crawl/live-blog-sidebar-form.html", $.html(form));
  console.log("saved sidebar form", $.html(form).length);
}

// CSS for single post
const css = [...html.matchAll(/href=["']([^"']+\.css[^"']*)["']/gi)]
  .map((m) => m[1].split("?")[0])
  .filter((u) => /post-\d+|single|blog|oklahoma/i.test(u));
console.log("relevant css", css.slice(0, 30));
