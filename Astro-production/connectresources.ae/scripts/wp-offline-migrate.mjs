#!/usr/bin/env node
/**
 * Make Connect Resources Astro mirror fully offline:
 * - Discover asset URLs across src/data, public CSS/JS, HTML fragments
 * - Download missing files into public/ (same paths as live: /wp-content/...)
 * - Rewrite absolute connectresources.ae *media* URLs to root-relative paths
 * - Sync email signature images from urls.txt + WP media API
 * - Emit reports/wp-offline-migration-report.md
 */
import { createWriteStream } from "node:fs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");
const REPORT_DIR = path.join(ROOT, "reports");
const ORIGIN = "https://connectresources.ae";
const ORIGIN_ALIASES = [
  "https://connectresources.ae",
  "https://www.connectresources.ae",
  "http://connectresources.ae",
  "http://www.connectresources.ae",
];
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ConnectResources-Offline-Migrator/1.0";
const CONCURRENCY = 12;
const TEXT_EXT = new Set([
  ".json",
  ".html",
  ".css",
  ".js",
  ".mjs",
  ".astro",
  ".ts",
  ".tsx",
  ".md",
  ".txt",
  ".xml",
  ".svg",
]);

process.chdir(ROOT);

const ABS_ORIGIN = /https?:\/\/(?:www\.)?connectresources\.ae/gi;
const PROTO_REL = /\/\/(?:www\.)?connectresources\.ae\//gi;

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function sanitizeAssetRef(raw) {
  let s = raw.trim();
  s = s.split("#")[0].split("?")[0];
  s = s.replace(/[)\]}>].*$/, "");
  if (!/^\/(?:wp-content|wp-includes|assets\/images)\//.test(s)) return null;
  if (!/\.[a-z0-9]{2,5}$/i.test(s)) return null;
  return s;
}

function decodeWpFilenameVariants(url) {
  const variants = [url];
  try {
    const u = new URL(url);
    if (u.pathname.includes("u2013")) {
      const alt = u.pathname.replace(/u2013/g, "\u2013");
      variants.push(`${u.origin}${alt}`);
    }
    if (u.pathname.includes("u2014")) {
      const alt = u.pathname.replace(/u2014/g, "\u2014");
      variants.push(`${u.origin}${alt}`);
    }
  } catch {
    /* ignore */
  }
  return [...new Set(variants)];
}

