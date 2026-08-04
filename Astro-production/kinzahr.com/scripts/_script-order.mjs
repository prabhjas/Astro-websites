import { readFileSync } from "fs";
const h = readFileSync("src/legacy/homepage.cleaned.html","utf8");
const scripts = [...h.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].map((m,i) => {
  const attrs = m[1];
  const src = (attrs.match(/\bsrc=(['"])(.*?)\1/i)||[])[2] || "";
  const id = (attrs.match(/\bid=(['"])(.*?)\1/i)||[])[2] || "";
  const body = (m[2]||"").replace(/\s+/g," ").trim().slice(0,80);
  return { i, id, src: src.slice(0,100), body, hasOwl: /owlCarousel|slider-sec/.test(m[0]) };
});
scripts.filter(s => /jquery|owl|swiper|wpcf7|intlTel|slider|astro-mirror/i.test(s.src+s.id+s.body) || s.hasOwl)
  .forEach(s => console.log(JSON.stringify(s)));
console.log("total scripts", scripts.length);
