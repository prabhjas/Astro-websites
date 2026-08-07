/**
 * Download missing team portrait images for emiratiguard.com from live.
 * Usage: node scripts/download-team-portraits.mjs
 */
import { mkdirSync, writeFileSync, existsSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public/wp-content/uploads/2026/05");
const ORIGIN = "https://emiratiguard.com";

const FILES = [
  "Neelisha-Kandhway-scaled.png",
  "Harneet-Bhatia-scaled.png",
  "Gian-Carla-De-Guzman-scaled.png",
  "Riju-Karappurath-scaled.png",
  "Sanjyam-Vinod-Dhingra-scaled.png",
  "Joanna-D.-Araneta-scaled.png",
  "Noufal-Malayil-scaled.png",
  "Paul-Deva-Kumar-scaled.png",
  "Katy-Marie-O-Reilly-scaled.png",
  "Shoukathali-Vaddakkepayil-scaled.png",
  "Richard-Rodrigues-scaled.png",
  "Kevin-Teita-scaled.png",
  "Simone-Venter-scaled.png",
  "Trishala-Nair-scaled.png",
  "Aswini-Prabhakaran-scaled.png",
  "Wesley-Hurter-scaled.png",
  "Sahad-Basheer-scaled.png",
  "Thandazani-Nyathi-scaled.png",
];

mkdirSync(OUT, { recursive: true });

let ok = 0;
let fail = 0;
for (const file of FILES) {
  const dest = join(OUT, file);
  if (existsSync(dest) && statSync(dest).size > 1000) {
    console.log("skip (exists)", file, statSync(dest).size);
    ok++;
    continue;
  }
  const url = `${ORIGIN}/wp-content/uploads/2026/05/${encodeURIComponent(file)}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; emiratiguard-local/1.0)" },
      redirect: "follow",
    });
    if (!res.ok) {
      console.error("FAIL", res.status, file);
      fail++;
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(dest, buf);
    console.log("ok", file, buf.length, res.headers.get("content-type"));
    ok++;
  } catch (e) {
    console.error("ERR", file, e.message);
    fail++;
  }
}

console.log(`\nDone: ${ok} ok, ${fail} failed → ${OUT}`);
