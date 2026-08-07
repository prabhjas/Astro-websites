import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const pages = JSON.parse(readFileSync(join(ROOT, "src/data/pages.json"), "utf8"));
const m = pages.find((p) => p.path === "/manufacturing/");
const html = m.bodyHtml || m.content;

function dump(label, start, end) {
  console.log("\n========", label, "========");
  console.log(html.slice(start, end));
}

// Hero first 3500 chars
dump("HERO", 0, 3500);

// Clients section
const ci = html.indexOf("Clients globally");
const cStart = html.lastIndexOf("<section", ci);
dump("CLIENTS", cStart, ci + 4000);

// Right hands collage
const ri = html.indexOf("right hands");
const rStart = html.lastIndexOf("<section", ri);
dump("RIGHT HANDS", rStart, ri + 4500);

// Also check impreza-design-options for conflicting classes
const globalDes = readFileSync(join(ROOT, "public/css/impreza-design-options.css"), "utf8");
for (const sel of [
  "us_custom_0b7e9c85",
  "us_custom_8b78c63d",
  "us_custom_0493f734",
  "us_custom_6a99ad11",
  "us_custom_479dc244",
  "us_custom_7bf0190b",
]) {
  const hits = [...globalDes.matchAll(new RegExp(`\\.${sel}\\{[^}]+\\}`, "g"))].map((m) => m[0]);
  console.log("\nglobal design", sel, hits.length ? hits : "none");
}
