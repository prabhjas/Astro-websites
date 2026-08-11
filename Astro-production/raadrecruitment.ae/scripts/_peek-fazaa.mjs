import fs from "node:fs";

const posts = JSON.parse(fs.readFileSync("src/data/posts.json", "utf8"));
console.log("posts", posts.length);
for (const path of ["/fazaa-card-uae/", "/employee-benefits-in-uae/"]) {
  const p = posts.find((x) => x.path === path);
  console.log(path, p?.featuredImage);
}

for (const path of ["/fazaa-card-uae/", "/employee-benefits-in-uae/"]) {
  const r = await fetch("https://raadrecruitment.ae" + path, {
    headers: { "user-agent": "raad-check" },
  });
  const h = await r.text();
  const m =
    h.match(/property=["']og:image["'][^>]*content=["']([^"']+)/i) ||
    h.match(/content=["']([^"']+)["'][^>]*property=["']og:image/i);
  console.log("live", path, r.status, m && m[1]);
}
