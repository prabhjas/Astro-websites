import fs from "node:fs";
import path from "node:path";

const ORIGIN = "https://spheavyrental.ae";
const files = [
  "public/wp-content/uploads/elementor/css/post-10.css",
  "public/wp-content/uploads/elementor/css/post-153.css",
  "public/wp-content/uploads/elementor/css/post-158.css",
  "public/wp-content/uploads/elementor/css/post-19.css",
];

const css = files.filter((f) => fs.existsSync(f)).map((f) => fs.readFileSync(f, "utf8")).join("\n");
const urls = [...css.matchAll(/url\((['"]?)([^)'"]+)\1\)/g)]
  .map((m) => m[2].split("?")[0])
  .filter((u) => u.includes("wp-content") || u.startsWith("/wp-content"));

const uniq = [...new Set(urls)];
console.log("css asset urls", uniq.length);

for (const u of uniq) {
  let rel = u;
  if (u.startsWith("http")) rel = new URL(u).pathname;
  if (!rel.startsWith("/")) rel = "/" + rel;
  if (!rel.startsWith("/wp-content")) continue;
  const dest = path.join("public", rel.slice(1));
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) continue;
  const abs = ORIGIN + rel;
  try {
    const res = await fetch(abs);
    if (!res.ok) {
      console.warn("miss", res.status, rel);
      continue;
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
    console.log("got", rel);
  } catch (e) {
    console.warn(e.message, rel);
  }
}
