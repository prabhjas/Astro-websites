import { chromium } from "playwright";

const b = await chromium.launch({ headless: true });
const p = await b.newPage();
const failed = [];
p.on("response", (r) => {
  if (r.status() >= 400) failed.push({ status: r.status(), url: r.url() });
});
p.on("pageerror", (e) => console.log("PAGEERR", e.message));
await p.goto("http://127.0.0.1:4321/heavy-machinery-rental/", {
  waitUntil: "networkidle",
  timeout: 60000,
});
await p.waitForTimeout(2000);
console.log(
  "404s",
  failed.filter((f) => !f.url.includes("favicon") && !f.url.includes("analytics")),
);

// Screenshot equipment carousel area
await p.evaluate(() => window.scrollTo(0, 800));
await p.screenshot({ path: "_crawl/compare/heavy-local-mid.png" });

const live = await b.newPage();
await live.goto("/heavy-machinery-rental/?nowprocket=1", {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await live.waitForTimeout(2500);
await live.evaluate(() => window.scrollTo(0, 800));
await live.screenshot({ path: "_crawl/compare/heavy-live-mid.png" });

await b.close();
console.log("screenshots saved");
