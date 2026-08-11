#!/usr/bin/env node
import { load } from "cheerio";

async function near(origin, path) {
  const suffix = origin.includes("127") ? "" : "?nowprocket=1";
  const html = await (await fetch(origin + path + suffix)).text();
  const $ = load(html);
  let h = null;
  $("h1,h2,h3,h4,.elementor-heading-title").each((_, el) => {
    const t = $(el).text();
    if (/Success/i.test(t) && /Story/i.test(t)) {
      h = $(el);
      return false;
    }
  });
  if (!h) {
    console.log(origin.includes("127") ? "local" : "live", path, "no heading");
    return;
  }
  const wrap = h.closest(".elementor-element").parent();
  const chunk = (wrap.html() || "") + (wrap.next().html() || "") + (wrap.next().next().html() || "");
  console.log(origin.includes("127") ? "local" : "live", path, {
    n2: [...new Set(chunk.match(/n2-ss-\d+/g) || [])],
    quote: /Emiratisation goals/i.test(chunk),
    hasSmartSliderShortcode: /smartslider|n2-ss-slider/i.test(chunk),
    chunkLen: chunk.length,
  });
}

for (const p of ["/emiratisation/", "/staff-outsourcing-in-uae/", "/recruitment/"]) {
  await near("https://raadrecruitment.ae", p);
  await near("http://127.0.0.1:5113", p);
}
