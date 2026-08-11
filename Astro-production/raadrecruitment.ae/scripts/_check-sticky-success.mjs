#!/usr/bin/env node
import fs from "node:fs";

for (const f of ["post-558.css", "post-909.css"]) {
  const css = fs.readFileSync(`public/wp-content/uploads/elementor/css/${f}`, "utf8");
  console.log("====", f);
  let idx = 0;
  while ((idx = css.indexOf("position: sticky", idx)) !== -1) {
    console.log(css.slice(Math.max(0, idx - 220), idx + 60).replace(/\s+/g, " "));
    idx += 16;
  }
}

const html = await (await fetch("http://127.0.0.1:5113/blog/")).text();
console.log("prabhjas", html.includes("prabhjas"));
const stickyEls = [...html.matchAll(/data-settings="([^"]*sticky[^"]*)"/gi)].map((x) =>
  x[1].slice(0, 160),
);
console.log("stickyEls", stickyEls);
const prabh = html.match(/class="[^"]*prabhjas[^"]*"/);
console.log("prabhjas class", prabh && prabh[0]);

// success story section surrounding n2 on emiratisation local
const em = await (await fetch("http://127.0.0.1:5113/emiratisation/")).text();
const i = em.search(/Our\s*Success\s*Story/i);
console.log("em success idx", i);
console.log(em.slice(Math.max(0, i - 200), i + 800).replace(/\s+/g, " ").slice(0, 900));
console.log("n2-ss-2 present", em.includes("n2-ss-2"));
console.log("n2-ss-loaded init file", fs.existsSync("public/scripts/smart-slider/init-home.js"));
