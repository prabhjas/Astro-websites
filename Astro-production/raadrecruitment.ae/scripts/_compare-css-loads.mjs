import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const localHtml = await (await fetch("http://127.0.0.1:5102/manufacturing/")).text();
const liveHtml = await (
  await fetch("/manufacturing/?nowprocket=1", {
    headers: { "User-Agent": "NG/1.0" },
  })
).text();

function cssHrefs(html) {
  return [...html.matchAll(/href="([^"]+\.css[^"]*)"/g)].map((m) =>
    m[1].replace(/^https?:\/\/ngmanpower\.com/, "").split("?")[0]
  );
}

const localCss = cssHrefs(localHtml);
const liveCss = cssHrefs(liveHtml);

console.log("local css count", localCss.length);
console.log("live css count", liveCss.length);

const liveOnly = liveCss.filter((h) => !localCss.includes(h) && !localCss.some((l) => l.endsWith(h.split("/").pop())));
const localOnly = localCss.filter((h) => !liveCss.includes(h) && !liveCss.some((l) => l.endsWith(h.split("/").pop())));
console.log("\nlive-only sample", liveOnly.slice(0, 40));
console.log("\nlocal-only sample", localOnly.slice(0, 40));

// Check if theme style.css / style.min.css present
for (const needle of [
  "themes/Impreza/css/style",
  "us-theme-options",
  "us-header",
  "us-design-options",
  "js_composer",
  "js_composer.min",
  "vc_",
  "page-design/manufacturing",
]) {
  console.log(
    needle,
    "local",
    localCss.some((c) => c.includes(needle)),
    "live",
    liveCss.some((c) => c.includes(needle))
  );
}

// Check g-cols CSS rule presence in served local theme sheets listed in page
const order = JSON.parse(readFileSync(join(ROOT, "src/data/live-css-order.json"), "utf8"));
console.log("\nlive-css-order", order);

// Probe a few CSS files for .g-cols.via_grid
import { existsSync, readdirSync } from "fs";
const candidates = [
  "public/wp-content/themes/Impreza/css/style.css",
  "public/wp-content/themes/Impreza/css/style.min.css",
  "public/wp-content/plugins/js_composer/assets/css/js_composer.min.css",
  "public/css/us-theme-options.css",
  "public/css/impreza-theme-options.css",
];
for (const c of candidates) {
  const p = join(ROOT, c);
  if (!existsSync(p)) {
    console.log("missing", c);
    continue;
  }
  const css = readFileSync(p, "utf8");
  console.log(c, "len", css.length, "has via_grid", css.includes("via_grid"), "has g-cols", css.includes("g-cols"));
}
