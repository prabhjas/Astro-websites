/**
 * Compare local robots meta vs live for every sitemap URL.
 */
const ORIGIN = "https://emiratiguard.com";
const LOCAL = process.env.EG_LOCAL || "http://127.0.0.1:5103";

async function locs(url) {
  const xml = await (await fetch(url)).text();
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1].trim());
}

function robotsFromHtml(html) {
  const m =
    html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']robots["']/i);
  return m?.[1]?.trim() || null;
}

function pathOf(loc) {
  let p = new URL(loc).pathname;
  if (p !== "/" && !p.endsWith("/")) p += "/";
  return p;
}

const pageLocs = await locs(`${ORIGIN}/page-sitemap.xml`);
const postLocs = await locs(`${ORIGIN}/post-sitemap.xml`);
const all = [...pageLocs, ...postLocs];

let mismatches = [];
let checked = 0;
for (const loc of all) {
  const p = pathOf(loc);
  const liveUrl = `${ORIGIN}${p === "/" ? "/" : p}`;
  const localUrl = `${LOCAL}${p === "/" ? "/" : p}`;
  const [liveHtml, localHtml] = await Promise.all([
    (await fetch(liveUrl)).text(),
    (await fetch(localUrl)).text(),
  ]);
  const liveR = robotsFromHtml(liveHtml);
  const localR = robotsFromHtml(localHtml);
  checked += 1;
  if (liveR !== localR) {
    mismatches.push({ path: p, live: liveR, local: localR });
  }
  if (checked % 15 === 0) console.log(`checked ${checked}/${all.length}`);
}

console.log({ checked, mismatches: mismatches.length });
if (mismatches.length) {
  console.log(mismatches.slice(0, 20));
  process.exit(1);
}
console.log("ROBOTS_PARITY: PASS");
