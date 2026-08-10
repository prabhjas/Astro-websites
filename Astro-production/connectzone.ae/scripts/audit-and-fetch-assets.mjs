#!/usr/bin/env node
/**
 * Pre-deploy asset audit for connectzone.ae
 *
 * 1. Collect every /wp-content/… (and common theme/plugin asset) reference from
 *    pages.json, posts.json, authors.json, public/css, and layout snippets.
 * 2. Report refs that are missing on disk under public/.
 * 3. Optionally download missing files from the live origin (--fix).
 * 4. Optionally rewrite absolute  URLs in JSON to root-relative (--rewrite).
 * 5. Exit 1 if any referenced local asset is still missing (use before deploy).
 *
 * Usage:
 *   node scripts/audit-and-fetch-assets.mjs              # report only
 *   node scripts/audit-and-fetch-assets.mjs --fix         # download missing
 *   node scripts/audit-and-fetch-assets.mjs --fix --rewrite
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const PUBLIC = path.join(root, "public");
const ORIGIN = process.env.ASSET_ORIGIN || "";
const LIVE_HOSTS = new Set(["connectzone.ae", "www.connectzone.ae"]);

const FIX = process.argv.includes("--fix");
const REWRITE = process.argv.includes("--rewrite");
const STRICT = !process.argv.includes("--no-strict");

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/** @type {Map<string, Set<string>>} */
const refs = new Map(); // pathname -> sources

function pathCandidates(pathname) {
  const out = new Set([pathname]);
  try {
    out.add(decodeURIComponent(pathname));
  } catch {
    /* ignore */
  }
  // Encode non-ASCII path segments the way WP/rocket often stores them on disk (%D1%8F etc.)
  try {
    const parts = pathname.split("/");
    const enc = parts
      .map((seg) => {
        if (!seg) return seg;
        try {
          // decode first so we don't double-encode
          const decoded = decodeURIComponent(seg);
          return encodeURIComponent(decoded).replace(/%2F/gi, "/");
        } catch {
          return encodeURIComponent(seg);
        }
      })
      .join("/");
    out.add(enc);
  } catch {
    /* ignore */
  }
  return [...out];
}

const TEXT_EXTS = new Set([
  ".svg",
  ".html",
  ".htm",
  ".css",
  ".js",
  ".mjs",
  ".json",
  ".map",
  ".txt",
  ".xml",
]);

function isHtmlSoft404Buffer(buf, ext = "") {
  if (!buf || buf.length < 15) return true;
  if (TEXT_EXTS.has(ext.toLowerCase())) return false;
  const head = buf.subarray(0, 200).toString("utf8");
  if (buf[0] === 0x3c && /<!DOCTYPE|<html\b|Page Not Found/i.test(head)) return true;
  if (/\.(jpe?g|png|gif|webp|avif|ico|woff2?|ttf|otf|eot|mp4|webm)$/i.test(ext)) {
    if (/^\s*<(!DOCTYPE|html|head|body|script)/i.test(head)) return true;
  }
  return false;
}

function isSoft404File(filePath) {
  try {
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return true;
    const st = fs.statSync(filePath);
    if (st.size < 40) return true;
    const ext = path.extname(filePath);
    const n = Math.min(200, st.size);
    const buf = Buffer.alloc(n);
    const fd = fs.openSync(filePath, "r");
    fs.readSync(fd, buf, 0, n, 0);
    fs.closeSync(fd);
    return isHtmlSoft404Buffer(buf, ext);
  } catch {
    return true;
  }
}

