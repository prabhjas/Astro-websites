import fs from "node:fs";

const h = fs.readFileSync(
  new URL("./home.html", import.meta.url),
  "utf8",
);
console.log("len", h.length);
console.log("title", (h.match(/<title>([^<]+)/i) || [])[1]);
const desc =
  (h.match(/name=["']description["'][^>]*content=["']([^"']+)/i) ||
    h.match(/content=["']([^"']+)["'][^>]*name=["']description["']/i) ||
    [])[1];
console.log("desc", desc?.slice(0, 160));
const logos = [...h.matchAll(/src=["']([^"']*logo[^"']*)["']/gi)]
  .map((m) => m[1])
  .slice(0, 10);
console.log("logos", logos);
const phones = [...h.matchAll(/\+971[\d\s-]+/g)].slice(0, 8).map((m) => m[0]);
console.log("phones", phones);
const emails = [
  ...new Set(
    [...h.matchAll(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g)].map(
      (m) => m[0],
    ),
  ),
].filter((e) => !/wp-|schema|sentry|example|wixpress/i.test(e)).slice(0, 10);
console.log("emails", emails);
const css = [...h.matchAll(/href=["']([^"']+\.css[^"']*)["']/g)].map((m) => m[1]);
console.log("css count", css.length);
console.log("elementor header", h.includes("elementor-location-header"));
console.log("elementor footer", h.includes("elementor-location-footer"));
const ids = [...h.matchAll(/data-elementor-id=["'](\d+)["']/g)].map((m) => m[1]);
console.log("elementor ids", [...new Set(ids)].slice(0, 30));
const favicon = (h.match(/rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)/i) ||
  h.match(/href=["']([^"']+)["'][^>]*rel=["'](?:shortcut )?icon["']/i) ||
  [])[1];
console.log("favicon", favicon);
