/**
 * Force-refresh Elementor single-post bodies from live for all posts
 * (REST content is not the Elementor single template with sticky CF7).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA = path.join(ROOT, "src", "data");
const ORIGIN = "https://iberiaeor.com";
const UA = "EOR-Astro-Migration/1.0";
const CONCURRENCY = Number(process.env.EOR_BODY_CONCURRENCY || 4);
const MIN_BODY = 2000;

function stripDomain(html) {
  return html
    .replaceAll("https://www.iberiaeor.com", "")
    .replaceAll("http://www.iberiaeor.com", "")
    .replaceAll("https://iberiaeor.com", "")
    .replaceAll("http://iberiaeor.com", "")
    .replaceAll("//iberiaeor.com", "")
    .replaceAll("//www.iberiaeor.com", "")
    .replaceAll("https://dev.iberiaeor.com", "")
    .replaceAll("http://dev.iberiaeor.com", "");
}

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
  out = out.replace(
    /<span class=["']__cf_email__["'] data-cfemail=["']([a-f0-9]+)["']>[\s\S]*?<\/span>/gi,
    (_, enc) => {
      const email = decodeCfEmail(enc) || "contact@iberiaeor.com";
      return email;
    },
  );
  out = out.replace(
    /<a([^>]*href=["']\/cdn-cgi\/l\/email-protection[^"']*["'][^>]*)>([\s\S]*?)<\/a>/gi,
    (full) => {
      const m = full.match(/data-cfemail=["']([a-f0-9]+)["']/i);
      const email = m ? decodeCfEmail(m[1]) : "contact@iberiaeor.com";
      const text = email;
      return `<a href="mailto:${email}">${text}</a>`;
    },
  );
  // Force brand contact email if any leftover obfuscation
  out = out.replace(/\[email&#160;protected\]/gi, "contact@iberiaeor.com");
  out = out.replace(/\[email\s*protected\]/gi, "contact@iberiaeor.com");
  return out;
}

function normalizePath(p) {
  if (!p || p === "/") return "/";
  let out = p.startsWith("/") ? p : `/${p}`;
  if (!out.endsWith("/")) out += "/";
  return out;
}

function extractBody(html) {
  const $ = cheerio.load(html);
  const el = $('[data-elementor-type="single-post"]').first();
  if (!el.length) return "";
  return $.html(el) || "";
}

async function mapPool(items, worker, concurrency) {
  let next = 0;
  async function run() {
    while (next < items.length) {
      const i = next++;
      await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => run()));
}

const posts = JSON.parse(fs.readFileSync(path.join(DATA, "posts.json"), "utf8"));
const bodies = JSON.parse(fs.readFileSync(path.join(DATA, "bodies.json"), "utf8"));

const need = posts.filter((p) => !/data-elementor-type=["']single-post["']/.test(p.bodyHtml || ""));
console.log(`Refreshing ${need.length}/${posts.length} posts without single-post Elementor body…`);

let done = 0;
let filled = 0;
await mapPool(
  need,
  async (entry) => {
    const pth = normalizePath(entry.path);
    try {
      const url = `${ORIGIN}${pth}?nowprocket=1`;
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (!res.ok) throw new Error(String(res.status));
      const html = await res.text();
      const body = extractBody(html);
      if (body.length >= MIN_BODY) {
        const cleaned = fixEmails(stripDomain(body));
        entry.bodyHtml = cleaned;
        entry.content = cleaned;
        entry.elementorCss = entry.elementorCss || "/wp-content/uploads/elementor/css/post-234.css";
        if (!Array.isArray(entry.pageCss)) entry.pageCss = [];
        for (const href of [
          "/wp-content/uploads/elementor/css/post-234.css",
          "/wp-content/plugins/elementor-pro/assets/css/modules/sticky.min.css",
          "/wp-content/plugins/contact-form-7/includes/css/styles.css",
          "/wp-content/plugins/country-phone-field-contact-form-7/assets/css/intlTelInput.min.css",
        ]) {
          if (!entry.pageCss.includes(href)) entry.pageCss.push(href);
        }
        bodies[pth] = cleaned;
        filled += 1;
      } else {
        console.warn("thin", pth, body.length);
      }
    } catch (e) {
      console.warn("fail", pth, e.message);
    }
    done += 1;
    if (done % 10 === 0 || done === need.length) {
      console.log(`  ${done}/${need.length} filled=${filled}`);
    }
  },
  CONCURRENCY,
);

fs.writeFileSync(path.join(DATA, "posts.json"), JSON.stringify(posts, null, 2));
fs.writeFileSync(path.join(DATA, "bodies.json"), JSON.stringify(bodies, null, 2));
console.log("Done", {
  filled,
  withSingle: posts.filter((p) => /single-post/.test(p.bodyHtml || "")).length,
  withCf7: posts.filter((p) => /wpcf7-form/.test(p.bodyHtml || "")).length,
});
