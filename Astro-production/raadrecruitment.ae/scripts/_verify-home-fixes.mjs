const base = "http://127.0.0.1:5102";

async function check(path) {
  const r = await fetch(base + path);
  console.log(path, r.status, r.headers.get("content-type"));
  return r;
}

const home = await (await check("/")).text();
console.log("icons", [...home.matchAll(/icon-[a-z-]+\.svg/g)].map((m) => m[0]));
console.log("Vector.png", (home.match(/Vector\.png/g) || []).length);
console.log("Placeholder.jpg", home.includes("Placeholder.jpg"));
console.log("ss init script", home.includes("smartslider-n2-ss-2-init.js"));
console.log("n2-ss-2", home.includes("n2-ss-2"));
console.log("What they", /What they says/i.test(home));
console.log("migration-overrides", home.includes("migration-overrides.css"));
console.log("Govt Authorized", home.includes("We are Govt Authorized"));

for (const p of [
  "/scripts/smartslider-n2-ss-2-init.js",
  "/wp-content/uploads/2023/05/icon-govt-authorized.svg",
  "/wp-content/uploads/2023/05/Placeholder.jpg",
  "/css/migration-overrides.css",
  "/wp-content/plugins/smart-slider-3/Public/SmartSlider3/Application/Frontend/Assets/dist/n2.min.js",
]) {
  await check(p);
}

// Peek at CSS overrides
const css = await (await fetch(base + "/css/migration-overrides.css")).text();
console.log("has iconbox override", css.includes("us_custom_41b180c8"));
