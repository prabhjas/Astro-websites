import fs from "node:fs";
import * as cheerio from "cheerio";

const html = fs.readFileSync("_crawl/live-post-wheel.html", "utf8");
const $ = cheerio.load(html);
const root = $(".elementor-652");
const widgets = [
  ...new Set(root.find("[data-widget_type]").map((_, el) => $(el).attr("data-widget_type")).get()),
];
console.log("widgets", widgets);
console.log("post-info HTML sample:");
console.log(root.find(".elementor-post-info").parent().html()?.slice(0, 800));
console.log("\n--- theme post content parent ---");
console.log(
  root
    .find(".elementor-widget-theme-post-content")
    .first()
    .parent()
    .find("[data-widget_type]")
    .map((_, el) => $(el).attr("data-widget_type"))
    .get(),
);
