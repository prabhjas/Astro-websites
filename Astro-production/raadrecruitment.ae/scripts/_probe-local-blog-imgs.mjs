import fs from "fs";
const pages = JSON.parse(fs.readFileSync("src/data/pages.json", "utf8"));
const blog = pages.find((p) => p.path === "/blog/" || p.path === "/blog");
const html = blog?.bodyHtml || blog?.content || "";
console.log("local blog html", html.length);
for (const slug of ["fazaa-card-uae", "employee-benefits-in-uae", "emergency-leave-in-uae"]) {
  const idx = html.indexOf(slug);
  console.log("===", slug, idx);
  if (idx < 0) continue;
  const chunk = html.slice(Math.max(0, idx - 2200), idx + 500);
  const imgs = [...chunk.matchAll(/src=["']([^"']+)["']/g)].map((m) => m[1]);
  console.log(imgs.filter((u) => /wp-content|placeholder|uploads/i.test(u)).slice(0, 8));
}
