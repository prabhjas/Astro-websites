#!/usr/bin/env node
/** Write src/data/live-css-order.json from live homepage stylesheet order. */
import { writeFileSync } from "node:fs";

const ORIGIN = "https://raadrecruitment.ae";
const html = await (
  await fetch(`${ORIGIN}/?nowprocket=1`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    },
  })
).text();

const hrefs = [
  ...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi),
]
  .map((m) => {
    const h = m[0].match(/href=["']([^"']+)/i);
    if (!h) return null;
    let u = h[1];
    if (u.startsWith("//")) u = `https:${u}`;
    try {
      const url = new URL(u, ORIGIN);
      if (!url.hostname.includes("raadrecruitment.ae")) return null;
      return url.pathname;
    } catch {
      return null;
    }
  })
  .filter(Boolean);

const unique = [...new Set(hrefs)];
writeFileSync(
  "src/data/live-css-order.json",
  `${JSON.stringify(unique, null, 2)}\n`,
  "utf8",
);
console.log("wrote", unique.length, "stylesheets");
unique.forEach((u, i) => console.log(String(i + 1).padStart(2), u));

const body = html.match(/<body[^>]*class=["']([^"']+)/i);
console.log("\nBODY", body?.[1]?.slice(0, 400));
