/**
 * Replace Cloudflare email-protection placeholders with contact@connectfm.ae
 * Handles both HTML files and JSON (escaped quotes inside string values).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EMAIL = "contact@connectfm.ae";
const MAILTO = `mailto:${EMAIL}`;

function fixHtml(html) {
  if (typeof html !== "string" || !html) return html;
  let out = html;
  out = out.replace(
    /<a\b[^>]*__cf_email__[^>]*>[\s\S]*?<\/a>/gi,
    `<a href="${MAILTO}">${EMAIL}</a>`,
  );
  out = out.replace(/href="\/cdn-cgi\/l\/email-protection(?:#[^"]*)?"/gi, `href="${MAILTO}"`);
  out = out.replace(/\[email&#160;protected\]/gi, EMAIL);
  out = out.replace(/\[email[^\]]*protected\]/gi, EMAIL);
  out = out.replace(/\sdata-cfemail="[a-f0-9]+"/gi, "");
  out = out.replace(/\sclass="__cf_email__"/gi, "");
  return out;
}

function walk(value) {
  if (typeof value === "string") return fixHtml(value);
  if (Array.isArray(value)) return value.map(walk);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = walk(v);
    return out;
  }
  return value;
}

const JSON_FILES = ["src/data/bodies.json", "src/data/pages.json", "src/data/posts.json", "src/data/site.json"];
const HTML_FILES = [
  "src/data/header.html",
  "src/data/footer.html",
  "src/data/single-post-template.html",
];

for (const rel of JSON_FILES) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) continue;
  const data = JSON.parse(fs.readFileSync(full, "utf8"));
  const next = walk(data);
  fs.writeFileSync(full, JSON.stringify(next, null, 2) + "\n");
  const text = JSON.stringify(next);
  console.log(
    rel,
    "cf",
    (text.match(/__cf_email__/g) || []).length,
    "cdn",
    (text.match(/cdn-cgi\/l\/email-protection/g) || []).length,
    "contact",
    (text.match(/contact@connectfm\.ae/g) || []).length,
  );
}

for (const rel of HTML_FILES) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) continue;
  const before = fs.readFileSync(full, "utf8");
  const after = fixHtml(before);
  fs.writeFileSync(full, after);
  console.log(rel, before === after ? "unchanged" : "fixed");
}
