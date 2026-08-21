import fs from "fs";
import path from "path";
import { createRequire } from "module";

// Can't import TS directly — exercise via API after rebuild.
const dir = ".data/leads/state";
const files = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs }))
  .sort((a, b) => b.t - a.t)
  .slice(0, 8);

console.log("=== recent leads professionSector ===");
for (const { f } of files) {
  const r = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  const p = r.payload || {};
  console.log(
    JSON.stringify({
      id: r.publicId.slice(0, 8),
      deliveryStatus: r.deliveryStatus,
      name: p.fullName,
      professionSector: p.professionSector || "(empty)",
    }),
  );
}

const html = await (await fetch("http://127.0.0.1:5113/contact-us/")).text();
const form = html.match(/<form[\s\S]*?<\/form>/i)?.[0] || "";
const selects = [...form.matchAll(/<select[\s\S]*?<\/select>/gi)].map((m) => m[0]);
console.log("\n=== contact form selects ===", selects.length);
for (const s of selects) {
  const name = (s.match(/name=["']([^"']+)/) || [])[1];
  const opts = [...s.matchAll(/<option[^>]*value=["']([^"']*)["'][^>]*>/gi)].map((m) => m[1]);
  console.log(JSON.stringify({ name, optionValues: opts }));
}
