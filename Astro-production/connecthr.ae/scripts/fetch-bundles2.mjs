import fs from "node:fs";
import path from "node:path";

/** Same Elementor 3.31.2 build as connectfz / connectzone / redo. */
const ORIGINS = [
  "https://connectfz.com",
  "https://connectzone.ae",
  "https://redo.ae",
  "https://spheavyrental.ae",
  "https://iberiaeor.com",
];

async function download(rel) {
  const dest = path.join("public", rel.replace(/^\//, ""));
  if (fs.existsSync(dest) && fs.statSync(dest).size > 50) {
    const head = fs.readFileSync(dest).subarray(0, 15).toString("utf8");
    if (!head.includes("<!DOCTYPE") && !head.includes("<html")) {
      console.log("exists", rel);
      return true;
    }
  }
  for (const origin of ORIGINS) {
    const res = await fetch(origin + rel, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Astro-fleet/1.0)" },
    });
    if (!res.ok) continue;
    const buf = Buffer.from(await res.arrayBuffer());
    const ct = res.headers.get("content-type") || "";
    if (buf[0] === 0x3c || ct.includes("text/html")) continue;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, buf);
    console.log("got", rel, "from", origin, buf.length);
    return true;
  }
  console.warn("fail", rel);
  return false;
}

async function grabRuntimeBundles(runtimePath, baseUrl) {
  if (!fs.existsSync(runtimePath)) return;
  const t = fs.readFileSync(runtimePath, "utf8");
  const filesFound = [...t.matchAll(/([a-z0-9_-]+)\.([a-f0-9]{10,})\.bundle\.min\.js/gi)].map(
    (x) => x[0],
  );
  console.log(runtimePath, "refs", [...new Set(filesFound)].length);
  for (const f of [...new Set(filesFound)]) {
    await download(baseUrl + f);
  }
}

const priority = [
  "/wp-content/plugins/elementor/assets/lib/dialog/dialog.min.js",
  "/wp-content/plugins/elementor/assets/js/section-frontend-handlers.d85ab872da118940910d.bundle.min.js",
  "/wp-content/plugins/elementor/assets/js/shared-frontend-handlers.03caa53373b56d3bab67.bundle.min.js",
  "/wp-content/plugins/elementor/assets/js/image-carousel.6167d20b95b33386757b.bundle.min.js",
];

for (const f of priority) await download(f);
await grabRuntimeBundles(
  "public/wp-content/plugins/elementor/assets/js/webpack.runtime.min.js",
  "/wp-content/plugins/elementor/assets/js/",
);
await grabRuntimeBundles(
  "public/wp-content/plugins/elementor-pro/assets/js/webpack-pro.runtime.min.js",
  "/wp-content/plugins/elementor-pro/assets/js/",
);
