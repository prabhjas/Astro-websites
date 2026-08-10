#!/usr/bin/env node
/**
 * Pre-deploy asset audit for mbs-consultancy.com
 *
 * Prevents the Connect FZ failure mode: soft-404 HTML stubs saved as .jpg/.png
 * look "present" on disk (and often on localhost file checks) but break after
 * go-live when browsers actually decode them as images.
 *
 * 1. Collect asset refs from pages/posts/CSS/src
 * 2. Treat missing OR invalid stubs (HTML soft-404 / wrong magic) as broken
 * 3. --fix: sibling/basename heal (no fuzzy-prefix unless --fuzzy-heal), then live download
 * 4. --rewrite: strip absolute mbs-consultancy.com hosts → root-relative
 * 5. --check-dist: require every referenced asset also present under dist/client
 * 6. --active: only enforce refs from pages/posts + CSS those pages actually link
 * 7. Exit 1 if any referenced non-optional asset is still broken
 *
 * Usage:
 *   node scripts/audit-and-fetch-assets.mjs --active
 *   node scripts/audit-and-fetch-assets.mjs --active --fix --rewrite --check-dist
 *   pnpm run audit:assets:predeploy
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const PUBLIC = path.join(root, "public");
const DIST_CLIENT = path.join(root, "dist", "client");
const ORIGIN = process.env.ASSET_ORIGIN || "https://mbs-consultancy.com";
const LIVE_HOSTS = new Set(["mbs-consultancy.com", "www.mbs-consultancy.com"]);

const FIX = process.argv.includes("--fix");
const REWRITE = process.argv.includes("--rewrite");
const CHECK_DIST = process.argv.includes("--check-dist");
const FUZZY_HEAL = process.argv.includes("--fuzzy-heal");
/** Only enforce refs from pages/posts JSON + CSS files actually linked by those pages. */
const ACTIVE = process.argv.includes("--active");
const STRICT = !process.argv.includes("--no-strict");

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

/** @type {Map<string, Set<string>>} */
const refs = new Map();

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
  ".csv",
]);

/** Recognise real media by magic bytes (extension may be wrong; HTML stubs never pass). */
function hasValidMediaMagic(buf, ext = "") {
  if (!buf || buf.length < 12) return false;
  const e = ext.toLowerCase();
  if (TEXT_EXTS.has(e)) return true;

  const head = buf.subarray(0, Math.min(64, buf.length));
  const asText = head.toString("utf8");
  if (/^\s*<(!DOCTYPE|html|head|body|script)\b/i.test(asText)) return false;
  if (/Page Not Found/i.test(asText) && buf[0] === 0x3c) return false;

  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const isPng =
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  const isGif = buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38;
  const isWebp =
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf.length >= 12 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50;
  const isIco =
    (buf[0] === 0x00 && buf[1] === 0x00 && (buf[2] === 0x01 || buf[2] === 0x02) && buf[3] === 0x00) ||
    isPng;
  const isAvifOrMp4 =
    buf.length >= 12 && buf.subarray(4, 8).toString("ascii") === "ftyp";
  const isPdf = buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46; // %PDF
  const isWoff = buf[0] === 0x77 && buf[1] === 0x4f && buf[2] === 0x46 && buf[3] === 0x46; // wOFF
  const isWoff2 = buf[0] === 0x77 && buf[1] === 0x4f && buf[2] === 0x46 && buf[3] === 0x32; // wOF2
  const isTtf =
    (buf[0] === 0x00 && buf[1] === 0x01 && buf[2] === 0x00 && buf[3] === 0x00) ||
    (buf[0] === 0x74 && buf[1] === 0x72 && buf[2] === 0x75 && buf[3] === 0x65); // true
  const isOtf = buf[0] === 0x4f && buf[1] === 0x54 && buf[2] === 0x54 && buf[3] === 0x4f; // OTTO
  const isAnyImage = isJpeg || isPng || isGif || isWebp || isIco || isAvifOrMp4;

  if (/\.(jpe?g|png|gif|webp|avif|ico)$/i.test(e)) return isAnyImage;
  if (/\.(woff2?)$/i.test(e)) return isWoff || isWoff2;
  if (/\.(ttf)$/i.test(e)) return isTtf || isOtf;
  if (/\.(otf)$/i.test(e)) return isOtf || isTtf;
  if (/\.(eot)$/i.test(e)) return buf.length > 40; // legacy; size check mainly
  if (/\.(mp4|webm)$/i.test(e)) return isAvifOrMp4 || buf.length > 100;
  if (/\.(pdf)$/i.test(e)) return isPdf;
  // Non-media / unknown: reject obvious HTML only
  return !/^\s*</.test(asText);
}

