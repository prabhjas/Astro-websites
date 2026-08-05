import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "src", "data");

function fixCdnCgiMailto(html) {
  if (!html) return html;
  return html.replace(
    /<a([^>]*?)href=["']\/cdn-cgi\/l\/email-protection[^"']*["']([^>]*)>([\s\S]*?)<\/a>/gi,
    (full, pre, post, inner) => {
      const email = (inner.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i) || [])[0];
      if (!email) return full;
      return `<a${pre}href="mailto:${email}"${post}>${email}</a>`;
    },
  );
}

const sitePath = path.join(DATA, "site.json");
const site = JSON.parse(fs.readFileSync(sitePath, "utf8"));
site.footerHtml = fixCdnCgiMailto(site.footerHtml || "");
site.headerHtml = fixCdnCgiMailto(site.headerHtml || "");
fs.writeFileSync(sitePath, JSON.stringify(site, null, 2));

const pagesPath = path.join(DATA, "pages.json");
const pages = JSON.parse(fs.readFileSync(pagesPath, "utf8"));
let n = 0;
for (const page of pages) {
  const before = page.bodyHtml || "";
  const after = fixCdnCgiMailto(before);
  if (after !== before) {
    page.bodyHtml = after;
    page.content = after;
    n++;
  }
}
fs.writeFileSync(pagesPath, JSON.stringify(pages, null, 2));

console.log({
  n,
  footerMailto: (site.footerHtml.match(/mailto:[^"'\s>]+/) || [])[0] || null,
  footerCdn: /cdn-cgi/.test(site.footerHtml),
});
