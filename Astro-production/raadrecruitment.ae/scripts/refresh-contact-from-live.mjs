/**
 * Refresh /contact/ Elementor body from live and decode CF emails.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "src", "data");
const ORIGIN = "";

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
    .replaceAll("", "")
    .replaceAll("", "")
    .replaceAll("", "")
    .replaceAll("", "")
    .replaceAll("//ngmanpower.com", "")
    .replaceAll("//www.ngmanpower.com", "");
}

const res = await fetch(`${ORIGIN}/contact/?nowprocket=1`, {
  headers: { "User-Agent": "EOR-Astro/1.0" },
});
const html = await res.text();
const $ = cheerio.load(html);
const el = $('[data-elementor-type="wp-page"]').first();
if (!el.length) {
  console.error("No wp-page on contact");
  process.exit(1);
}
const cleaned = fixEmails(stripDomain($.html(el) || ""));

const pages = JSON.parse(fs.readFileSync(path.join(DATA, "pages.json"), "utf8"));
const page = pages.find((p) => p.path === "/contact/");
if (!page) {
  console.error("contact page missing");
  process.exit(1);
}
page.bodyHtml = cleaned;
page.content = cleaned;

const bodies = JSON.parse(fs.readFileSync(path.join(DATA, "bodies.json"), "utf8"));
bodies["/contact/"] = cleaned;

fs.writeFileSync(path.join(DATA, "pages.json"), JSON.stringify(pages, null, 2));
fs.writeFileSync(path.join(DATA, "bodies.json"), JSON.stringify(bodies, null, 2));

console.log(
  JSON.stringify(
    {
      len: cleaned.length,
      hasForm: /wpcf7-form/.test(cleaned),
      hasLocation: /Location/.test(cleaned),
      hasOther: /Other Locations/.test(cleaned),
      hasMail: /mailto:contact@ngmanpower\.com/.test(cleaned),
      hasCall: /Make A Call|971/.test(cleaned),
      hasCf: /__cf_email__|data-cfemail/.test(cleaned),
    },
    null,
    2,
  ),
);
