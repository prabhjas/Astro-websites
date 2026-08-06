const base = "http://127.0.0.1:5102";
const paths = [
  "/construction/",
  "/manufacturing/",
  "/oil-and-gas/",
  "/logistics/",
  "/electromechanical/",
  "/factories/",
  "/food-industry/",
  "/landscaping/",
  "/warehouse/",
  "/industries/",
];

for (const path of paths) {
  const res = await fetch(base + path);
  const html = await res.text();
  const checks = {
    status: res.status,
    ss3: html.includes('id="n2-ss-3"'),
    init: html.includes("smartslider-n2-ss-3-init.js"),
    inlineCss: html.includes("smartslider-n2-ss-3-inline.css"),
    fixCss: html.includes("smartslider-industry-fix.css"),
    imgFix: html.includes("industry-images-fix.css"),
  };
  console.log(path, checks);
}

// Verify init/css assets 200
for (const asset of [
  "/scripts/smartslider-n2-ss-3-init.js",
  "/css/smartslider-n2-ss-3-inline.css",
  "/css/smartslider-industry-fix.css",
  "/css/industry-images-fix.css",
]) {
  const r = await fetch(base + asset);
  console.log(asset, r.status, r.headers.get("content-type"));
}
