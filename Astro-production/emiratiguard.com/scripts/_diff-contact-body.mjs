import fs from "node:fs";
import * as cheerio from "cheerio";

const ORIGIN = "https://emiratiguard.com";
const liveHtml = await (await fetch(`${ORIGIN}/contact-us/?nowprocket=1`, {
  headers: { "User-Agent": "EMIRATIGUARD-Astro/1.0" },
})).text();
const $live = cheerio.load(liveHtml);
const livePage = $live('[data-elementor-type="wp-page"]').first();
const liveBody = livePage.html() || "";

const pages = JSON.parse(fs.readFileSync("src/data/pages.json", "utf8"));
const page = pages.find((p) => p.path === "/contact-us/");
const localBody = page.bodyHtml || "";

console.log({
  liveBodyLen: liveBody.length,
  localBodyLen: localBody.length,
  liveHasContactImg: liveBody.includes("contact-img"),
  localHasContactImg: localBody.includes("contact-img"),
  liveHasForm: /wpcf7-form/.test(liveBody),
  localHasForm: /wpcf7-form/.test(localBody),
  liveHasGetHelp: /Get help with|Free zone/i.test(liveBody),
  localHasGetHelp: /Get help with|Free zone/i.test(localBody),
  liveHasConsent: /I consent to receiving marketing/i.test(liveBody),
  localHasConsent: /I consent to receiving marketing/i.test(localBody),
  contactImgExists: fs.existsSync("public/wp-content/uploads/2024/07/contact-img.webp"),
});

// Extract image widgets near the form
const $lb = cheerio.load(liveBody);
const imgs = [];
$lb("img").each((_, el) => {
  imgs.push({
    src: $lb(el).attr("src"),
    class: $lb(el).attr("class"),
    alt: $lb(el).attr("alt"),
  });
});
console.log("live page imgs", imgs);

const $loc = cheerio.load(localBody);
const limgs = [];
$loc("img").each((_, el) => {
  limgs.push({
    src: $loc(el).attr("src"),
    class: $loc(el).attr("class"),
    alt: $loc(el).attr("alt"),
  });
});
console.log("local page imgs", limgs);

// Compare top-level structure markers
function markers(html) {
  return {
    sections: (html.match(/elementor-section|e-con/g) || []).length,
    forms: (html.match(/wpcf7/g) || []).length,
    buttons: (html.match(/elementor-button/g) || []).length,
    headings: (html.match(/elementor-heading-title/g) || []).length,
  };
}
console.log({ live: markers(liveBody), local: markers(localBody) });
