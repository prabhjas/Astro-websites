import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "src", "data");

function decodeCfEmail(encoded) {
  const r = parseInt(encoded.slice(0, 2), 16);
  let email = "";
  for (let n = 2; n < encoded.length; n += 2) {
    email += String.fromCharCode(parseInt(encoded.slice(n, n + 2), 16) ^ r);
  }
  return email;
}

function fixEmails(html) {
  if (!html) return html;
  let out = html;
  out = out.replace(/<a\b([^>]*\b__cf_email__\b[^>]*)>([\s\S]*?)<\/a>/gi, (full, attrs) => {
    const m = attrs.match(/data-cfemail=["']([a-f0-9]+)["']/i);
    if (!m) return full;
    const email = decodeCfEmail(m[1]);
    return `<a href="mailto:${email}">${email}</a>`;
  });
  out = out.replace(
    /<span class=["']__cf_email__["'] data-cfemail=["']([a-f0-9]+)["']>[\s\S]*?<\/span>/gi,
    (_, enc) => decodeCfEmail(enc),
  );
  // Nested span inside mailto/cdn-cgi link
  out = out.replace(
    /<a([^>]*href=["']\/cdn-cgi\/l\/email-protection[^"']*["'][^>]*)>[\s\S]*?<\/a>/gi,
    (full) => {
      const m = full.match(/data-cfemail=["']([a-f0-9]+)["']/i);
      if (!m) return full;
      const email = decodeCfEmail(m[1]);
      return `<a href="mailto:${email}">${email}</a>`;
    },
  );
  return out;
}

const sitePath = path.join(DATA, "site.json");
const site = JSON.parse(fs.readFileSync(sitePath, "utf8"));
site.headerHtml = fixEmails(site.headerHtml || "");
site.footerHtml = fixEmails(site.footerHtml || "");
fs.writeFileSync(sitePath, JSON.stringify(site, null, 2));

const pages = JSON.parse(fs.readFileSync(path.join(DATA, "pages.json"), "utf8"));
let n = 0;
for (const page of pages) {
  const before = page.bodyHtml || "";
  const after = fixEmails(before);
  if (after !== before) {
    page.bodyHtml = after;
    page.content = after;
    n++;
  }
}
fs.writeFileSync(path.join(DATA, "pages.json"), JSON.stringify(pages, null, 2));

console.log({
  footerMailto: /mailto:/.test(site.footerHtml),
  footerCf: /__cf_email__|data-cfemail/.test(site.footerHtml),
  pagesFixed: n,
  footerSnip: site.footerHtml.slice(
    Math.max(0, site.footerHtml.search(/mailto:|Contact:/i) - 20),
    Math.max(0, site.footerHtml.search(/mailto:|Contact:/i)) + 160,
  ),
});
