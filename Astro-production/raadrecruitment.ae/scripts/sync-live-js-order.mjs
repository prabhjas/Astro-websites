#!/usr/bin/env node
import { writeFileSync } from "node:fs";

const ORIGIN = "https://raadrecruitment.ae";
const html = await (
  await fetch(`${ORIGIN}/?nowprocket=1`, {
    headers: { "User-Agent": "Mozilla/5.0" },
  })
).text();

const scripts = [
  ...html.matchAll(/<script[^>]+src=["']([^"']+)["'][^>]*>/gi),
]
  .map((m) => {
    let u = m[1];
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

const unique = [...new Set(scripts)];
writeFileSync(
  "src/data/live-js-order.json",
  `${JSON.stringify(unique, null, 2)}\n`,
  "utf8",
);
console.log("scripts", unique.length);
unique.forEach((u, i) => console.log(String(i + 1).padStart(2), u));
const body = html.match(/<body[^>]*class=["']([^"']+)/i);
console.log("BODY", body?.[1]?.slice(0, 400));
