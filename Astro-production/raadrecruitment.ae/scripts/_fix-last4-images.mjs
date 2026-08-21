#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const LIVE = "https://raadrecruitment.ae";
const posts = JSON.parse(fs.readFileSync("src/data/posts.json", "utf8"));

const map = {
  "/salary-certificate-uae/": [
    "/wp-content/uploads/2025/08/Understanding-the-Fundamentals-of-Salary-Documents-in-the-UAE-visual-selection.webp",
    "/wp-content/uploads/2024/07/Importance-of-Understanding-Leave-Salary-Calculations-in-UAE-visual-selection-1.webp",
  ],
  "/medical-certificate-for-sick-leave-in-uae/": [
    "/wp-content/uploads/2024/03/UAE-Sick-Leave.jpg",
    "/wp-content/uploads/2024/03/Sick-leave.jpg",
    "/wp-content/uploads/2024/03/sick-leave-as-per-uae-labour-law.webp",
  ],
  "/role-of-emiratisation-in-uae/": [
    "/wp-content/uploads/2023/10/emiratisation-uae-4.jpg",
    "/wp-content/uploads/2024/10/Emiratisation-Percentage-in-Private-Sector---Updated-2024.webp",
    "/wp-content/uploads/2023/10/emiratisation-law.webp",
  ],
  "/limited-contract-resignation-in-uae/": [
    "/wp-content/uploads/2024/02/what-is-limited-contract-in-uae.webp",
    "/wp-content/uploads/2024/09/limited-and-unlimited-employment-contract-in-uae.webp",
    "/wp-content/uploads/2025/03/forced-resignation-by-employer.webp",
  ],
};

async function ensure(rel) {
  const dest = path.join("public", rel.replace(/^\//, ""));
  if (fs.existsSync(dest) && fs.statSync(dest).size > 800) return rel;
  const res = await fetch(LIVE + rel);
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 800) return null;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
  console.log("downloaded", rel, buf.length);
  return rel;
}

for (const [pathKey, cands] of Object.entries(map)) {
  const post = posts.find((p) => (p.path.endsWith("/") ? p.path : `${p.path}/`) === pathKey);
  let chosen = null;
  for (const cand of cands) {
    chosen = await ensure(cand);
    if (chosen) break;
  }
  console.log(pathKey, "=>", chosen);
  if (chosen && post) {
    post.featuredImage = chosen;
    if (!post.seo) post.seo = {};
    post.seo.ogImage = chosen;
  }
}

fs.writeFileSync("src/data/posts.json", JSON.stringify(posts, null, 2) + "\n");
