import * as cheerio from "cheerio";
import fs from "node:fs";

const live = await (await fetch("https://emiratiguard.com/contact-us/?nowprocket=1", {
  headers: { "User-Agent": "EMIRATIGUARD" },
})).text();
const $ = cheerio.load(live);
const form = $(".cntct-form").first();
console.log("cntct-form html snippet:");
console.log(form.html()?.slice(0, 800));
console.log("\nclasses near form:");
form.find("*").slice(0, 20).each((_, el) => {
  const c = $(el).attr("class");
  if (c && /form|main/i.test(c)) console.log(c);
});
console.log("main-form count", $(".main-form, .form-main").length);
$(".main-form, .form-main").each((_, el) => console.log("found", $(el).attr("class")));

// Check child theme file size local vs live
const localChild = fs.readFileSync("public/wp-content/themes/hello-elementor-child-theme/style.css", "utf8");
const liveChild = await (await fetch("https://emiratiguard.com/wp-content/themes/hello-elementor-child-theme/style.css", {
  headers: { "User-Agent": "EMIRATIGUARD" },
})).text();
console.log({ localChild: localChild.length, liveChild: liveChild.length });
console.log("live has main-form submit", /\.main-form[^{]*\[type=.submit/.test(liveChild));
console.log("live has form-main", /form-main/.test(liveChild));
const idx = liveChild.indexOf(".main-form");
console.log("snippet", liveChild.slice(idx, idx + 400));

// inline styles on live
const inlines = [...live.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
const relevant = inlines.filter((t) => /form-main|main-form|wpcf7-submit|3D1457|ffdd04/i.test(t));
console.log("relevant inline styles count", relevant.length);
for (const t of relevant.slice(0, 3)) console.log("---\n", t.slice(0, 500));
