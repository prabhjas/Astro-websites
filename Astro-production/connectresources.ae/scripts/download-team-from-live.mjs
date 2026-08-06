/**
 * Download working team portraits from live connectresources.ae
 * (c-uae.com /2026/05/*-scaled.png URLs 404 — real files are under 2025/04 etc.)
 */
import { mkdirSync, writeFileSync, existsSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ORIGIN = "https://connectresources.ae";

const live = await (
  await fetch(`${ORIGIN}/meet-our-team/?nowprocket=1`, {
    headers: { "User-Agent": "Mozilla/5.0" },
  })
).text();

const paths = [
  ...new Set(
    [...live.matchAll(/\/wp-content\/uploads\/[^\"'\s>]+\.(?:png|jpg|jpeg|webp)/gi)]
      .map((m) => m[0].split("?")[0])
      .filter((p) => !/site-icon|Featured-on|Logo-Connect|expand|outsource|mobil-connect|UNEMPLOYMENT|corporate-tax/i.test(p)),
  ),
];

console.log("team-related upload paths from live:", paths.length);

let ok = 0;
let fail = 0;
for (const rel of paths) {
  const dest = join(ROOT, "public", rel.replace(/^\//, ""));
  mkdirSync(dirname(dest), { recursive: true });
  // also mirror under assets/images if page uses that rewrite
  const assetsDest = join(
    ROOT,
    "public",
    rel.replace(/^\/wp-content\/uploads\//, "assets/images/"),
  );

  if (existsSync(dest) && statSync(dest).size > 500) {
    console.log("skip", rel);
    ok++;
    continue;
  }

  const url = ORIGIN + rel;
  const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!r.ok) {
    console.error("FAIL", r.status, rel);
    fail++;
    continue;
  }
  const buf = Buffer.from(await r.arrayBuffer());
  writeFileSync(dest, buf);
  mkdirSync(dirname(assetsDest), { recursive: true });
  writeFileSync(assetsDest, buf);
  console.log("ok", rel, buf.length);
  ok++;
}

console.log(`\nDone ${ok} ok / ${fail} fail`);
