import fs from "node:fs";

const live = await (await fetch("https://c-uae.com/business-setup-dubai/")).text();
const local = await (await fetch("http://127.0.0.1:5092/business-setup-dubai/")).text();
fs.writeFileSync("scripts/_live-bsd.html", live);
fs.writeFileSync("scripts/_local-bsd.html", local);

function fonts(html) {
  const links = [...html.matchAll(/href="([^"]*fonts[^"]*)"/gi)].map((m) => m[1]);
  const families = [...html.matchAll(/family=([^&"']+)/g)].map((m) => decodeURIComponent(m[1]));
  const manrope = html.includes("Manrope") || html.toLowerCase().includes("manrope");
  return { linkCount: links.length, families: [...new Set(families)].slice(0, 20), manrope, sampleLinks: links.slice(0, 10) };
}

function formSnippet(html, label) {
  const i = html.indexOf("form-main");
  if (i < 0) return `${label}: no form-main`;
  // find cf7 form block
  const start = html.lastIndexOf("<div", i);
  const chunk = html.slice(Math.max(0, i - 200), i + 8000);
  const hasInfo = chunk.includes("info-data") || html.includes("info-data");
  const step5 = html.match(/cf7-step[^>]*(step-5|step5)[\s\S]{0,2500}/i)?.[0]?.slice(0, 1500);
  return { hasInfo, step5Preview: step5?.replace(/\s+/g, " ").slice(0, 800) };
}

console.log("LIVE fonts", fonts(live));
console.log("LOCAL fonts", fonts(local));

// extract form-main markup from both
function extractForm(html) {
  const m = html.match(/<div[^>]*class="[^"]*form-main[^"]*"[\s\S]*?<\/form>/i);
  return m?.[0] || null;
}
const lf = extractForm(live);
const locf = extractForm(local);
fs.writeFileSync("scripts/_live-form.html", lf || "none");
fs.writeFileSync("scripts/_local-form.html", locf || "none");
console.log("live form len", lf?.length, "local form len", locf?.length);

// live custom CSS for form
const cssUrls = [...live.matchAll(/href="(https:\/\/c-uae\.com\/[^"]+\.css[^"]*)"/g)].map((m) => m[1]);
const customish = cssUrls.filter((u) => /custom|theme|style|manrope|elementor/i.test(u)).slice(0, 30);
console.log("css urls sample", customish.slice(0, 15));

// pull live wp-custom equivalent
for (const u of [
  "https://c-uae.com/wp-content/themes/hello-elementor/style.css",
  "https://c-uae.com/wp-content/uploads/elementor/css/post-6327.css",
]) {
  try {
    const t = await (await fetch(u)).text();
    console.log(u, "len", t.length, "manrope", t.includes("Manrope"), "form-main", t.includes("form-main"));
  } catch (e) {
    console.log("fail", u, e.message);
  }
}

// find style with form-main on live page links
const styleHrefs = [...live.matchAll(/<link[^>]+href="([^"]+)"[^>]*>/g)].map((m) => m[1]);
const interesting = styleHrefs.filter((h) => /\.css/i.test(h));
console.log("all css count", interesting.length);

let foundCustom = null;
for (const href of interesting) {
  const abs = href.startsWith("http") ? href : `https://c-uae.com${href}`;
  if (!/c-uae\.com|^\//.test(abs) && !abs.includes("c-uae")) continue;
  try {
    const t = await (await fetch(abs)).text();
    if (t.includes(".form-main") || t.includes("form-main")) {
      foundCustom = abs;
      fs.writeFileSync("scripts/_live-form-css.css", t);
      console.log("FOUND form css", abs, "len", t.length);
      // extract form-main related rules
      const rules = t.match(/\.form-main[\s\S]{0,200}/g)?.slice(0, 5);
      console.log("rules sample", rules);
      break;
    }
  } catch {}
}
if (!foundCustom) {
  // search inline or additional css
  const inline = [...live.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join("\n");
  console.log("inline has form-main", inline.includes("form-main"), "manrope", inline.includes("Manrope"));
  if (inline.includes("form-main")) fs.writeFileSync("scripts/_live-inline-form.css", inline);
}

// Elementor custom CSS often in post CSS or kit
for (const href of interesting) {
  const abs = href.startsWith("http") ? href : href.startsWith("//") ? `https:${href}` : `https://c-uae.com${href}`;
  if (!abs.includes("c-uae.com") && !abs.startsWith("https://c-uae")) continue;
  try {
    const t = await (await fetch(abs)).text();
    if (t.includes("Multi Step") || t.includes(".step-count") || t.includes("info-data")) {
      console.log("MATCH", abs);
      fs.writeFileSync("scripts/_live-form-css.css", t);
      break;
    }
  } catch {}
}
