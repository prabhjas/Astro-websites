import fs from "node:fs";
import path from "node:path";

const ORIGIN = "https://connectfz.com";
const html = await (
  await fetch(`${ORIGIN}/?nowprocket=1`, { headers: { "User-Agent": "Mozilla/5.0" } })
).text();

const scripts = [...html.matchAll(/src=["']([^"']+\.js[^"']*)["']/gi)].map((m) =>
  m[1].split("?")[0],
);

console.log("--- oklahoma / bootstrap / jquery related ---");
for (const s of scripts) {
  if (/oklahoma|bootstrap|jquery|custom|mt-|menu|sticky|modeltheme|owl/i.test(s)) {
    console.log(s);
  }
}

console.log("\n--- all theme/plugin js (first 80) ---");
for (const s of scripts.slice(0, 80)) console.log(s);

// Download only real JS that returns text/javascript
const want = scripts
  .map((u) => {
    if (u.startsWith("//")) u = "https:" + u;
    if (u.startsWith("http") && !u.includes("connectfz.com")) return null;
    if (u.startsWith("http")) return new URL(u).pathname;
    return u.startsWith("/") ? u : null;
  })
  .filter(Boolean)
  .filter((u) => /oklahoma|bootstrap\.min|owl\.carousel|jquery\.(min|migrate|sticky)|smartmenus/i.test(u));

let saved = 0;
for (const rel of [...new Set(want)]) {
  const res = await fetch(ORIGIN + rel, { headers: { "User-Agent": "Mozilla/5.0" } });
  const ct = res.headers.get("content-type") || "";
  const buf = Buffer.from(await res.arrayBuffer());
  if (!res.ok || !ct.includes("javascript") || buf[0] === 0x3c) {
    console.log("SKIP", rel, res.status, ct, buf.length);
    continue;
  }
  const dest = path.join("public", rel.replace(/^\//, ""));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
  saved++;
  console.log("OK", rel, buf.length);
}
console.log("saved", saved);

// Delete corrupted HTML-as-JS files
for (const bad of [
  "public/wp-content/themes/oklahoma/js/custom.js",
  "public/wp-content/themes/oklahoma/js/scripts.js",
  "public/wp-content/themes/oklahoma/js/mt-plugins.js",
  "public/wp-content/themes/oklahoma/js/jquery.nicescroll.min.js",
]) {
  if (!fs.existsSync(bad)) continue;
  const head = fs.readFileSync(bad).subarray(0, 15).toString("utf8");
  if (head.includes("<!DOCTYPE") || head.includes("<html")) {
    fs.unlinkSync(bad);
    console.log("deleted corrupt", bad);
  }
}
