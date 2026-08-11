#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const checks = [
  "public/wp-content/uploads/2023/07/bg-raad.jpg",
  "public/wp-content/plugins/elementor/assets/css/frontend.css",
  "public/wp-content/themes/astra/assets/css/minified/main.min.css",
  "public/css/live-inline/astra-theme-css-inline-css.css",
  "public/css/live-inline/live-inline-6.css",
  "public/wp-content/uploads/elementor/css/post-30.css",
];
for (const f of checks) {
  console.log(fs.existsSync(f) ? fs.statSync(f).size : "MISSING", f);
}

const dir = "public/wp-content/uploads/elementor/google-fonts/css";
const missing = new Set();
let ok = 0;
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".css"))) {
  const css = fs.readFileSync(path.join(dir, f), "utf8");
  for (const m of css.matchAll(/url\(([^)]+)\)/g)) {
    let u = m[1].replace(/["']/g, "").trim().split("?")[0];
    if (!u.startsWith("/")) continue;
    const disk = path.join("public", u.slice(1));
    if (fs.existsSync(disk)) ok++;
    else missing.add(u);
  }
}
console.log({ ok, missingCount: missing.size, missing: [...missing].slice(0, 40) });

const kit = fs.readFileSync("public/wp-content/uploads/elementor/css/post-30.css", "utf8");
console.log("kit has e-global", kit.includes("--e-global"));
const inline6 = fs.readFileSync("public/css/live-inline/live-inline-6.css", "utf8");
console.log("inline6 has e-global", inline6.includes("--e-global"), "len", inline6.length);
const astra = fs.readFileSync("public/css/live-inline/astra-theme-css-inline-css.css", "utf8");
console.log("astra inline has container width", astra.includes("--ast-normal-container-width"));
