import * as cheerio from "cheerio";
import fs from "node:fs";
import path from "node:path";

const liveContact = await (await fetch("https://emiratiguard.com/contact-us/?nowprocket=1", {
  headers: { "User-Agent": "EMIRATIGUARD" },
})).text();
const liveHome = await (await fetch("https://emiratiguard.com/?nowprocket=1", {
  headers: { "User-Agent": "EMIRATIGUARD" },
})).text();

console.log({
  contactFooterRaj: liveContact.includes("footer_raj"),
  homeFooterRaj: liveHome.includes("footer_raj"),
  contactHas901e7f1: liveContact.includes("901e7f1"),
  homeHas901e7f1: liveHome.includes("901e7f1"),
});

// Download full child theme CSS
const liveChild = await (await fetch(
  "https://emiratiguard.com/wp-content/themes/hello-elementor-child-theme/style.css",
  { headers: { "User-Agent": "EMIRATIGUARD" } },
)).text();
fs.mkdirSync("public/wp-content/themes/hello-elementor-child-theme", { recursive: true });
fs.writeFileSync("public/wp-content/themes/hello-elementor-child-theme/style.css", liveChild);
console.log("wrote child theme css", liveChild.length);

// Extract Elementor custom CSS / global custom CSS from live contact head
const customCss = [...liveContact.matchAll(/<style[^>]*id=["']([^"']*)["'][^>]*>([\s\S]*?)<\/style>/gi)]
  .map((m) => ({ id: m[1], len: m[2].length, preview: m[2].slice(0, 120) }));
console.log("style tags", customCss);

const allInline = [...liveContact.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
const joined = allInline.join("\n");
fs.writeFileSync("_crawl/live-contact-inline.css", joined);
console.log("inline css bytes", joined.length);

// Check if main-form exists in CF7 form HTML on live via shortcode output
const $ = cheerio.load(liveContact);
console.log("main-form parent", $(".main-form").parent().attr("class"));
console.log("main-form html start", $(".main-form").toString().slice(0, 200));
