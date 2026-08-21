import fs from "node:fs";
import path from "node:path";

const posts = JSON.parse(fs.readFileSync("src/data/posts.json", "utf8"));

function magic(f) {
  const b = fs.readFileSync(f).subarray(0, 16);
  const hex = Buffer.from(b).toString("hex");
  if (hex.startsWith("ffd8")) return "jpeg";
  if (hex.startsWith("89504e47")) return "png";
  if (hex.startsWith("52494646") && b.toString("ascii", 8, 12) === "WEBP") return "webp";
  if (hex.startsWith("3c21444f") || hex.startsWith("3c68746d") || b[0] === 0x3c) return "html";
  return `unknown:${hex.slice(0, 16)}`;
}

let bad = 0;
let missing = 0;
let ok = 0;
for (const p of posts) {
  const rel = String(p.featuredImage || "").replace(/^\//, "");
  if (!rel) {
    missing++;
    console.log("NOIMG", p.path);
    continue;
  }
  const f = path.join("public", rel);
  if (!fs.existsSync(f)) {
    missing++;
    console.log("MISS", p.path, rel);
    continue;
  }
  const m = magic(f);
  if (m === "html" || m.startsWith("unknown")) {
    bad++;
    console.log("BAD", m, p.path, rel, fs.statSync(f).size);
  } else {
    ok++;
  }
}
console.log({ ok, bad, missing, total: posts.length });
