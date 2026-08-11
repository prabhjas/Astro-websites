import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const pages = JSON.parse(readFileSync(join(ROOT, "src/data/pages.json"), "utf8"));
const html = pages.find((p) => p.path === "/manufacturing/").bodyHtml;

const live = await (
  await fetch("https://ngmanpower.com/manufacturing/?nowprocket=1", {
    headers: { "User-Agent": "NG/1.0" },
  })
).text();

function around(label, src, needle) {
  const i = src.indexOf(needle);
  console.log("\n===", label, needle, "idx", i, "===");
  if (i < 0) return;
  // find enclosing section
  const start = src.lastIndexOf("<section", i);
  const end = src.indexOf("</section>", i) + 10;
  const sec = src.slice(start, end);
  const cls = (sec.match(/class="([^"]+)"/) || [])[1];
  console.log("section class:", cls);
  console.log(sec.replace(/\s+/g, " ").slice(0, 900));
}

for (const needle of [
  "Manufacturing-1.png",
  "Helping-Our-Clients",
  "Frame-338",
  "How NG Manpower Supports",
  "Questions?",
]) {
  around("LOCAL", html, needle);
  around("LIVE", live, needle);
}
