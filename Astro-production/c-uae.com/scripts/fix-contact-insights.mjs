/**
 * Fix contact-us CF email obfuscation + strip broken insights inline filter scripts.
 */
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
  let out = html;
  // Cloudflare obfuscated anchors (href may omit the hash)
  out = out.replace(
    /<a\b([^>]*\b__cf_email__\b[^>]*)>([\s\S]*?)<\/a>/gi,
    (full, attrs) => {
      const m = attrs.match(/data-cfemail=["']([a-f0-9]+)["']/i);
      if (!m) return full;
      const email = decodeCfEmail(m[1]);
      return `<a href="mailto:${email}">${email}</a>`;
    },
  );
  out = out.replace(
    /<a\b([^>]*data-cfemail=["'][a-f0-9]+["'][^>]*)>([\s\S]*?)<\/a>/gi,
    (full, attrs) => {
      if (!/__cf_email__|email-protection/i.test(attrs + full)) return full;
      const m = attrs.match(/data-cfemail=["']([a-f0-9]+)["']/i);
      if (!m) return full;
      const email = decodeCfEmail(m[1]);
      return `<a href="mailto:${email}">${email}</a>`;
    },
  );
  out = out.replace(
    /<span class=["']__cf_email__["'] data-cfemail=["']([a-f0-9]+)["']>[\s\S]*?<\/span>/gi,
    (_, enc) => decodeCfEmail(enc),
  );
  out = out.replace(
    /<script[^>]+\/cdn-cgi\/scripts\/[^"']+email-decode[^"']*["'][^>]*><\/script>/gi,
    "",
  );
  return out;
}

function stripInsightsBrokenScripts(html) {
  let out = html;
  // Remove CDN simplePagination (we vendor + load after jQuery)
  out = out.replace(
    /<script[^>]+src=["'][^"']*simplePagination[^"']*["'][^>]*>\s*<\/script>/gi,
    "",
  );
  // Remove inline scripts that call jQuery for filter/pagination before jQuery exists
  out = out.replace(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi, (full, body) => {
    if (/filter-button|pagination-container|simplePagination|\.post-grid/i.test(body)) {
      return "<!-- eor: insights filter moved to /scripts/insights-topic-filter.js -->";
    }
    return full;
  });
  return out;
}

const pages = JSON.parse(fs.readFileSync(path.join(DATA, "pages.json"), "utf8"));
const bodiesPath = path.join(DATA, "bodies.json");
const bodies = fs.existsSync(bodiesPath)
  ? JSON.parse(fs.readFileSync(bodiesPath, "utf8"))
  : {};

let contactFixed = false;
let insightsFixed = false;

for (const page of pages) {
  if (page.path === "/contact-us/") {
    const before = page.bodyHtml || page.content || "";
    const after = fixEmails(before);
    page.bodyHtml = after;
    page.content = after;
    bodies["/contact-us/"] = after;
    contactFixed = before !== after;
  }
  if (page.path === "/insights/") {
    const before = page.bodyHtml || page.content || "";
    const after = stripInsightsBrokenScripts(fixEmails(before));
    page.bodyHtml = after;
    page.content = after;
    bodies["/insights/"] = after;
    insightsFixed = before !== after;
  }
}

fs.writeFileSync(path.join(DATA, "pages.json"), JSON.stringify(pages, null, 2));
if (Object.keys(bodies).length) {
  fs.writeFileSync(bodiesPath, JSON.stringify(bodies, null, 2));
}

const insights = pages.find((p) => p.path === "/insights/");
const contact = pages.find((p) => p.path === "/contact-us/");
console.log(
  JSON.stringify(
    {
      contactFixed,
      insightsFixed,
      contactHasMailto: /mailto:contact@eormiddleast\.com/.test(contact?.bodyHtml || ""),
      contactHasCf: /__cf_email__|data-cfemail/.test(contact?.bodyHtml || ""),
      insightsHasInlineFilter: /filter-button[\s\S]{0,40}click/i.test(insights?.bodyHtml || ""),
      insightsHasCdnPagination: /simplePagination\.js/i.test(insights?.bodyHtml || ""),
      insightsHasComment: /insights-topic-filter/.test(insights?.bodyHtml || ""),
      filterBtns: (insights?.bodyHtml.match(/filter-button/g) || []).length,
      cards: (insights?.bodyHtml.match(/post-grid/g) || []).length,
    },
    null,
    2,
  ),
);
