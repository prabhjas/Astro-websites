import { readFileSync } from "fs";
const h = readFileSync("src/legacy/homepage.cleaned.html","utf8");
const live = readFileSync(".tmp-qa/live-home.html","utf8");

function formCtx(html, label) {
  const i = html.search(/wpcf7-f18794|class="wpcf7 /);
  console.log("\n===", label, "form ctx ===");
  if (i < 0) { console.log("not found"); return; }
  console.log(html.slice(Math.max(0,i-400), i+600).replace(/\s+/g," ").slice(0,900));
}
formCtx(h, "local");
formCtx(live, "live");

function sliderCtx(html, label) {
  const i = html.search(/slider-sec/);
  console.log("\n===", label, "slider-sec ===", i);
  if (i < 0) return;
  console.log(html.slice(i, i+500).replace(/\s+/g," ").slice(0,500));
  console.log("owl-carousel class present after init markup?", /slider-sec[\s\S]{0,2000}owl-carousel/.test(html));
}
sliderCtx(h, "local");
sliderCtx(live, "live");

// kzform class usage
console.log("\nlocal kzform count", (h.match(/kzform/g)||[]).length);
console.log("live kzform count", (live.match(/kzform/g)||[]).length);
console.log("local has class kzform on element", /class="[^"]*kzform/.test(h));
console.log("live has class kzform on element", /class="[^"]*kzform/.test(live));