function isHtmlSoft404Buffer(buf, ext = "") {
  if (!buf || buf.length < 15) return true;
  if (TEXT_EXTS.has(ext.toLowerCase())) return false;
  if (!hasValidMediaMagic(buf, ext)) return true;
  return false;
}

function isSoft404File(filePath) {
  try {
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return true;
    const st = fs.statSync(filePath);
    if (st.size < 40) return true;
    const ext = path.extname(filePath);
    const n = Math.min(64, st.size);
    const buf = Buffer.alloc(n);
    const fd = fs.openSync(filePath, "r");
    fs.readSync(fd, buf, 0, n, 0);
    fs.closeSync(fd);
    return isHtmlSoft404Buffer(buf, ext);
  } catch {
    return true;
  }
}

function pathCandidates(pathname) {
  const out = new Set([pathname]);
  try {
    out.add(decodeURIComponent(pathname));
  } catch {
    /* ignore */
  }
  return [...out];
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
  return {
    dest: path.join(PUBLIC, pathname.replace(/^\//, "")),
    pathname,
    exists: false,
    soft404: false,
  };
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
      if (
        LIVE_HOSTS.has(u.hostname) ||
        u.pathname.startsWith("/wp-content/") ||
        u.pathname.startsWith("/wp-includes/")
      ) {
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

  pathname = pathname.split("?")[0].split("#")[0].replace(/,\d+w$/, "");
  if (pathname.endsWith("/")) return;
  if (
    !/\.(css|js|mjs|map|woff2?|ttf|otf|eot|svg|png|jpe?g|gif|webp|avif|ico|mp4|webm|pdf|json)$/i.test(
      pathname,
    ) &&
    !pathname.includes("/uploads/")
  ) {
    return;
  }

  const key = pathname;
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
  const abs = /https?:\/\/(?:www\.)?mbs-consultancy\.com(\/wp-content\/[^"'\\\s)]+)/gi;
  let am;
  while ((am = abs.exec(text))) addRef(am[1], source);
}

function walkJson(value, source, depth = 0) {
  if (depth > 12 || value == null) return;
  if (typeof value === "string") {
    if (value.includes("/wp-content/") || value.includes("mbs-consultancy") || value.includes("<")) {
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
    .replaceAll("https://www.mbs-consultancy.com", "")
    .replaceAll("http://www.mbs-consultancy.com", "")
    .replaceAll("https://mbs-consultancy.com", "")
    .replaceAll("http://mbs-consultancy.com", "")
    .replaceAll("//www.mbs-consultancy.com", "")
    .replaceAll("//mbs-consultancy.com", "")
    // Legacy wrong TLD left by older scripts
    .replaceAll("https://www.mbs-consultancy.ae", "")
    .replaceAll("https://mbs-consultancy.ae", "")
    .replaceAll("//mbs-consultancy.ae", "");
  if (text !== before) {
    fs.writeFileSync(filePath, text);
    return true;
  }
  return false;
}

function isOptionalAsset(pathname) {
  return (
    pathname.includes("/wp-content/cache/") ||
    pathname.includes("/wp-rocket/") ||
    pathname.includes("/themes/Impreza/")
  );
}

/** Index real (non-soft404) upload files by basename for healing duplicates across months. */
function buildRealBasenameIndex() {
  /** @type {Map<string, string>} */
  const index = new Map();
  const uploads = path.join(PUBLIC, "wp-content/uploads");
  if (!fs.existsSync(uploads)) return index;

  function walk(d) {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (!isSoft404File(p)) {
        const base = ent.name.toLowerCase();
        if (!index.has(base)) index.set(base, p);
      }
    }
  }
  walk(uploads);
  return index;
}

function siblingCandidates(pathname) {
  const base = path.basename(pathname);
  const dir = path.dirname(pathname);
  const out = [];
  // foo-1.jpg → foo.jpg ; foo-op.jpg → foo.jpg ; foo-1-op.jpg → foo.jpg / foo-1.jpg
  const variants = [
    base.replace(/-1(\.[a-z0-9]+)$/i, "$1"),
    base.replace(/-op(\.[a-z0-9]+)$/i, "$1"),
    base.replace(/-1-op(\.[a-z0-9]+)$/i, "$1"),
    base.replace(/-op(\.[a-z0-9]+)$/i, "-1$1"),
  ];
  for (const v of variants) {
    if (v !== base) out.push(`${dir}/${v}`);
  }
  return out;
}

function healFromLocal(pathname, realIndex) {
  const dest = path.join(PUBLIC, pathname.replace(/^\//, ""));
  const copy = (src, via, from) => {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    return { ok: true, via, from };
  };

  for (const sib of siblingCandidates(pathname)) {
    const src = path.join(PUBLIC, sib.replace(/^\//, ""));
    if (fs.existsSync(src) && !isSoft404File(src)) {
      return copy(src, "sibling", sib);
    }
  }
  const base = path.basename(pathname);
  const hit = realIndex.get(base.toLowerCase());
  if (hit && !isSoft404File(hit)) {
    return copy(hit, "basename", path.relative(PUBLIC, hit));
  }

  // basename without -1 / -op / glued -Nop (Benefits-section-image-2op.jpg)
  const variants = [
    base.replace(/-1(\.[a-z0-9]+)$/i, "$1"),
    base.replace(/-op(\.[a-z0-9]+)$/i, "$1"),
    base.replace(/-1-op(\.[a-z0-9]+)$/i, "$1"),
    base.replace(/(\d)op(\.[a-z0-9]+)$/i, "$1$2"),
    base.replace(/(\.[a-z0-9]+)$/i, "-min$1"),
    base.replace(/(\.[a-z0-9]+)$/i, "-1$1"),
    base.replace(/(\.[a-z0-9]+)$/i, "-op$1"),
  ];
  for (const alt of variants) {
    const hit2 = realIndex.get(alt.toLowerCase());
    if (hit2 && !isSoft404File(hit2)) {
      return copy(hit2, "basename-variant", path.relative(PUBLIC, hit2));
    }
  }

  // Fuzzy heals copy unrelated sibling photos (Connect FZ / wrong-hero failure mode).
  // Only enabled with --fuzzy-heal, and never the open-ended "any prefix" match.
  if (FUZZY_HEAL) {
    const fuzzy = base.match(
      /^(home-banner-section|section-image|Benefits-section-image|Rectangle|Ellipse)[-_]?(\d+)/i,
    );
    if (fuzzy) {
      const prefix = fuzzy[1];
      const num = fuzzy[2];
      const all = [...realIndex.entries()].filter(([name]) =>
        name.startsWith(prefix.toLowerCase()),
      );
      const sameNum = all.find(([name]) =>
        new RegExp(`^${prefix.toLowerCase()}[-_]?${num}(?:-min|-1|-op)?`, "i").test(name),
      );
      if (sameNum) return copy(sameNum[1], "fuzzy-same-num", path.relative(PUBLIC, sameNum[1]));
    }
  }
  return { ok: false };
}

async function download(pathname) {
  const dest = path.join(PUBLIC, pathname.replace(/^\//, ""));
  // If already a real file, keep it — never overwrite with live soft-404 HTML
  if (fs.existsSync(dest) && !isSoft404File(dest)) {
    return { ok: true, skipped: true, pathname };
  }

  for (const urlPath of pathCandidates(pathname)) {
    const url = ORIGIN + urlPath;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "*/*", Referer: `${ORIGIN}/` },
        redirect: "follow",
      });
      if (!res.ok) continue;
      const ct = res.headers.get("content-type") || "";
      const buf = Buffer.from(await res.arrayBuffer());
      const ext = path.extname(pathname);
      if (
        ct.includes("text/html") ||
        isHtmlSoft404Buffer(buf, ext) ||
        !hasValidMediaMagic(buf, ext)
      ) {
        continue; // live soft-404 / wrong bytes — do not write
      }
      if (buf.length < 20) continue;
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, buf);
      return { ok: true, bytes: buf.length, pathname, url };
    } catch {
      /* try next */
    }
  }

  // Wayback Machine fallback when live returns soft-404 HTML
  try {
    const host = new URL(ORIGIN).hostname;
    const cdx = `https://web.archive.org/cdx/search/cdx?url=${host}${pathname}&output=json&filter=statuscode:200&limit=5`;
    const cdxRes = await fetch(cdx, { headers: { "User-Agent": UA } });
    if (cdxRes.ok) {
      const rows = await cdxRes.json();
      const hit = (rows || []).slice(1).find((r) => String(r[3] || "").startsWith("image/") || String(r[3] || "").includes("octet"));
      const ts = hit?.[1] || rows?.[1]?.[1];
      if (ts) {
        const wbUrl = `https://web.archive.org/web/${ts}im_/${ORIGIN}${pathname}`;
        const wbRes = await fetch(wbUrl, { headers: { "User-Agent": UA }, redirect: "follow" });
        if (wbRes.ok) {
          const buf = Buffer.from(await wbRes.arrayBuffer());
          const ext = path.extname(pathname);
          if (
            buf.length >= 20 &&
            !isHtmlSoft404Buffer(buf, ext) &&
            hasValidMediaMagic(buf, ext)
          ) {
            fs.mkdirSync(path.dirname(dest), { recursive: true });
            fs.writeFileSync(dest, buf);
            return { ok: true, bytes: buf.length, pathname, url: wbUrl, via: "wayback" };
          }
        }
      }
    }
  } catch {
    /* ignore wayback errors */
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
walkDir(path.join(root, "src"), (n) => /\.(astro|ts|js|css|html)$/i.test(n), "src");
for (const name of ["header.html", "footer.html"]) {
  const fp = path.join(root, "src/data", name);
  if (fs.existsSync(fp)) collectFromText(fs.readFileSync(fp, "utf8"), `data/${name}`);
}

/** CSS paths linked by pages/posts (and global theme CSS always considered active). */
function collectActiveCssHrefs() {
  const linked = new Set([
    "css/impreza-global.css",
    "css/impreza-inline-home.css",
    "css/fontawesome.min.css",
    "css/solid.min.css",
  ]);
  const add = (href) => {
    if (!href || typeof href !== "string") return;
    let p = href.split("?")[0].replace(/^\//, "");
    if (p.startsWith("css/") || p.includes("/page-design/")) linked.add(p);
  };
  for (const name of ["pages.json", "posts.json"]) {
    const fp = path.join(root, "src/data", name);
    if (!fs.existsSync(fp)) continue;
    const data = JSON.parse(fs.readFileSync(fp, "utf8"));
    for (const item of data) {
      for (const c of item.pageCss || []) add(c);
      const html = `${item.bodyHtml || ""}${item.content || ""}`;
      for (const m of html.matchAll(/\/css\/[^"'\\\s)]+\.css/g)) add(m[0]);
    }
  }
  return linked;
}

if (ACTIVE) {
  const linkedCss = collectActiveCssHrefs();
  // Elementor / EAEL CSS for pages & posts that actually ship
  const ids = new Set();
  for (const name of ["pages.json", "posts.json"]) {
    const fp = path.join(root, "src/data", name);
    if (!fs.existsSync(fp)) continue;
    for (const item of JSON.parse(fs.readFileSync(fp, "utf8"))) {
      if (item.id != null) ids.add(String(item.id));
      const html = `${item.bodyHtml || ""}${item.content || ""}`;
      const m = html.match(/data-elementor-id=["'](\d+)["']/);
      if (m) ids.add(m[1]);
    }
  }
  for (const id of ids) {
    linkedCss.add(`wp-content/uploads/elementor/css/post-${id}.css`);
    linkedCss.add(`wp-content/uploads/essential-addons-elementor/eael-${id}.css`);
  }

  for (const [pathname, sources] of [...refs.entries()]) {
    const keep = [...sources].some((s) => {
      if (s.startsWith("data/pages.json") || s.startsWith("data/posts.json")) return true;
      if (s.startsWith("data/header.html") || s.startsWith("data/footer.html")) return true;
      if (s.startsWith("data/authors.json") || s.startsWith("data/site.json") || s.startsWith("data/menus.json"))
        return true;
      if (s.startsWith("src:")) return true;
      if (s.startsWith("css:") || s.startsWith("elementor-css:")) {
        const rel = s.split(":").slice(1).join(":").replace(/\\/g, "/").replace(/^public\//, "");
        return [...linkedCss].some((l) => rel === l || rel.endsWith(l) || rel.includes(`/${l}`));
      }
      return false;
    });
    if (!keep) refs.delete(pathname);
  }
  console.log(
    JSON.stringify({ activeMode: true, activeRefs: refs.size, linkedCss: linkedCss.size, pageIds: ids.size }, null, 2),
  );
}

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
      sampleMissing: missing.slice(0, 20),
    },
    null,
    2,
  ),
);

const reportPath = path.join(root, ".data/asset-audit-report.json");
fs.mkdirSync(path.dirname(reportPath), { recursive: true });

let downloaded = 0;
let healed = 0;
let failed = 0;
const stillBroken = [];

if (FIX) {
  const realIndex = buildRealBasenameIndex();
  for (const pathname of broken) {
    // Prefer local heal first — live often returns soft-404 HTML for deleted media
    const heal = healFromLocal(pathname, realIndex);
    if (heal.ok) {
      healed++;
      // Keep index fresh for subsequent heals of same basename
      realIndex.set(path.basename(pathname).toLowerCase(), path.join(PUBLIC, pathname.replace(/^\//, "")));
      console.log("healed", pathname, "←", heal.via, heal.from);
      continue;
    }

    const dl = await download(pathname);
    if (dl.ok && !dl.skipped) {
      downloaded++;
      realIndex.set(path.basename(pathname).toLowerCase(), path.join(PUBLIC, pathname.replace(/^\//, "")));
      console.log("got", pathname, dl.bytes);
      continue;
    }
    if (dl.ok && dl.skipped) continue;

    failed++;
    stillBroken.push(pathname);
    // Remove HTML stub so runtime isRealPublicAsset() treats it as missing
    const dest = path.join(PUBLIC, pathname.replace(/^\//, ""));
    if (fs.existsSync(dest) && isSoft404File(dest)) {
      fs.unlinkSync(dest);
      console.warn("removed soft-404 stub", pathname);
    } else {
      console.warn("FAIL", pathname);
    }
  }
  console.log({ downloaded, healed, failed });
}

if (REWRITE) {
  let rewritten = 0;
  for (const name of ["pages.json", "posts.json", "authors.json", "site.json", "header.html", "footer.html"]) {
    const fp = path.join(root, "src/data", name);
    if (fs.existsSync(fp) && rewriteAbsoluteInFile(fp)) {
      rewritten++;
      console.log("rewrote", name);
    }
  }
  function rewriteCssTree(dir) {
    if (!fs.existsSync(dir)) return;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) rewriteCssTree(p);
      else if (/\.css$/i.test(ent.name) && rewriteAbsoluteInFile(p)) {
        rewritten++;
      }
    }
  }
  rewriteCssTree(path.join(PUBLIC, "css"));
  rewriteCssTree(path.join(PUBLIC, "wp-content", "uploads", "elementor"));
  console.log({ rewrittenFiles: rewritten });
}

// Final re-check (public/)
const finalBroken = [];
for (const pathname of refs.keys()) {
  if (isOptionalAsset(pathname)) continue;
  if (!resolveLocal(pathname).exists) finalBroken.push(pathname);
}

/** Ensure dist/client has the same non-soft404 bytes (deploy serves dist, not public alone). */
const distMissing = [];
const distSoft404 = [];
if (CHECK_DIST) {
  if (!fs.existsSync(DIST_CLIENT)) {
    console.error("ASSET AUDIT FAILED: dist/client missing — run build before --check-dist");
    process.exit(1);
  }
  for (const pathname of refs.keys()) {
    if (isOptionalAsset(pathname)) continue;
    let found = false;
    let soft = false;
    for (const candidate of pathCandidates(pathname)) {
      const dest = path.join(DIST_CLIENT, candidate.replace(/^\//, ""));
      if (fs.existsSync(dest) && fs.statSync(dest).size > 0 && !isSoft404File(dest)) {
        found = true;
        break;
      }
      if (fs.existsSync(dest) && isSoft404File(dest)) soft = true;
    }
    if (!found) {
      if (soft) distSoft404.push(pathname);
      else distMissing.push(pathname);
    }
  }
  console.log(
    JSON.stringify(
      {
        distCheck: true,
        distMissing: distMissing.length,
        distSoft404: distSoft404.length,
        sampleDistMissing: distMissing.slice(0, 20),
      },
      null,
      2,
    ),
  );
}

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
      downloaded,
      healed,
      failed,
      stillBroken: finalBroken,
      optionalMissing,
      distMissing,
      distSoft404,
      checkDist: CHECK_DIST,
      fuzzyHeal: FUZZY_HEAL,
    },
    null,
    2,
  ),
);
console.log("wrote", reportPath);
console.log({ finalBroken: finalBroken.length, sample: finalBroken.slice(0, 25) });

const distBroken = [...distMissing, ...distSoft404];
if (STRICT && (finalBroken.length > 0 || (CHECK_DIST && distBroken.length > 0))) {
  console.error(
    `\nASSET AUDIT FAILED: publicBroken=${finalBroken.length} distBroken=${distBroken.length}` +
      ` (missing/soft-404/invalid magic)`,
  );
  process.exit(1);
}
