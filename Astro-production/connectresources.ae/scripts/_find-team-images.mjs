import { readFileSync, mkdirSync, writeFileSync, existsSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const pages = JSON.parse(readFileSync(join(ROOT, "src/data/pages.json"), "utf8"));

// Find Meet the Connectors / team page
const team = pages.find(
  (p) =>
    /Meet the Connectors|Neelisha|Harneet-Bhatia/i.test(p.bodyHtml || "") ||
    /Meet the Connectors|Neelisha|Harneet-Bhatia/i.test(p.content || "") ||
    /connector|our-team|meet-the/i.test(p.path || ""),
);

console.log(
  "team page",
  team && { path: team.path, title: team.title || team.seo?.title },
);

const html = (team?.bodyHtml || team?.content || "") + pages.map((p) => p.bodyHtml || "").join("\n");
const urls = [
  ...new Set(
    [...html.matchAll(/\/wp-content\/uploads\/2026\/05\/[^"'\\\s>]+\.(?:png|jpg|jpeg|webp)/gi)].map(
      (m) => m[0].split("?")[0],
    ),
  ),
];
console.log("local refs", urls.length);
urls.forEach((u) => console.log(" ", u));

// Probe live hosts
const hosts = ["https://connectresources.ae", "https://c-uae.com", "https://www.connectresources.ae"];
const sample = urls[0] || "/wp-content/uploads/2026/05/Neelisha-Kandhway-scaled.png";
for (const h of hosts) {
  const u = h + sample;
  const r = await fetch(u, { headers: { "User-Agent": "Mozilla/5.0" }, redirect: "follow" });
  console.log(r.status, u.slice(0, 120), r.headers.get("content-type"));
}

// Also try live team page scrape
for (const page of [
  "https://connectresources.ae/meet-the-connectors/",
  "https://connectresources.ae/our-team/",
  "https://connectresources.ae/team/",
  "https://connectresources.ae/about-us/",
]) {
  try {
    const r = await fetch(page + "?nowprocket=1", { headers: { "User-Agent": "Mozilla/5.0" } });
    console.log("page", r.status, page);
    if (r.ok) {
      const t = await r.text();
      const hits = [...new Set([...t.matchAll(/uploads\/2026\/05\/[^\"'\s>]+\.png/gi)].map((m) => m[0]))];
      console.log("  imgs", hits.length, hits.slice(0, 5));
    }
  } catch (e) {
    console.log("page err", page, e.message);
  }
}
