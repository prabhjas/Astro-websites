import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ssCss = readFileSync(join(ROOT, "public/css/smartslider-inline.css"), "utf8");
const design = readFileSync(join(ROOT, "public/css/impreza-design-options.css"), "utf8");
const theme = readFileSync(join(ROOT, "public/css/impreza-theme-options.css"), "utf8");

const n2rules = ssCss.match(/#n2-ss-2[^{,\s]*[^{]*\{[^}]+\}/g) || [];
console.log("n2-ss-2 rules sample", n2rules.slice(0, 15));
console.log("has height", /#n2-ss-2[^\{]*\{[^}]*height/i.test(ssCss));
console.log("ss css len", ssCss.length);

// paragraph colors that could override
const pColors = theme.match(/[^{]*\bp\b[^{]*\{[^}]*color:[^;}]+/gi) || [];
console.log("theme p colors", pColors.slice(0, 10));

const live = await (
  await fetch("/?nowprocket=1", { headers: { "User-Agent": "NG/1.0" } })
).text();
const local = await (await fetch("http://127.0.0.1:5102/")).text();

function has(html, re) {
  return re.test(html);
}
console.log({
  localSsJs: /smartslider-frontend|n2\.min/.test(local),
  localSsCss: /smartslider-inline|smartslider\.min/.test(local),
  localSsInit: /n2const|N2Classes|_N2|smartslider/i.test(local),
  liveSsInitInline: /n2-ss-2[\s\S]{0,200}new\s+N2|ss\.simple|_N2\.|n2const/i.test(live),
});

// Find script init near slider
const liveInit = live.match(/<script[^>]*>[\s\S]*?n2-ss-2[\s\S]*?<\/script>/gi) || [];
console.log("live init scripts", liveInit.length);
for (const s of liveInit.slice(0, 3)) console.log(s.slice(0, 500));

const localInit = local.match(/<script[^>]*>[\s\S]*?n2-ss-2[\s\S]*?<\/script>/gi) || [];
console.log("local init scripts", localInit.length);

// Efficient manpower section icons
const ei = live.indexOf("Efficient Manpower");
console.log("efficient chunk", live.slice(ei - 400, ei + 100).replace(/\s+/g, " "));
