import fs from "node:fs";
import path from "node:path";

const ORIGIN = "https://spheavyrental.ae";

const files = [
  "/wp-content/plugins/elementor/assets/js/section-frontend-handlers.d85ab872da118940910d.bundle.min.js",
  "/wp-content/plugins/elementor/assets/js/text-editor.abc8f59c62f2820dc25a.bundle.min.js",
  "/wp-content/plugins/elementor/assets/js/shared-frontend-handlers.4c8abccc3e268b0767b2.bundle.min.js",
  "/wp-content/plugins/elementor-pro/assets/js/nav-menu.a23fbd67486c5bedf26c.bundle.min.js",
  "/wp-content/plugins/elementor/assets/lib/animations/styles/fadeIn.min.css",
  "/wp-content/plugins/elementor/assets/lib/animations/styles/fadeInUp.min.css",
  "/wp-content/plugins/elementor/assets/css/widget-nested-accordion.min.css",
];

async function download(rel) {
  const dest = path.join("public", rel.replace(/^\//, ""));
  if (fs.existsSync(dest) && fs.statSync(dest).size > 50) {
    console.log("exists", rel);
    return true;
  }
  const res = await fetch(ORIGIN + rel);
  if (!res.ok) {
    console.warn("fail", res.status, rel);
    return false;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  console.log("got", rel, fs.statSync(dest).size);
  return true;
}

async function grabRuntimeBundles(runtimePath, baseUrl) {
  if (!fs.existsSync(runtimePath)) return;
  const t = fs.readFileSync(runtimePath, "utf8");
  const filesFound = [...t.matchAll(/([a-z0-9_-]+)\.([a-f0-9]{10,})\.bundle\.min\.js/gi)].map((x) => x[0]);
  console.log(runtimePath, "refs", [...new Set(filesFound)].length);
  for (const f of [...new Set(filesFound)]) {
    await download(baseUrl + f);
  }
}

for (const f of files) await download(f);
await grabRuntimeBundles(
  "public/wp-content/plugins/elementor/assets/js/webpack.runtime.min.js",
  "/wp-content/plugins/elementor/assets/js/",
);
await grabRuntimeBundles(
  "public/wp-content/plugins/elementor-pro/assets/js/webpack-pro.runtime.min.js",
  "/wp-content/plugins/elementor-pro/assets/js/",
);
