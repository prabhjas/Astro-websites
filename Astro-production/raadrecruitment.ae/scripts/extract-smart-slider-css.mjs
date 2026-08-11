#!/usr/bin/env node
import { load } from "cheerio";
import fs from "node:fs";

async function collect(origin, path) {
  const html = await (
    await fetch(origin + path + (origin.includes("127") ? "" : "?nowprocket=1"))
  ).text();
  const $ = load(html);
  const styles = [];
  $("style").each((_, el) => {
    const t = $(el).html() || "";
    if (/n2-font-|n2-style-|n2-ss-4|data-related=\"n2-ss/.test(t)) {
      styles.push(t.length);
    }
  });
  const related = [...html.matchAll(/data-related=["'](n2-ss-\d+)["']/g)].map((m) => m[1]);
  const hasFontClass = html.includes("n2-font-48ca1d67608e07a2ee6350a1d5e3fbd2");
  const styleTagCount = (html.match(/<style[^>]*data-related/g) || []).length;
  return { stylesLens: styles, related, hasFontClass, styleTagCount, htmlLen: html.length };
}

for (const p of ["/emiratisation/"]) {
  console.log("live", await collect("https://raadrecruitment.ae", p));
  console.log("local", await collect("http://127.0.0.1:5113", p));
}

// grab all style[data-related=n2-ss-*] from live service pages
const needed = ["n2-ss-4", "n2-ss-5", "n2-ss-6", "n2-ss-2", "n2-ss-3"];
const outDir = "public/css/smart-slider";
fs.mkdirSync(outDir, { recursive: true });
const index = [];

for (const p of ["/", "/emiratisation/", "/staff-outsourcing-in-uae/", "/recruitment/"]) {
  const html = await (
    await fetch("https://raadrecruitment.ae" + p + "?nowprocket=1")
  ).text();
  const $ = load(html);
  $("style").each((_, el) => {
    const attrs = el.attribs || {};
    // cheerio: use attr
  });
  for (const m of html.matchAll(/<style([^>]*)>([\s\S]*?)<\/style>/gi)) {
    const attrs = m[1] || "";
    const css = (m[2] || "").trim();
    const rel = (attrs.match(/data-related=["']([^"']+)["']/i) || [])[1];
    if (!rel || !needed.includes(rel)) continue;
    const file = `${rel}.css`;
    const dest = `${outDir}/${file}`;
    if (!fs.existsSync(dest) || fs.statSync(dest).size < css.length) {
      fs.writeFileSync(
        dest,
        css
          .replace(/https?:\/\/(?:www\.)?raadrecruitment\.ae\//g, "/")
          .replace(/\/\/(?:www\.)?raadrecruitment\.ae\//g, "/") + "\n",
      );
      console.log("wrote", file, css.length, "from", p);
    }
    if (!index.includes(`/css/smart-slider/${file}`)) index.push(`/css/smart-slider/${file}`);
  }
}
fs.writeFileSync("src/data/smart-slider-css.json", JSON.stringify(index, null, 2) + "\n");
console.log("index", index);
