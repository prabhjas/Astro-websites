import * as cheerio from "cheerio";
import fs from "node:fs";

const html = await (
  await fetch("https://connectfz.com/?nowprocket=1", { headers: { "User-Agent": "Mozilla/5.0" } })
).text();
const $ = cheerio.load(html);

// Find floating / whatsapp related nodes
const suspects = [];
$("*").each((_, el) => {
  const cls = ($(el).attr("class") || "") + " " + ($(el).attr("id") || "");
  if (/float|whatsapp|wa-|wapp|joinchat|ht-ctc|quic|chaty/i.test(cls)) {
    suspects.push({
      tag: el.tagName,
      id: $(el).attr("id"),
      class: ($(el).attr("class") || "").slice(0, 120),
      href: $(el).attr("href") || $(el).find("a").first().attr("href") || "",
      html: $.html(el).slice(0, 400),
    });
  }
});
console.log("suspects", suspects.length);
for (const s of suspects.slice(0, 15)) console.log(JSON.stringify(s, null, 2));

// scripts mentioning whatsapp
const scripts = [...html.matchAll(/src=["']([^"']+)["']/gi)]
  .map((m) => m[1])
  .filter((u) => /whatsapp|float|chat|click.to.call|ht-ctc|joinchat/i.test(u));
console.log("scripts", scripts);

fs.writeFileSync("_crawl/live-float-suspects.json", JSON.stringify(suspects.slice(0, 30), null, 2));
