import fs from "node:fs";
import path from "node:path";

const ORIGIN = "https://spheavyrental.ae";

async function main() {
  const live = await (await fetch(`${ORIGIN}/?nowprocket=1`)).text();
  fs.writeFileSync("_crawl/live-home.html", live);

  let local = "";
  try {
    local = await (await fetch("http://127.0.0.1:4321/")).text();
    fs.writeFileSync("_crawl/local-home.html", local);
  } catch (e) {
    console.warn("local fetch failed", e.message);
  }

  const liveCss = [...live.matchAll(/href=(["'])(.*?\.css(?:\?[^"']*)?)\1/g)].map((m) => m[2]);
  console.log("LIVE CSS count", liveCss.length);
  for (const c of liveCss) console.log(" L", c);

  if (local) {
    const localCss = [...local.matchAll(/href=(["'])(.*?\.css(?:\?[^"']*)?)\1/g)].map((m) => m[2]);
    console.log("LOCAL CSS count", localCss.length);
    for (const c of localCss) console.log(" A", c);
  }

  // Download any missing CSS + JS from live
  const assets = [
    ...liveCss.map((u) => (u.startsWith("http") ? u.split("?")[0] : ORIGIN + u.split("?")[0])),
  ];

  const js = [...live.matchAll(/src=(["'])(.*?\.js(?:\?[^"']*)?)\1/g)].map((m) => m[2]);
  console.log("LIVE JS count", js.length);
  for (const j of js.slice(0, 40)) console.log(" J", j);

  const neededJs = js.filter(
    (j) =>
      j.includes("elementor") ||
      j.includes("hello-elementor") ||
      j.includes("jquery") ||
      j.includes("nav-menu") ||
      j.includes("webpack") ||
      j.includes("frontend"),
  );

  for (const u of [...new Set([...assets, ...neededJs.map((j) => (j.startsWith("http") ? j.split("?")[0] : ORIGIN + j.split("?")[0]))])]) {
    if (!u.includes("spheavyrental.ae") && !u.startsWith("/")) continue;
    const abs = u.startsWith("http") ? u : ORIGIN + u;
    const dest = path.join("public", new URL(abs).pathname.replace(/^\//, ""));
    if (fs.existsSync(dest) && fs.statSync(dest).size > 50) continue;
    try {
      const res = await fetch(abs);
      if (!res.ok) {
        console.warn("skip", res.status, abs);
        continue;
      }
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
      console.log("saved", dest);
    } catch (e) {
      console.warn("fail", abs, e.message);
    }
  }

  // Save ordered CSS list exactly as live
  const ordered = liveCss.map((u) => {
    const clean = u.split("?")[0];
    if (clean.startsWith("http")) return new URL(clean).pathname;
    return clean.startsWith("/") ? clean : `/${clean}`;
  });
  fs.writeFileSync("src/data/live-css-order.json", JSON.stringify(ordered, null, 2));
  console.log("wrote live-css-order.json", ordered.length);
}

main();
