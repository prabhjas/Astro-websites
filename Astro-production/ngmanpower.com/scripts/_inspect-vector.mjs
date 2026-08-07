import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ORIGIN = "https://ngmanpower.com";

const res = await fetch(ORIGIN + "/wp-content/uploads/2023/05/Vector.png", {
  headers: {
    "User-Agent": "Mozilla/5.0",
    Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    Referer: ORIGIN + "/",
  },
});
const buf = Buffer.from(await res.arrayBuffer());
console.log({
  status: res.status,
  ctype: res.headers.get("content-type"),
  len: buf.length,
  sha: createHash("sha256").update(buf).digest("hex").slice(0, 16),
  localSha: createHash("sha256")
    .update(readFileSync(join(ROOT, "public/wp-content/uploads/2023/05/Vector.png")))
    .digest("hex")
    .slice(0, 16),
  magic: buf.slice(0, 8).toString("hex"),
});

// Also search live CSS for iconbox / Vector / Frame icons
const live = await (await fetch(ORIGIN + "/?nowprocket=1")).text();
const styles = [...live.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
const hits = [];
for (const s of styles) {
  if (/w-iconbox|Vector\.png|icontype/i.test(s)) {
    const bits = s.match(/[^{}]*w-iconbox[^{}]*\{[^}]+\}/gi) || [];
    hits.push(...bits.slice(0, 20));
    const vec = s.match(/[^{}]*Vector[^}]*\{[^}]+\}/gi) || [];
    hits.push(...vec);
  }
}
console.log("css hits", hits.slice(0, 30));

// Check theme options for iconbox color
const theme = readFileSync(join(ROOT, "public/css/impreza-theme-options.css"), "utf8");
const iconbox = theme.match(/[^{]*iconbox[^{]*\{[^}]+\}/gi) || [];
console.log("theme iconbox", iconbox.slice(0, 15));

// Look for ultimate icon / Info Box different structure on live near Govt
const idx = live.indexOf("We are Govt Authorized");
console.log(live.slice(idx - 800, idx + 200).replace(/\s+/g, " "));
