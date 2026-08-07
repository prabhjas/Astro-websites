import fs from "node:fs";

for (const f of ["pages.json", "posts.json", "header.html", "footer.html"]) {
  const p = `Astro-production/ngmanpower.com/src/data/${f}`;
  let t = fs.readFileSync(p, "utf8");
  const before = t;
  t = t.replace(
    /action="https?:\/\/[^"']*ngmanpower\.com\/[^"]*"/gi,
    'action="/api/contact/"',
  );
  t = t.replace(
    /action="\/wp-admin\/admin-ajax\.php[^"]*"/gi,
    'action="/api/contact/"',
  );
  if (t !== before) {
    fs.writeFileSync(p, t);
    console.log("patched", f);
  } else {
    console.log("no form action change", f);
  }
}
