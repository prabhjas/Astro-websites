#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

fs.mkdirSync("public/scripts/smart-slider", { recursive: true });
for (const f of ["bootstrap.js", "init-home.js"]) {
  fs.copyFileSync(
    path.join("src/data/smart-slider", f),
    path.join("public/scripts/smart-slider", f),
  );
}

function fixHtml(html) {
  if (!html) return html;
  return html.replace(/<img\b([^>]*?)>/gi, (full, attrs) => {
    if (!/skip-lazy|n2-ss-/i.test(full)) return full;
    let a = attrs.replace(/\sloading=(["'])lazy\1/gi, ' loading="eager"');
    if (!/\sloading=/i.test(a)) a += ' loading="eager"';
    return `<img${a}>`;
  });
}

for (const f of ["src/data/pages.json", "src/data/posts.json"]) {
  if (!fs.existsSync(f)) continue;
  const data = JSON.parse(fs.readFileSync(f, "utf8"));
  let changed = false;
  for (const row of data) {
    for (const key of ["content", "bodyHtml"]) {
      if (typeof row[key] !== "string") continue;
      const next = fixHtml(row[key]);
      if (next !== row[key]) {
        row[key] = next;
        changed = true;
      }
    }
  }
  if (changed) {
    fs.writeFileSync(f, JSON.stringify(data, null, 2) + "\n");
    console.log("updated", f);
  } else {
    console.log("noop", f);
  }
}

for (const f of ["src/data/header.html", "src/data/footer.html"]) {
  if (!fs.existsSync(f)) continue;
  const raw = fs.readFileSync(f, "utf8");
  const next = fixHtml(raw);
  if (next !== raw) {
    fs.writeFileSync(f, next);
    console.log("updated", f);
  } else {
    console.log("noop", f);
  }
}