function shouldLocalize(url) {
  try {
    const u = new URL(url);
    if (!ORIGIN_ALIASES.includes(u.origin)) return false;
    if (/[<>:"|?*\s]/.test(u.pathname)) return false;
    return (
      u.pathname.startsWith("/wp-content/") ||
      u.pathname.startsWith("/wp-includes/") ||
      u.pathname.startsWith("/assets/images/") ||
      /\.(css|js|mjs|map|woff2?|ttf|eot|otf|svg|png|jpe?g|gif|webp|avif|ico|json|mp4|webm|mov|pdf)$/i.test(
        u.pathname,
      )
    );
  } catch {
    return false;
  }
}

function toLocalPath(url) {
  const pathname = decodeURIComponent(new URL(url).pathname);
  return pathname.replace(/\/{2,}/g, "/");
}

function rewriteMediaAbsolute(text) {
  let out = text;
  out = out.replace(
    /https?:\/\/(?:www\.)?connectresources\.ae(\/wp-(?:content|includes)\/[^"'()\s<>\\]+)/gi,
    "$1",
  );
  out = out.replace(
    /url\(\s*['"]?\/\/(?:www\.)?connectresources\.ae(\/wp-content\/[^'")]+)['"]?\s*\)/gi,
    "url($1)",
  );
  out = out.replace(PROTO_REL, "/");
  return out;
}

function collectUrls(text) {
  const found = new Set();
  const normalized = text
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\\\//g, "/");

  const patterns = [
    /https?:\/\/(?:www\.)?connectresources\.ae\/[^"'<>\\)\s]+/gi,
    /url\(\s*['"]?(https?:\/\/(?:www\.)?connectresources\.ae[^'")]+)['"]?\s*\)/gi,
    /(?:^|["'\s(:,])(\/wp-content\/[^"'<>?\s,]+)/gi,
    /(?:^|["'\s(:,])(\/wp-includes\/[^"'<>?\s,]+)/gi,
    /(?:src|href|data-src|data-lazy-src|poster)=["']([^"']+)["']/gi,
    /url\(\s*(['"]?)([^)'"]+)\1\s*\)/gi,
  ];

  for (const re of patterns) {
    for (const match of normalized.matchAll(re)) {
      let raw = (match[1] || match[2] || match[0]).trim();
      if (!raw || raw.startsWith("data:") || raw.startsWith("#")) continue;
      raw = raw.replace(/\\/g, "").split('"')[0].split("'")[0].split("&")[0];
      raw = raw.split(/\s+\d+w/)[0].split(",")[0].replace(/[.,;)\]]+$/, "").trim();
      if (raw.startsWith("/wp-content/") || raw.startsWith("/wp-includes/") || raw.startsWith("/assets/images/")) {
        raw = ORIGIN + raw;
      }
      const sanitized = raw.startsWith("http") ? toLocalPath(raw.split("?")[0]) : sanitizeAssetRef(raw);
      if (sanitized && (sanitized.startsWith("/wp-content/") || sanitized.startsWith("/wp-includes/") || sanitized.startsWith("/assets/images/"))) {
        found.add(ORIGIN + sanitized);
        continue;
      }
      if (shouldLocalize(raw)) found.add(raw.split("#")[0].split("?")[0]);
    }
  }
  return [...found];
}

async function walkFiles(dir, filter) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(cur, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of entries) {
      if (ent.name === "node_modules" || ent.name === ".git" || ent.name === "dist") continue;
      const full = path.join(cur, ent.name);
      if (ent.isDirectory()) stack.push(full);
      else if (filter(full)) out.push(full);
    }
  }
  return out;
}

function isTextSource(file) {
  const ext = path.extname(file).toLowerCase();
  if (!TEXT_EXT.has(ext)) return false;
  if (file.includes(`${path.sep}dist${path.sep}`)) return false;
  return true;
}

async function fileExists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

async function downloadOne(remoteUrl, destPath) {
  if (await fileExists(destPath)) {
    const st = fs.statSync(destPath);
    if (st.size > 30) return { remoteUrl, destPath, status: "skipped" };
  }
  ensureDir(path.dirname(destPath));
  const res = await fetch(remoteUrl, {
    headers: { "User-Agent": UA, Accept: "*/*", Referer: `${ORIGIN}/` },
    redirect: "follow",
  });
  if (!res.ok || !res.body) {
    return { remoteUrl, destPath, status: "failed", error: `${res.status} ${res.statusText}` };
  }
  await pipeline(Readable.fromWeb(res.body), createWriteStream(destPath));
  return { remoteUrl, destPath, status: "downloaded" };
}

async function mapPool(items, limit, fn) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

async function downloadList(remotes) {
  const expanded = new Set();
  for (const remote of remotes) {
    for (const v of decodeWpFilenameVariants(remote)) expanded.add(v);
  }
  const jobs = [...expanded].map((remote) => ({
    remote,
    dest: path.join(PUBLIC, toLocalPath(remote).replace(/^\//, "")),
  }));
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;
  const failures = [];
  const results = await mapPool(jobs, CONCURRENCY, async (job) => {
    try {
      return await downloadOne(job.remote, job.dest);
    } catch (err) {
      return { remoteUrl: job.remote, destPath: job.dest, status: "failed", error: String(err) };
    }
  });
  for (const r of results) {
    if (r.status === "downloaded") downloaded++;
    else if (r.status === "skipped") skipped++;
    else {
      failed++;
      failures.push(r);
    }
  }
  return { downloaded, skipped, failed, failures };
}

async function fetchSignatureUrlsFromMediaApi() {
  const urls = new Set();
  const isSig = (u, meta = "") => /signature|email-sign|e-sign/i.test(`${u} ${meta}`);
  for (let page = 1; page <= 80; page++) {
    const r = await fetch(`${ORIGIN}/wp-json/wp/v2/media?per_page=100&page=${page}`, {
      headers: { "User-Agent": UA },
    });
    if (!r.ok) break;
    const batch = await r.json();
    if (!Array.isArray(batch) || !batch.length) break;
    for (const m of batch) {
      const u = String(m.source_url || "").split("?")[0];
      const meta = `${m.title?.rendered || ""} ${m.slug || ""}`;
      if (isSig(u, meta)) urls.add(u);
    }
    const totalPages = Number(r.headers.get("X-WP-TotalPages") || 1);
    if (page >= totalPages) break;
  }
  return urls;
}

function loadEmailSignatureUrlList() {
  const urls = new Set();
  const lists = [
    path.join(PUBLIC, "media/email-signatures/urls.txt"),
    path.join(ROOT, "../../email-signatures/urls.txt"),
  ];
  for (const f of lists) {
    if (!fs.existsSync(f)) continue;
    for (const line of fs.readFileSync(f, "utf8").split("\n")) {
      const u = line.trim();
      if (u.startsWith("http")) urls.add(u.split("?")[0]);
    }
  }
  return urls;
}

async function rewriteTextSources() {
  const roots = [
    path.join(ROOT, "src"),
    path.join(PUBLIC, "css"),
    path.join(PUBLIC, "scripts"),
    path.join(PUBLIC, "media"),
  ];
  let filesChanged = 0;
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    const files = await walkFiles(root, isTextSource);
    for (const file of files) {
      let raw = fs.readFileSync(file, "utf8");
      const next = rewriteMediaAbsolute(raw);
      if (next !== raw) {
        fs.writeFileSync(file, next);
        filesChanged++;
      }
    }
  }
  // public/wp-content text assets (css/js) — skip huge min bundles unless they reference origin
  const wpText = await walkFiles(path.join(PUBLIC, "wp-content"), (f) => {
    if (!isTextSource(f)) return false;
    const rel = path.relative(PUBLIC, f);
    if (rel.includes("/cache/min/")) return false;
    return true;
  });
  for (const file of wpText) {
    let raw = fs.readFileSync(file, "utf8");
    if (!ABS_ORIGIN.test(raw) && !PROTO_REL.test(raw)) continue;
    const next = rewriteMediaAbsolute(raw);
    if (next !== raw) {
      fs.writeFileSync(file, next);
      filesChanged++;
    }
  }
  return filesChanged;
}

function collectAllAssetUrls() {
  const urls = new Set();
  const scanRoots = [
    path.join(ROOT, "src"),
    path.join(PUBLIC, "css"),
    path.join(PUBLIC, "scripts"),
    path.join(PUBLIC, "media"),
  ];
  for (const root of scanRoots) {
    if (!fs.existsSync(root)) continue;
    for (const file of fs.existsSync(root) ? [] : []) {
      /* filled by walk */
    }
  }
  return (async () => {
    for (const root of scanRoots) {
      if (!fs.existsSync(root)) continue;
      const files = await walkFiles(root, isTextSource);
      for (const file of files) {
        const raw = fs.readFileSync(file, "utf8");
        for (const u of collectUrls(raw)) urls.add(u);
      }
    }
    const wpCss = await walkFiles(path.join(PUBLIC, "wp-content"), (f) =>
      /\.(css|js|mjs|html)$/i.test(f),
    );
    for (const file of wpCss) {
      try {
        const raw = fs.readFileSync(file, "utf8");
        for (const u of collectUrls(raw)) urls.add(u);
      } catch {
        /* binary misread */
      }
    }
    return urls;
  })();
}

async function auditMissingLocalFiles(urls) {
  const missing = [];
  for (const remote of urls) {
    const rel = toLocalPath(remote);
    const dest = path.join(PUBLIC, rel.replace(/^\//, ""));
    if (!fs.existsSync(dest) || fs.statSync(dest).size < 20) {
      missing.push({ remote, rel, dest });
    }
  }
  return missing;
}

function scanRemainingExternalMedia() {
  const remaining = new Set();
  const re =
    /https?:\/\/(?:www\.)?connectresources\.ae\/wp-(?:content|includes)\/[^\s"'<>\\)]+/gi;
  const scanRoots = [path.join(ROOT, "src"), PUBLIC];
  async function scan() {
    for (const root of [path.join(ROOT, "src")]) {
      const files = await walkFiles(root, isTextSource);
      for (const file of files) {
        const raw = fs.readFileSync(file, "utf8");
        for (const m of raw.matchAll(re)) remaining.add(m[0].split("?")[0]);
      }
    }
    const wpFiles = await walkFiles(path.join(PUBLIC, "wp-content"), (f) =>
      /\.(css|js|html)$/i.test(f),
    );
    for (const file of wpFiles) {
      const raw = fs.readFileSync(file, "utf8");
      for (const m of raw.matchAll(re)) remaining.add(m[0].split("?")[0]);
    }
  }
  return scan().then(() => [...remaining].sort());
}

async function playwrightNetworkAudit(baseUrl) {
  try {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const wpHits = [];
    page.on("request", (req) => {
      const u = req.url();
      if (/connectresources\.ae\/wp-(content|includes)/i.test(u)) wpHits.push(u);
    });
    const paths = ["/", "/contact/", "/insights/", "/blog/", "/corporate-pro-services/"];
    for (const p of paths) {
      await page.goto(`${baseUrl}${p}`, { waitUntil: "networkidle", timeout: 120_000 }).catch(() => {});
    }
    await browser.close();
    return { paths, wpHits: [...new Set(wpHits)] };
  } catch (e) {
    return { error: String(e), wpHits: [] };
  }
}

async function main() {
  ensureDir(REPORT_DIR);
  const started = new Date().toISOString();
  console.log("Rewriting absolute media URLs in text sources…");
  const filesChanged = await rewriteTextSources();
  console.log("Files rewritten:", filesChanged);

  console.log("Collecting asset URLs…");
  let urls = await collectAllAssetUrls();

  const sigUrls = new Set([...loadEmailSignatureUrlList(), ...(await fetchSignatureUrlsFromMediaApi())]);
  console.log("Email signature URLs:", sigUrls.size);
  for (const u of sigUrls) urls.add(u);

  console.log("Unique asset URLs:", urls.size);
  let stats = await downloadList([...urls]);
  console.log(
    `Pass 1: ${stats.downloaded} downloaded, ${stats.skipped} cached, ${stats.failed} failed`,
  );

  for (let round = 1; round <= 3; round++) {
    const nested = new Set();
    const wpFiles = await walkFiles(path.join(PUBLIC, "wp-content"), (f) =>
      /\.(css|js)$/i.test(f),
    );
    for (const file of wpFiles) {
      const raw = fs.readFileSync(file, "utf8");
      if (!raw.includes("/wp-content/") && !ABS_ORIGIN.test(raw)) continue;
      for (const u of collectUrls(raw)) nested.add(u);
      const next = rewriteMediaAbsolute(raw);
      if (next !== raw) fs.writeFileSync(file, next);
    }
    if (!nested.size) break;
    console.log(`Nested round ${round}: ${nested.size} URLs`);
    const roundStats = await downloadList([...nested]);
    stats.downloaded += roundStats.downloaded;
    stats.skipped += roundStats.skipped;
    stats.failed += roundStats.failed;
    stats.failures.push(...roundStats.failures);
  }

  const missing = await auditMissingLocalFiles(urls);
  const remainingExternal = await scanRemainingExternalMedia();
  const baseUrl = process.env.FLEET_LOCAL_URL || "http://127.0.0.1:5086";
  let networkAudit = { note: "Set FLEET_LOCAL_URL and run server for live network audit" };
  if (process.env.RUN_NETWORK_AUDIT === "1") {
    networkAudit = await playwrightNetworkAudit(baseUrl);
  }

  const report = `# WordPress offline migration report — connectresources.ae

Generated: ${started}

## Summary

| Metric | Value |
|--------|------:|
| Unique asset URLs discovered | ${urls.size} |
| Downloaded (new) | ${stats.downloaded} |
| Already local (skipped) | ${stats.skipped} |
| Download failures | ${stats.failed} |
| Missing on disk after pass | ${missing.length} |
| Text files rewritten (media URLs) | ${filesChanged} |
| Email signature sources | ${sigUrls.size} |

## Local path convention

Media is served from Astro \`public/\` using the same paths as WordPress (\`/wp-content/uploads/...\`, \`/wp-content/plugins/...\`).  
This is equivalent to mapping \`https://domain.com/wp-content/uploads/foo.png\` → \`/wp-content/uploads/foo.png\` (local static files).

## Missing assets (${missing.length})

${missing.length ? missing.slice(0, 80).map((m) => `- \`${m.rel}\` — ${m.remote}`).join("\n") : "_None_"}

${missing.length > 80 ? `\n_…and ${missing.length - 80} more (see JSON)._` : ""}

## Download failures (${stats.failures.length})

${stats.failures.length ? stats.failures.slice(0, 40).map((f) => `- \`${f.remoteUrl}\` — ${f.error || "failed"}`).join("\n") : "_None_"}

## Remaining absolute WordPress *media* URLs in source (${remainingExternal.length})

${remainingExternal.length ? remainingExternal.slice(0, 50).map((u) => `- ${u}`).join("\n") : "_None in src / wp-content text assets_"}

## Browser network audit (WordPress media requests)

${networkAudit.error ? `Skipped: ${networkAudit.error}` : networkAudit.note || `Pages: ${networkAudit.paths?.join(", ")}`}

WP domain media hits: **${networkAudit.wpHits?.length ?? 0}**

${(networkAudit.wpHits || []).map((u) => `- ${u}`).join("\n") || "_Run with server up: `RUN_NETWORK_AUDIT=1 FLEET_LOCAL_URL=http://127.0.0.1:5086 node scripts/wp-offline-migrate.mjs`_"}

## Next steps

1. \`node scripts/parity-fix.mjs\` for Impreza/Smart Slider critical scripts.
2. \`pnpm build\` and fleet smoke on port 5086.
3. Re-run this script after content refreshes from WordPress.
`;

  const reportPath = path.join(REPORT_DIR, "wp-offline-migration-report.md");
  fs.writeFileSync(reportPath, report);
  fs.writeFileSync(
    path.join(REPORT_DIR, "wp-offline-migration-missing.json"),
    JSON.stringify({ missing, failures: stats.failures, remainingExternal }, null, 2),
  );
  console.log("Wrote", reportPath);
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
