import * as cheerio from "cheerio";
import fs from "node:fs";

const LIVE = "https://ngmanpower.com";
const LOCAL = "http://127.0.0.1:5102";

async function get(url) {
  const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, redirect: "follow" });
  return r.text();
}

function videoReport(html, label) {
  const $ = cheerio.load(html);
  const vids = [];
  $("video").each((_, el) => {
    const $el = $(el);
    vids.push({
      src: $el.attr("src") || "",
      sources: $el
        .find("source")
        .map((i, s) => $(s).attr("src"))
        .get(),
      class: ($el.attr("class") || "").slice(0, 80),
      autoplay: $el.attr("autoplay") != null,
      muted: $el.attr("muted") != null,
      loop: $el.attr("loop") != null,
      parent: $el.parent().attr("class") || "",
    });
  });
  // elementor background video settings
  const bgSettings = [];
  $("[data-settings]").each((_, el) => {
    const s = $(el).attr("data-settings") || "";
    if (/video|mp4|youtube|vimeo/i.test(s)) {
      bgSettings.push({
        id: $(el).attr("data-id"),
        settings: s.slice(0, 300),
      });
    }
  });
  const iframes = $("iframe")
    .map((_, el) => $(el).attr("src") || $(el).attr("data-src") || "")
    .get()
    .filter((s) => /youtube|vimeo|video/i.test(s));
  console.log("\n===", label, "===");
  console.log("video tags", vids.length, vids);
  console.log("bg video settings", bgSettings.length, bgSettings.slice(0, 5));
  console.log("iframes", iframes);

  // forms with real fields
  const forms = [];
  $("form").each((_, el) => {
    const $f = $(el);
    const inputs = $f
      .find("input:not([type=hidden]), textarea, select")
      .map((i, inp) => $(inp).attr("name") || $(inp).attr("type"))
      .get();
    if (inputs.length) {
      forms.push({
        id: $f.attr("id"),
        class: ($f.attr("class") || "").slice(0, 60),
        inputs: inputs.slice(0, 12),
      });
    }
  });
  console.log("real forms", forms);
}

const liveHome = await get(LIVE + "/?nowprocket=1");
const localHome = await get(LOCAL + "/");
fs.writeFileSync("_crawl/live-home-snip.html", liveHome.slice(0, 5000));
videoReport(liveHome, "LIVE HOME");
videoReport(localHome, "LOCAL HOME");

// Extract video-related HTML chunks from live
const $ = cheerio.load(liveHome);
const chunks = [];
$("video, .elementor-background-video-container, .elementor-widget-video").each((_, el) => {
  chunks.push($.html(el).slice(0, 500));
});
fs.writeFileSync("_crawl/live-video-chunks.html", chunks.join("\n\n----\n\n"));
console.log("wrote chunks", chunks.length);
