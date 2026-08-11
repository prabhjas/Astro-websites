#!/usr/bin/env node
/**
 * Extract Smart Slider 3 bootstrap + init inline scripts from live HTML
 * and write them into src/data for Astro injection.
 */
import fs from "node:fs";
import path from "node:path";

const ORIGIN = process.env.ORIGIN || "https://raadrecruitment.ae";
const OUT_DIR = "src/data/smart-slider";

const urls = [
  "/",
  // other SS pages can be added later
];

fs.mkdirSync(OUT_DIR, { recursive: true });

function extractScripts(html) {
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  let bootstrap = null;
  const inits = [];
  for (const m of scripts) {
    const attrs = m[1] || "";
    const body = (m[2] || "").trim();
    if (!body || /\bsrc=/.test(attrs)) continue;
    if (
      body.includes("this._N2=this._N2||{_r:[]") ||
      body.includes("this._N2=this._N2||{_r:[],_d:[]")
    ) {
      bootstrap = body;
    }
    if (body.includes("_N2.r(") && /SmartSliderSimple|n2-ss-\d+/.test(body)) {
      inits.push(body);
    }
  }
  return { bootstrap, inits };
}

const allInits = [];
let bootstrap = null;

for (const u of urls) {
  const html = await (await fetch(ORIGIN + u, {
    headers: { "User-Agent": "Mozilla/5.0 RaadAstroMirror/1.0" },
  })).text();
  const ex = extractScripts(html);
  console.log(u, "bootstrap", !!ex.bootstrap, "inits", ex.inits.length);
  if (ex.bootstrap) bootstrap = ex.bootstrap;
  for (const init of ex.inits) {
    // Dedup by slider id
    const idMatch = init.match(/SmartSliderSimple\('([^']+)'/);
    const id = idMatch?.[1] || `anon-${allInits.length}`;
    if (!allInits.some((x) => x.id === id)) {
      allInits.push({ id, body: init });
    }
  }
}

if (!bootstrap) {
  bootstrap =
    "(function(){this._N2=this._N2||{_r:[],_d:[],r:function(){this._r.push(arguments)},d:function(){this._d.push(arguments)}}}).call(window);";
}

// Localize absolute URLs in init JSON (images/fonts inside config)
function localize(s) {
  return s
    .replace(/https?:\/\/(?:www\.)?raadrecruitment\.ae\//g, "/")
    .replace(/\/\/(?:www\.)?raadrecruitment\.ae\//g, "/");
}

fs.writeFileSync(path.join(OUT_DIR, "bootstrap.js"), localize(bootstrap) + "\n");
const combined = allInits.map((x) => localize(x.body)).join("\n;\n");
fs.writeFileSync(path.join(OUT_DIR, "init-home.js"), combined + "\n");
fs.writeFileSync(
  path.join(OUT_DIR, "manifest.json"),
  JSON.stringify(
    { origin: ORIGIN, urls, sliderIds: allInits.map((x) => x.id), extractedAt: new Date().toISOString() },
    null,
    2,
  ),
);
console.log("wrote", OUT_DIR, "sliders", allInits.map((x) => x.id));
console.log("bootstrap bytes", bootstrap.length, "init bytes", combined.length);
