/**
 * Refresh /contact/ Elementor body from live (path is /contact/, not /contact-us/).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "src", "data");
const ORIGIN = "https://connectfz.com";
const PATH = "/contact/";

function decodeCfEmail(encoded) {
  const r = parseInt(encoded.slice(0, 2), 16);
  let email = "";
  for (let n = 2; n < encoded.length; n += 2) {
    email += String.fromCharCode(parseInt(encoded.slice(n, n + 2), 16) ^ r);
  }
  return email;
}

function fixEmails(html) {
  return html.replace(/<a\b([^>]*\b__cf_email__\b[^>]*)>([\s\S]*?)<\/a>/gi, (full, attrs) => {
    const m = attrs.match(/data-cfemail=["']([a-f0-9]+)["']/i);
    if (!m) return full;
    const email = decodeCfEmail(m[1]);
    return `<a href="mailto:${email}">${email}</a>`;
  });
}

function stripDomain(html) {
  return html
    .replaceAll("https://www.connectfz.com", "")
    .replaceAll("http://www.connectfz.com", "")
    .replaceAll("https://connectfz.com", "")
    .replaceAll("http://connectfz.com", "")
    .replaceAll("//connectfz.com", "")
    .replaceAll("//www.connectfz.com", "");
}

const res = await fetch(`${ORIGIN}${PATH}?nowprocket=1`, {
  headers: { "User-Agent": "ConnectFZ-Astro/1.0" },
});
if (!res.ok) {
  console.error("fetch failed", res.status);
  process.exit(1);
}
const html = await res.text();
const $ = cheerio.load(html);
const el = $('[data-elementor-type="wp-page"]').first();
if (!el.length) {
  console.error("No wp-page on contact");
  process.exit(1);
}
const cleaned = fixEmails(stripDomain($.html(el) || ""));

const pages = JSON.parse(fs.readFileSync(path.join(DATA, "pages.json"), "utf8"));
const page = pages.find((p) => p.path === PATH);
if (!page) {
  console.error("contact page missing in pages.json");
  process.exit(1);
}
page.bodyHtml = cleaned;
page.content = cleaned;

const bodies = JSON.parse(fs.readFileSync(path.join(DATA, "bodies.json"), "utf8"));
bodies[PATH] = cleaned;
// remove wrong key if present
delete bodies["/contact-us/"];

fs.writeFileSync(path.join(DATA, "pages.json"), JSON.stringify(pages, null, 2));
fs.writeFileSync(path.join(DATA, "bodies.json"), JSON.stringify(bodies, null, 2));

// also fix the old refresh script path for future use
console.log(
  JSON.stringify(
    {
      path: PATH,
      len: cleaned.length,
      hasForm: /wpcf7-form/.test(cleaned),
      hasCf7: /wpcf7/.test(cleaned),
      hasMail: /mailto:/i.test(cleaned),
      hasLocation: /Location/i.test(cleaned),
      formCount: (cleaned.match(/<form\b/gi) || []).length,
    },
    null,
    2,
  ),
);
