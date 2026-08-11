import { writeFileSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const live = await (
  await fetch("https://ngmanpower.com/construction/?nowprocket=1", {
    headers: { "User-Agent": "NG/1.0" },
  })
).text();

const needle = "SmartSliderSimple('n2-ss-3'";
const idx = live.indexOf(needle);
console.log("init idx", idx);
if (idx < 0) {
  console.error("n2-ss-3 init not found on live");
  process.exit(1);
}

const start = live.lastIndexOf("<script", idx);
const end = live.indexOf("</script>", idx);
const raw = live.slice(start, end + "</script>".length);
const js = raw.replace(/^<script[^>]*>/, "").replace(/<\/script>$/, "");
console.log("init js length", js.length);
console.log(js.slice(0, 200));
console.log("...");
console.log(js.slice(-150));

writeFileSync(join(ROOT, "public/scripts/smartslider-n2-ss-3-init.js"), js);
console.log("wrote smartslider-n2-ss-3-init.js");

// Inline CSS that targets #n2-ss-3
const styles = [...live.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)]
  .map((m) => m[1])
  .filter((css) => css.includes("n2-ss-3") || css.includes("n2-ss-3item"));
console.log("inline styles with n2-ss-3:", styles.length, styles.map((s) => s.length));

if (styles.length) {
  const cssPath = join(ROOT, "public/css/smartslider-n2-ss-3-inline.css");
  writeFileSync(cssPath, styles.join("\n\n"));
  console.log("wrote", cssPath);
}

// Compare local slider images vs live
const pages = JSON.parse(readFileSync(join(ROOT, "src/data/pages.json"), "utf8"));
const local = pages.find((p) => p.path === "/construction/");
const localHtml = local.bodyHtml || local.content;
const localImgs = [
  ...new Set(
    [...localHtml.matchAll(/src=["']([^"']+)["']/g)]
      .map((m) => m[1])
      .filter((u) => u.includes("wp-content/uploads") && localHtml.includes("n2-ss-3") ? true : true)
  ),
].filter((u) => {
  // imgs that appear inside the slider block
  const si = localHtml.indexOf('id="n2-ss-3"');
  const se = localHtml.indexOf("</div></div></div></div>", si + 5000);
  const block = localHtml.slice(si, si + 15000);
  return block.includes(u);
});

const liveSi = live.indexOf('id="n2-ss-3"');
const liveBlock = live.slice(liveSi, liveSi + 20000);
const liveImgs = [
  ...new Set(
    [...liveBlock.matchAll(/src=["']([^"']+)["']/g)].map((m) => m[1].replace(/^https?:\/\/[^/]+/, ""))
  ),
];

console.log("\nlocal slider imgs", localImgs.slice(0, 20));
console.log("live slider imgs", liveImgs.slice(0, 20));

const missing = [];
for (const rel of [...new Set([...localImgs, ...liveImgs])]) {
  const clean = rel.replace(/^https?:\/\/[^/]+/, "").split("?")[0];
  if (!clean.startsWith("/wp-content/")) continue;
  const file = join(ROOT, "public", clean.replace(/^\//, ""));
  if (!existsSync(file)) missing.push(clean);
}
console.log("\nmissing local upload files:", missing);

// Also check hero background images on construction
const bgRe = /url\((['"]?)([^)'"]+)\1\)/g;
const localBgs = [...localHtml.matchAll(bgRe)].map((m) => m[2]).filter((u) => u.includes("uploads"));
const missingBg = localBgs.filter((u) => {
  const clean = u.replace(/^https?:\/\/[^/]+/, "").split("?")[0];
  return !existsSync(join(ROOT, "public", clean.replace(/^\//, "")));
});
console.log("missing bg urls sample:", [...new Set(missingBg)].slice(0, 20));
