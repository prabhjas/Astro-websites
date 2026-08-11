#!/usr/bin/env node
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const html = await (
  await fetch("https://raadrecruitment.ae/?nowprocket=1", {
    headers: { "User-Agent": "Mozilla/5.0" },
  })
).text();

const blocks = [
  ...html.matchAll(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi),
];

const outDir = join("public", "css", "live-inline");
mkdirSync(outDir, { recursive: true });
const index = [];

blocks.forEach((m, i) => {
  const attrs = m[1] || "";
  const css = (m[2] || "").trim();
  if (css.length < 80) return;
  const idMatch = attrs.match(/\bid=["']([^"']+)["']/i);
  const id = idMatch?.[1] || `live-inline-${i + 1}`;
  const file = `${id.replace(/[^a-z0-9-_]+/gi, "-")}.css`;
  const dest = join(outDir, file);
  writeFileSync(dest, `${css}\n`, "utf8");
  index.push(`/css/live-inline/${file}`);
  console.log(file, css.length);
});

writeFileSync(
  "src/data/live-inline-css.json",
  `${JSON.stringify(index, null, 2)}\n`,
  "utf8",
);
console.log("index", index.length);
