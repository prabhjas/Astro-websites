#!/usr/bin/env node
/**
 * Re-fetch live HTML with ?nowprocket=1 and refresh header/footer/page/post bodies.
 * Keeps existing ids/seo when possible; replaces body HTML + chrome.
 */
import { load } from "cheerio";
import { readFileSync, writeFileSync, existsSync, mkdirSync, createWriteStream, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "src/data");
const PUBLIC = join(ROOT, "public");
const ORIGIN = "https://ngmanpower.com";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

function normPath(p) {
  if (!p) return "/";
  let s = p.replace(/^https?:\/\/[^/]+/, "");
  if (!s.startsWith("/")) s = "/" + s;
  if (s !== "/" && !s.endsWith("/")) s += "/";
  return s;
}

function rewriteUrls(html) {
  if (!html) return html;
  return html
    .replace(/https?:\/\/(?:www\.)?ngmanpower\.com\//gi, "/")
    .replace(/https?:\/\/(?:www\.)?ngmanpower\.com/gi, "")
    .replace(/\/\/(?:www\.)?ngmanpower\.com\//gi, "/");
}

function fixNavTrailingSlashes(html) {
  if (!html) return html;
  return html
    .replace(/href="\/industries"/g, 'href="/industries/"')
    .replace(/href="\/insights"/g, 'href="/insights/"')
    .replace(/href="\/logistics"/g, 'href="/logistics/"')
    .replace(/href="\/food-industry"/g, 'href="/food-industry/"')
    .replace(/href="\/manufacturing"/g, 'href="/manufacturing/"')
    .replace(/href="\/construction"/g, 'href="/construction/"')
    .replace(/href="\/electromechanical"/g, 'href="/electromechanical/"')
    .replace(/href="\/landscaping"/g, 'href="/landscaping/"')
    .replace(/href="\/oil-and-gas"/g, 'href="/oil-and-gas/"')
    .replace(/href="\/factories"/g, 'href="/factories/"')
    .replace(/href="\/warehouse"/g, 'href="/warehouse/"')
    .replace(/href="\/about-us"/g, 'href="/about-us/"')
    .replace(/href="\/contact-us"/g, 'href="/contact-us/"');
}

function decodeCfEmails(html) {
  return html.replace(
    /<a\b[^>]*class="[^"]*__cf_email__[^"]*"[^>]*data-cfemail="([a-f0-9]+)"[^>]*>.*?<\/a>/gi,
    (_m, enc) => {
      try {
        const r = parseInt(enc.slice(0, 2), 16);
        let email = "";
        for (let n = 2; n < enc.length; n += 2) {
          email += String.fromCharCode(parseInt(enc.slice(n, n + 2), 16) ^ r);
        }
        return `<a href="mailto:${email}">${email}</a>`;
      } catch {
        return _m;
      }
    },
  );
}

function cleanHtml(html) {
  return fixNavTrailingSlashes(decodeCfEmails(rewriteUrls(html || "")));
}

async function fetchHtml(path) {
  const url = `${ORIGIN}${path === "/" ? "/" : path}?nowprocket=1`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html", Referer: ORIGIN + "/" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

function extractMain($) {
  for (const sel of ["#page-content", ".l-main", "main.l-main", "main"]) {
    const el = $(sel).first();
    if (el.length && (el.html() || "").trim().length > 100) {
      // Prefer inner HTML of l-main / #page-content (sections only)
      if (sel === "#page-content" || sel === ".l-main" || sel === "main.l-main") {
        return (el.html() || "").trim();
      }
      return (el.html() || "").trim();
    }
  }
  return "";
}

function extractHeader($) {
  const el = $("header.l-header, header#page-header, .l-header").first();
  return el.length ? $.html(el).trim() : "";
}

function extractFooter($) {
  const el = $("footer.l-footer, footer#page-footer, .l-footer").first();
  return el.length ? $.html(el).trim() : "";
}

function collectMedia(html) {
  const set = new Set();
  for (const m of html.matchAll(/(?:src|href|srcset)=["']([^"']+)["']/gi)) {
    for (const part of m[1].split(",")) {
      const u = part.trim().split(/\s+/)[0];
      if (u) set.add(u);
    }
  }
  for (const m of html.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/gi)) {
    set.add(m[1].trim());
  }
  return [...set]
    .map((u) => {
      let s = u.replace(/^https?:\/\/(?:www\.)?ngmanpower\.com/i, "");
      if (!s.startsWith("/wp-content/")) return null;
      return s.split("?")[0].split("#")[0];
    })
    .filter(Boolean);
}

async function download(path) {
  const dest = join(PUBLIC, ...path.split("/").filter(Boolean));
  if (existsSync(dest) && statSync(dest).size > 0) return "skip";
  mkdirSync(dirname(dest), { recursive: true });
  const res = await fetch(ORIGIN + path, {
    headers: { "User-Agent": UA, Referer: ORIGIN + "/" },
    redirect: "follow",
  });
  if (!res.ok || !res.body) throw new Error(`${res.status} ${path}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
  return "ok";
}

async function main() {
  const pages = JSON.parse(readFileSync(join(DATA, "pages.json"), "utf8"));
  const posts = JSON.parse(readFileSync(join(DATA, "posts.json"), "utf8"));

  console.log("Refreshing chrome from live home...");
  const homeHtml = await fetchHtml("/");
  const $home = load(homeHtml);
  writeFileSync(join(DATA, "header.html"), cleanHtml(extractHeader($home)));
  writeFileSync(join(DATA, "footer.html"), cleanHtml(extractFooter($home)));

  const media = new Set(collectMedia(homeHtml));

  async function refreshEntry(entry, kind) {
    const path = entry.path || "/";
    try {
      const html = await fetchHtml(path);
      const $ = load(html);
      const body = cleanHtml(extractMain($));
      if (body.length < 200) {
        console.warn(" short body", kind, path, body.length);
        return;
      }
      entry.content = body;
      entry.bodyHtml = body;
      for (const p of collectMedia(body)) media.add(p);
      console.log(" OK", kind, path, body.length);
    } catch (e) {
      console.warn(" FAIL", kind, path, e.message);
    }
  }

  console.log(`Refreshing ${pages.length} pages...`);
  for (const p of pages) await refreshEntry(p, "page");

  // Refresh a subset of recent posts first for speed? User needs images — do all posts.
  console.log(`Refreshing ${posts.length} posts...`);
  let i = 0;
  const concurrency = 4;
  async function worker() {
    while (i < posts.length) {
      const idx = i++;
      await refreshEntry(posts[idx], "post");
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  writeFileSync(join(DATA, "pages.json"), JSON.stringify(pages, null, 2) + "\n");
  writeFileSync(join(DATA, "posts.json"), JSON.stringify(posts, null, 2) + "\n");

  const mediaList = [...media].filter((p) =>
    /\.(png|jpe?g|webp|gif|svg|ico|woff2?|ttf)(\?|$)/i.test(p),
  );
  console.log("Downloading missing media", mediaList.length);
  let ok = 0;
  let fail = 0;
  let skip = 0;
  let j = 0;
  async function dlWorker() {
    while (j < mediaList.length) {
      const idx = j++;
      const path = mediaList[idx];
      try {
        const r = await download(path);
        if (r === "skip") skip++;
        else {
          ok++;
          console.log(" DL", path);
        }
      } catch (e) {
        fail++;
        console.warn(" FAIL", path, e.message);
      }
    }
  }
  await Promise.all(Array.from({ length: 6 }, () => dlWorker()));

  // sanity
  const sample = pages.find((p) => p.path === "/")?.bodyHtml || "";
  console.log(
    JSON.stringify(
      {
        homeLen: sample.length,
        homeLazy: (sample.match(/data-lazy-src/g) || []).length,
        homeSvgSrc: (sample.match(/src="data:image\/svg/g) || []).length,
        dlOk: ok,
        dlSkip: skip,
        dlFail: fail,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