function resolveLocal(pathname) {
  for (const candidate of pathCandidates(pathname)) {
    const dest = path.join(PUBLIC, candidate.replace(/^\//, ""));
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0 && !isSoft404File(dest)) {
      return { dest, pathname: candidate, exists: true, soft404: false };
    }
    if (fs.existsSync(dest) && isSoft404File(dest)) {
      return { dest, pathname: candidate, exists: false, soft404: true };
    }
  }
  // Preferred write target: percent-encoded segments (matches existing downloads)
  const preferred = pathCandidates(pathname).find((p) => p.includes("%")) || pathname;
  return {
    dest: path.join(PUBLIC, preferred.replace(/^\//, "")),
    pathname: preferred,
    exists: false,
    soft404: false,
  };
}

function rewriteEncodedFilenamesInText(text) {
  // Replace decoded Cyrillic/special chars inside /wp-content/… paths with %XX form matching disk
  return text.replace(/(\/wp-content\/[^"'\\\s)]+)/g, (full) => {
    const resolved = resolveLocal(full.split("?")[0]);
    if (resolved.exists && resolved.pathname !== full.split("?")[0]) {
      return full.replace(full.split("?")[0], resolved.pathname);
    }
    // If file only exists encoded, force encoded form even before download
    const enc = pathCandidates(full.split("?")[0]).find((p) => p.includes("%"));
    if (enc && /[^\x00-\x7F]/.test(full)) return full.replace(full.split("?")[0], enc);
    return full;
  });
}

function addRef(raw, source) {
  if (!raw || typeof raw !== "string") return;
  let cleaned = raw.trim().replace(/^['"]|['"]$/g, "");
  if (!cleaned || cleaned.startsWith("data:") || cleaned.startsWith("blob:")) return;
  if (cleaned.startsWith("//")) cleaned = "https:" + cleaned;

  let pathname = "";
  try {
    if (/^https?:\/\//i.test(cleaned)) {
      const u = new URL(cleaned);
      if (!LIVE_HOSTS.has(u.hostname) && !u.pathname.startsWith("/wp-content/")) {
        // External CDN / third-party — skip (fonts.googleapis, etc.)
        if (!u.pathname.includes("/wp-content/") && !u.pathname.includes("/wp-includes/")) return;
      }
      if (LIVE_HOSTS.has(u.hostname) || u.pathname.startsWith("/wp-content/") || u.pathname.startsWith("/wp-includes/")) {
        pathname = u.pathname;
      } else return;
    } else if (cleaned.startsWith("/wp-content/") || cleaned.startsWith("/wp-includes/")) {
      pathname = cleaned.split("?")[0].split("#")[0];
    } else if (cleaned.startsWith("wp-content/") || cleaned.startsWith("wp-includes/")) {
      pathname = "/" + cleaned.split("?")[0].split("#")[0];
    } else return;
  } catch {
    return;
  }

  pathname = pathname.split("?")[0].split("#")[0];
  pathname = pathname.replace(/,\d+w$/, "");
  if (pathname.endsWith("/")) return;
  if (!pathname.match(/\.[a-z0-9]{2,5}$/i) && !pathname.includes("/uploads/")) {
    if (!/\.(css|js|mjs|map|woff2?|ttf|otf|eot|svg|png|jpe?g|gif|webp|avif|ico|mp4|webm|pdf|json)$/i.test(pathname)) {
      return;
    }
  }

  // Canonicalize to an existing on-disk encoding when possible
  const resolved = resolveLocal(pathname);
  const key = resolved.exists ? resolved.pathname : pathname;

  if (!refs.has(key)) refs.set(key, new Set());
  refs.get(key).add(source);
}

function collectFromText(text, source) {
  if (!text) return;
  const patterns = [
    /(?:src|href|poster|data-src|data-lazy-src|data-bg|data-background|data-large_image|content)=["']([^"']+)["']/gi,
    /url\(\s*(['"]?)([^)'"]+)\1\s*\)/gi,
    /srcset=["']([^"']+)["']/gi,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(text))) {
      if (re.source.startsWith("srcset")) {
        for (const chunk of m[1].split(",")) {
          const url = chunk.trim().split(/\s+/)[0];
          addRef(url, source);
        }
      } else {
        addRef(m[2] || m[1], source);
      }
    }
  }
  // Absolute live URLs anywhere
  const abs = /https?:\/\/(?:www\.)?connectzone\.ae(\/wp-content\/[^"'\\\s)]+)/gi;
  let am;
  while ((am = abs.exec(text))) addRef(am[1], source);
}

function walkJson(value, source, depth = 0) {
  if (depth > 12 || value == null) return;
  if (typeof value === "string") {
    if (value.includes("/wp-content/") || value.includes("connectzone.ae") || value.includes("<")) {
      collectFromText(value, source);
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const v of value) walkJson(v, source, depth + 1);
    return;
  }
  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value)) walkJson(v, `${source}.${k}`, depth + 1);
  }
}

function walkDir(dir, filter, sourcePrefix) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === "dist") continue;
      walkDir(p, filter, sourcePrefix);
    } else if (filter(ent.name)) {
      collectFromText(fs.readFileSync(p, "utf8"), `${sourcePrefix}:${path.relative(root, p)}`);
    }
  }
}

function rewriteAbsoluteInFile(filePath) {
  let text = fs.readFileSync(filePath, "utf8");
  const before = text;
  text = text
    .replaceAll("", "")
    .replaceAll("", "")
    .replaceAll("", "")
    .replaceAll("", "")
    .replaceAll("//www.connectzone.ae", "")
    .replaceAll("//connectzone.ae", "");
  text = rewriteEncodedFilenamesInText(text);
  if (text !== before) {
    fs.writeFileSync(filePath, text);
    return true;
  }
  return false;
}

function isOptionalAsset(pathname) {
  // WP Rocket minify cache + unused template leftovers shouldn't block deploy
  return (
    pathname.includes("/wp-content/cache/") ||
    pathname.includes("/wp-rocket/") ||
    pathname.includes("/themes/Impreza/") ||
    // Cross-brand template leftovers (SP Heavy / Connect Resources) in CSS, not on this origin
    /Heavy-Machinery-Rental|Construction-Equipment|Scaffold-Rental|Generator-Rental|Forklift-Rental|equipment-rental|Salpicaduras|background-organge|hero-background-blog|Executive-Relocation|Global-Mobility|Hire-Staff-Bkg|Page-Connect-Resources|mobil-connect-resources/i.test(
      pathname,
    )
  );
}

async function download(pathname) {
  const resolved = resolveLocal(pathname);
  if (resolved.exists) return { ok: true, skipped: true, pathname: resolved.pathname };

  const tryPaths = pathCandidates(pathname);
  for (const tryPath of tryPaths) {
    const dest = path.join(PUBLIC, tryPath.replace(/^\//, ""));
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0 && !isSoft404File(dest)) {
      return { ok: true, skipped: true, pathname: tryPath };
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    // Live may serve either encoded or decoded URL
    for (const urlPath of pathCandidates(tryPath)) {
      const url = ORIGIN + urlPath;
      try {
        const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "manual" });
        if (res.status >= 300 && res.status < 400) {
          const loc = res.headers.get("location") || "";
          try {
            const next = new URL(loc, ORIGIN);
            if (!next.pathname.startsWith("/wp-content/")) continue;
            const res2 = await fetch(next.href, { headers: { "User-Agent": UA }, redirect: "manual" });
            if (!res2.ok || res2.status >= 300) continue;
            const ct2 = res2.headers.get("content-type") || "";
            const buf2 = Buffer.from(await res2.arrayBuffer());
            if (ct2.includes("text/html") || isHtmlSoft404Buffer(buf2, path.extname(tryPath))) continue;
            fs.writeFileSync(dest, buf2);
            return { ok: true, bytes: buf2.length, pathname: tryPath, url: next.href };
          } catch {
            continue;
          }
        }
        if (!res.ok) continue;
        const ct = res.headers.get("content-type") || "";
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length < 20) continue;
        if (ct.includes("text/html") || isHtmlSoft404Buffer(buf, path.extname(tryPath))) continue;
        fs.writeFileSync(dest, buf);
        return { ok: true, bytes: buf.length, pathname: tryPath, url };
      } catch {
        /* try next */
      }
    }
  }

  // Wayback fallback — live often serves soft-404 HTML for deleted media
  try {
    const cdx = `https://web.archive.org/cdx/search/cdx?url=connectzone.ae${pathname}&output=json&filter=statuscode:200&limit=5`;
    const cdxRes = await fetch(cdx, { headers: { "User-Agent": UA } });
    if (cdxRes.ok) {
      const rows = await cdxRes.json();
      const hit = (rows || [])
        .slice(1)
        .find((r) => String(r[3] || "").startsWith("image/") || String(r[3] || "").includes("octet"));
      const ts = hit?.[1] || rows?.[1]?.[1];
      if (ts) {
        const dest = path.join(PUBLIC, pathname.replace(/^\//, ""));
        const wbUrl = `https://web.archive.org/web/${ts}im_/${ORIGIN}${pathname}`;
        const wbRes = await fetch(wbUrl, { headers: { "User-Agent": UA }, redirect: "follow" });
        if (wbRes.ok) {
          const buf = Buffer.from(await wbRes.arrayBuffer());
          if (buf.length >= 20 && !isHtmlSoft404Buffer(buf, path.extname(pathname))) {
            fs.mkdirSync(path.dirname(dest), { recursive: true });
            fs.writeFileSync(dest, buf);
            return { ok: true, bytes: buf.length, pathname, url: wbUrl };
          }
        }
      }
    }
  } catch {
    /* ignore */
  }

  return { ok: false, status: 404, pathname };
}

// --- collect ---
for (const name of ["pages.json", "posts.json", "authors.json", "site.json", "menus.json", "redirects.json"]) {
  const fp = path.join(root, "src/data", name);
  if (!fs.existsSync(fp)) continue;
  try {
    walkJson(JSON.parse(fs.readFileSync(fp, "utf8")), `data/${name}`);
  } catch (e) {
    console.warn("skip parse", name, e.message);
  }
}

walkDir(path.join(PUBLIC, "css"), (n) => /\.(css|scss)$/i.test(n), "css");
walkDir(path.join(PUBLIC, "wp-content", "uploads", "elementor"), (n) => /\.css$/i.test(n), "elementor-css");
walkDir(path.join(PUBLIC, "wp-content", "uploads", "jupiterx"), (n) => /\.css$/i.test(n), "jupiterx-css");

// Layout / component templates that may hardcode asset paths
walkDir(path.join(root, "src"), (n) => /\.(astro|ts|js|css|html)$/i.test(n), "src");

const missing = [];
const soft404 = [];
const present = [];
const optionalMissing = [];
for (const pathname of [...refs.keys()].sort()) {
  const resolved = resolveLocal(pathname);
  if (resolved.exists) present.push(resolved.pathname);
  else if (isOptionalAsset(pathname)) optionalMissing.push(pathname);
  else if (resolved.soft404) soft404.push(pathname);
  else missing.push(pathname);
}

const broken = [...missing, ...soft404];

console.log(
  JSON.stringify(
    {
      origin: ORIGIN,
      referenced: refs.size,
      present: present.length,
      missing: missing.length,
      soft404: soft404.length,
      optionalMissing: optionalMissing.length,
      sampleSoft404: soft404.slice(0, 20),
      sampleMissing: missing.slice(0, 40),
    },
    null,
    2,
  ),
);

const reportPath = path.join(root, ".data/asset-audit-report.json");
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(
  reportPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      origin: ORIGIN,
      referenced: refs.size,
      present: present.length,
      missing,
      soft404,
      optionalMissing,
      missingSources: Object.fromEntries(broken.map((m) => [m, [...(refs.get(m) || [])].slice(0, 5)])),
    },
    null,
    2,
  ),
);
console.log("wrote", reportPath);

let downloaded = 0;
let failed = 0;
const stillMissing = [];

if (FIX) {
  for (const pathname of broken) {
    const result = await download(pathname);
    if (result.ok && !result.skipped) {
      downloaded++;
      console.log("got", result.pathname || pathname, result.bytes);
    } else if (result.ok && result.skipped) {
      // already present under alternate encoding
    } else {
      failed++;
      stillMissing.push({ pathname, ...result });
      // Remove HTML stub so it is not mistaken for a real asset at deploy time
      const dest = path.join(PUBLIC, pathname.replace(/^\//, ""));
      if (fs.existsSync(dest) && isSoft404File(dest)) {
        fs.unlinkSync(dest);
        console.warn("removed soft-404 stub", pathname);
      } else {
        console.warn("FAIL", pathname, result.status || result);
      }
    }
  }
  console.log({ downloaded, failed });
} else {
  stillMissing.push(...broken.map((pathname) => ({ pathname })));
}

if (REWRITE) {
  let rewritten = 0;
  for (const name of ["pages.json", "posts.json", "authors.json", "site.json"]) {
    const fp = path.join(root, "src/data", name);
    if (fs.existsSync(fp) && rewriteAbsoluteInFile(fp)) {
      rewritten++;
      console.log("rewrote absolute hosts / encodings in", name);
    }
  }
  function rewriteCssTree(dir) {
    if (!fs.existsSync(dir)) return;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) rewriteCssTree(p);
      else if (/\.css$/i.test(ent.name) && rewriteAbsoluteInFile(p)) {
        rewritten++;
        console.log("rewrote", path.relative(root, p));
      }
    }
  }
  rewriteCssTree(path.join(PUBLIC, "css"));
  rewriteCssTree(path.join(PUBLIC, "wp-content", "uploads", "elementor"));
  console.log({ rewrittenFiles: rewritten });
}

// Re-check after fix
const finalMissing = [];
for (const pathname of refs.keys()) {
  if (isOptionalAsset(pathname)) continue;
  if (!resolveLocal(pathname).exists) finalMissing.push(pathname);
}

if (FIX) {
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        origin: ORIGIN,
        referenced: refs.size,
        downloaded,
        failed,
        stillMissing: finalMissing,
        optionalMissing,
        failDetails: stillMissing.filter((x) => x.status),
      },
      null,
      2,
    ),
  );
}

console.log({ finalMissing: finalMissing.length, sample: finalMissing.slice(0, 25) });

if (STRICT && finalMissing.length > 0) {
  console.error(`\nASSET AUDIT FAILED: ${finalMissing.length} referenced asset(s) missing under public/`);
  process.exit(1);
}
