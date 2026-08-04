/**
 * Refresh /insights/ body from live and keep filter scripts stripped
 * (handled by /scripts/insights-topic-filter.js after jQuery).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "src", "data");
const ORIGIN = "https://connectfz.com";

function decodeCfEmail(encoded) {
  const r = parseInt(encoded.slice(0, 2), 16);
  let email = "";
  for (let n = 2; n < encoded.length; n += 2) {
    email += String.fromCharCode(parseInt(encoded.slice(n, n + 2), 16) ^ r);
  }
  return email;
}

function fixEmails(html) {
  return html
    .replace(/<a\b([^>]*\b__cf_email__\b[^>]*)>([\s\S]*?)<\/a>/gi, (full, attrs) => {
      const m = attrs.match(/data-cfemail=["']([a-f0-9]+)["']/i);
      if (!m) return full;
      const email = decodeCfEmail(m[1]);
      return `<a href="mailto:${email}">${email}</a>`;
    })
    .replace(
      /<a([^>]*?)href=["']\/cdn-cgi\/l\/email-protection[^"']*["']([^>]*)>([\s\S]*?)<\/a>/gi,
      (full, pre, post, inner) => {
        const email = (inner.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i) || [])[0];
        if (!email) return full;
        return `<a${pre}href="mailto:${email}"${post}>${email}</a>`;
      },
    );
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

function stripBrokenFilterScripts(html) {
  let out = html;
  out = out.replace(/<script[^>]+src=["'][^"']*simplePagination[^"']*["'][^>]*>\s*<\/script>/gi, "");
  out = out.replace(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi, (full, body) => {
    if (/filter-button|pagination-container|simplePagination|\.post-grid/i.test(body)) {
      return "<!-- eor: insights filter moved to /scripts/insights-topic-filter.js -->";
    }
    return full;
  });
  return out;
}

async function downloadCssFromHtml(html) {
  const out = [];
  for (const m of html.matchAll(/href=["']([^"']+\.css[^"']*)["']/g)) {
    let u = m[1].replace(/&#038;/g, "&").replace(/&amp;/g, "&");
    if (u.startsWith("//")) u = `https:${u}`;
    else if (u.startsWith("/")) u = ORIGIN + u;
    if (!u.includes("connectfz.com")) continue;
    const clean = u.split("?")[0];
    const rel = new URL(clean).pathname;
    const dest = path.join(ROOT, "public", rel.replace(/^\//, ""));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (!fs.existsSync(dest) || fs.statSync(dest).size < 50) {
      try {
        const res = await fetch(clean, { headers: { "User-Agent": "EOR-Astro/1.0" } });
        if (res.ok) fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
      } catch {
        /* ignore */
      }
    }
    out.push(rel);
  }
  return [...new Set(out)];
}

const res = await fetch(`${ORIGIN}/insights/?nowprocket=1`, {
  headers: { "User-Agent": "EOR-Astro/1.0" },
});
const html = await res.text();
const $ = cheerio.load(html);
const el = $('[data-elementor-type="wp-page"]').first();
if (!el.length) {
  console.error("No insights wp-page");
  process.exit(1);
}

const cleaned = stripBrokenFilterScripts(fixEmails(stripDomain($.html(el) || "")));
const pageCss = await downloadCssFromHtml(html);

const pages = JSON.parse(fs.readFileSync(path.join(DATA, "pages.json"), "utf8"));
const page = pages.find((p) => p.path === "/insights/");
if (!page) {
  console.error("insights page missing");
  process.exit(1);
}
page.bodyHtml = cleaned;
page.content = cleaned;
page.pageCss = [...new Set([...(page.pageCss || []), ...pageCss])];

const bodies = JSON.parse(fs.readFileSync(path.join(DATA, "bodies.json"), "utf8"));
bodies["/insights/"] = cleaned;

fs.writeFileSync(path.join(DATA, "pages.json"), JSON.stringify(pages, null, 2));
fs.writeFileSync(path.join(DATA, "bodies.json"), JSON.stringify(bodies, null, 2));

console.log(
  JSON.stringify(
    {
      len: cleaned.length,
      cards: (cleaned.match(/post-grid/g) || []).length,
      filters: (cleaned.match(/filter-button/g) || []).length,
      hasLoop: /loop-wrap/.test(cleaned),
      hasReadMore: /Read More/i.test(cleaned),
      hasExplore: /EXPLORE/i.test(cleaned),
      pageCss: pageCss.filter((c) => /21414|21423|insights|nunito|owl/i.test(c)).slice(0, 12),
    },
    null,
    2,
  ),
);
