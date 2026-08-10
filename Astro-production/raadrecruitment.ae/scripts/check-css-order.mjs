import fs from "node:fs";

const html = await (await fetch("http://127.0.0.1:4321/")).text();
const links = [...html.matchAll(/href="([^"]+\.css[^"]*)"/g)].map((m) => m[1]);
links.forEach((l, i) => console.log(i, l));
console.log("bg-fallback", html.includes("elementor-bg-fallback"));
console.log("migration", html.includes("migration-overrides"));

// Check live site section - fetch used CSS snippet for body
const live = await (await fetch("/")).text();
const bodyStyle = live.match(/body\{[^}]+\}/i);
console.log("live rocket body", bodyStyle?.[0]?.slice(0, 200));
console.log("live has b1aa184", live.includes("b1aa184"));
// In rocket used css, search background near core
const used = live.match(/<style id="wpr-usedcss">([\s\S]*?)<\/style>/i)?.[1] || "";
for (const id of ["b1aa184", "1d75aa5", "edf1a91", "3bec0b4"]) {
  const i = used.indexOf(id);
  console.log("used", id, i >= 0 ? used.slice(Math.max(0, i - 40), i + 160).replace(/\s+/g, " ") : "absent");
}
