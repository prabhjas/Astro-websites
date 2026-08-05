#!/usr/bin/env node
/**
 * Make connectresources.ae Astro mirror self-contained for media:
 * - Discover upload URLs in repo + WP media API (incl. email signatures)
 * - Download / copy into public/assets/images/{year}/{month}/...
 * - Rewrite /wp-content/uploads/ and absolute WP upload URLs → /assets/images/
 * - Emit .data/wp-migration-report.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_ORIGIN = "https://connectresources.ae";
/** @type {Record<string, string>} */
const ORIGIN_BY_HOST = {
  "connectresources.ae": DEFAULT_ORIGIN,
  "www.connectresources.ae": DEFAULT_ORIGIN,
  "connectfreelance.ae": "https://connectfreelance.ae",
  "www.connectfreelance.ae": "https://connectfreelance.ae",
};
const PUBLIC = path.join(ROOT, "public");
const UPLOADS_PREFIX = "/wp-content/uploads/";
const LOCAL_PREFIX = "/assets/images/";
const REPORT_DIR = path.join(ROOT, ".data");
const REPORT_PATH = path.join(REPORT_DIR, "wp-migration-report.json");

const TEXT_EXT = new Set([
  ".astro",
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".json",
  ".css",
  ".html",
  ".htm",
  ".svg",
  ".xml",
  ".txt",
  ".yml",
  ".yaml",
  ".md",
]);

const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  ".git",
  ".data",
  ".astro",
  "email-signatures",
]);

const MEDIA_EXT =
  /\.(png|jpe?g|gif|webp|svg|avif|ico|pdf|mp4|webm|mov|woff2?|ttf|otf|eot)(\?|#|$)/i;

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

/** @param {string} uploadPath e.g. /wp-content/uploads/2026/07/foo.webp */
function uploadToLocal(uploadPath) {
  const norm = uploadPath.split("?")[0].split("#")[0];
  if (!norm.startsWith(UPLOADS_PREFIX)) return null;
  const rel = norm.slice(UPLOADS_PREFIX.length);
  return `${LOCAL_PREFIX}${rel}`;
}

/** @returns {{ path: string, origin: string } | null} */
function parseUploadRef(raw) {
  if (!raw || typeof raw !== "string") return null;
  let s = raw.trim().replace(/&amp;/g, "&");
  if (!s || s.endsWith("/")) return null;
  let origin = DEFAULT_ORIGIN;

  if (s.startsWith("//")) s = `https:${s}`;
  if (s.startsWith("http://") || s.startsWith("https://")) {
    try {
      const u = new URL(s);
      const mapped = ORIGIN_BY_HOST[u.hostname];
      if (!mapped) return null;
      origin = mapped;
      s = u.pathname;
    } catch {
      return null;
    }
  }

  if (!s.startsWith("/")) s = `/${s}`;
  if (!s.startsWith(UPLOADS_PREFIX)) return null;
  return { path: s.split("?")[0].split("#")[0], origin };
}

function uploadPathOnly(ref) {
  if (!ref) return null;
  return typeof ref === "string" ? ref : ref.path;
}

function walkFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walkFiles(p, out);
    else out.push(p);
  }
  return out;
}

function extractUploadPathsFromText(text) {
  /** @type {Map<string, string>} path -> download origin */
  const found = new Map();
  const hostPattern = "(?:www\\.)?(?:connectresources|connectfreelance)\\.ae";
  const patterns = [
    new RegExp(`https?:\\/\\/${hostPattern}(\\/wp-content\\/uploads\\/[^"'\\\\\\s)>]+)`, "gi"),
    /(?:^|[\s,('"=])(\/wp-content\/uploads\/[^\s"'<>\\)>]+)/gi,
    new RegExp(
      `url\\(\\s*['"]?(https?:\\/\\/${hostPattern})?(\\/wp-content\\/uploads\\/[^)'"]+)['"]?\\s*\\)`,
      "gi",
    ),
  ];
  for (const re of patterns) {
    for (const m of text.matchAll(re)) {
      const parsed = parseUploadRef(m[1] || m[2] || m[0]);
      if (parsed) found.set(parsed.path, parsed.origin);
    }
  }
  return found;
}

function rewriteText(text) {
  let n = 0;
  const hostPattern = "(?:www\\.)?(?:connectresources|connectfreelance)\\.ae";

  let out = text;
  out = out.replace(
    new RegExp(`https?:\\/\\/${hostPattern}(\\/wp-content\\/uploads\\/[^"'\\\\\\s)>]+)`, "gi"),
    (match, p) => {
      const local = uploadToLocal(p);
      if (local) {
        n++;
        return local;
      }
      return match;
    },
  );
  out = out.replace(
    new RegExp(
      `url\\(\\s*['"]?https?:\\/\\/${hostPattern}(\\/wp-content\\/uploads\\/[^)'"]+)['"]?\\s*\\)`,
      "gi",
    ),
    (_, p) => {
      const local = uploadToLocal(p);
      if (local) {
        n++;
        return `url(${local})`;
      }
      return _;
    },
  );
  out = out.replace(/(['"(])(\/wp-content\/uploads\/[^"'\\\s)>]+)/g, (full, q, p) => {
    const local = uploadToLocal(p);
    if (!local) return full;
    n++;
    return `${q}${local}`;
  });
  // srcset, CSS, and other unquoted paths (e.g. `1500w, /wp-content/uploads/...`)
  out = out.replace(/\/wp-content\/uploads\//g, () => {
    n++;
    return LOCAL_PREFIX;
  });
  return { text: out, replacements: n };
}

async function fetchBuffer(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "ConnectResources-Astro-asset-migration/1.0" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function downloadUpload(uploadPath, downloadOrigin, report) {
  const localUrl = uploadToLocal(uploadPath);
  if (!localUrl) return;
  const dest = path.join(PUBLIC, localUrl.slice(1));
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
    report.alreadyPresent++;
    return;
  }

  const legacy = path.join(PUBLIC, uploadPath.slice(1));
  if (fs.existsSync(legacy)) {
    const st = fs.statSync(legacy);
    if (st.isDirectory()) {
      report.missing.push({ path: uploadPath, error: "legacy path is a directory" });
      return;
    }
    if (st.size > 0) {
      ensureDir(path.dirname(dest));
      fs.copyFileSync(legacy, dest);
      report.copiedFromLegacy++;
      return;
    }
  }

  const url = `${downloadOrigin || DEFAULT_ORIGIN}${uploadPath}`;
  try {
    const buf = await fetchBuffer(url);
    ensureDir(path.dirname(dest));
    fs.writeFileSync(dest, buf);
    report.downloaded++;
    report.downloadedSamples.push(uploadPath);
    if (report.downloadedSamples.length > 30) report.downloadedSamples.shift();
  } catch (e) {
    report.missing.push({ path: uploadPath, origin: downloadOrigin, error: String(e.message || e) });
  }
}

async function fetchWpMediaSignatures(report) {
  /** @type {Map<string, string>} */
  const urls = new Map();
  const isSig = (s) => /signature|email-sign|e-sign/i.test(s);

  for (let page = 1; page <= 100; page++) {
    const r = await fetch(`${DEFAULT_ORIGIN}/wp-json/wp/v2/media?per_page=100&page=${page}`, {
      headers: { "User-Agent": "ConnectResources-Astro-asset-migration/1.0" },
    });
    if (!r.ok) break;
    const batch = await r.json();
    if (!Array.isArray(batch) || !batch.length) break;
    for (const m of batch) {
      const u = String(m.source_url || "").split("?")[0];
      const meta = `${m.title?.rendered || ""} ${m.slug || ""}`;
      if (isSig(u + meta)) {
        const parsed = parseUploadRef(u);
        if (parsed) urls.set(parsed.path, parsed.origin);
      }
    }
    const totalPages = Number(r.headers.get("X-WP-TotalPages") || 1);
    if (page >= totalPages) break;
  }
  report.signatureUrlsFromApi = urls.size;
  return urls;
}

async function poolMap(items, concurrency, fn) {
  const q = [...items];
  const workers = Array.from({ length: concurrency }, async () => {
    while (q.length) {
      const item = q.shift();
      if (item !== undefined) await fn(item);
    }
  });
  await Promise.all(workers);
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const rewriteOnly = process.argv.includes("--rewrite-only");
  const report = {
    generatedAt: new Date().toISOString(),
    origin: DEFAULT_ORIGIN,
    localPrefix: LOCAL_PREFIX,
    dryRun,
    discoveredUploadPaths: 0,
    signatureUrlsFromApi: 0,
    downloaded: 0,
    copiedFromLegacy: 0,
    alreadyPresent: 0,
    missing: [],
    downloadedSamples: [],
    filesRewritten: 0,
    rewriteReplacements: 0,
    remainingExternalUploadRefs: [],
    remainingAbsoluteMediaUrls: [],
  };

  console.log("Scanning codebase for upload references…");
  const scanRoots = [path.join(ROOT, "src"), PUBLIC];
  /** @type {Map<string, string>} */
  const allUploads = new Map();

  const mergeUploadMap = (map) => {
    for (const [p, origin] of map) allUploads.set(p, origin);
  };

  for (const root of scanRoots) {
    for (const file of walkFiles(root)) {
      const ext = path.extname(file).toLowerCase();
      if (!TEXT_EXT.has(ext)) continue;
      const text = fs.readFileSync(file, "utf8");
      mergeUploadMap(extractUploadPathsFromText(text));
    }
  }

  const sigUrls = path.join(PUBLIC, "media/email-signatures/urls.txt");
  if (fs.existsSync(sigUrls)) {
    for (const line of fs.readFileSync(sigUrls, "utf8").split("\n")) {
      const parsed = parseUploadRef(line.trim());
      if (parsed) allUploads.set(parsed.path, parsed.origin);
    }
  }

  const fromApi = rewriteOnly ? new Map() : await fetchWpMediaSignatures(report);
  mergeUploadMap(fromApi);

  // Mirror entire legacy uploads tree into assets (offline guarantee)
  const legacyUploadsDir = path.join(PUBLIC, "wp-content/uploads");
  if (fs.existsSync(legacyUploadsDir)) {
    for (const file of walkFiles(legacyUploadsDir)) {
      const st = fs.statSync(file);
      if (!st.isFile() || st.size === 0) continue;
      const rel = path.relative(legacyUploadsDir, file).replace(/\\/g, "/");
      if (!MEDIA_EXT.test(rel)) continue;
      const p = `${UPLOADS_PREFIX}${rel}`;
      if (!allUploads.has(p)) allUploads.set(p, DEFAULT_ORIGIN);
    }
  }

  report.discoveredUploadPaths = allUploads.size;
  console.log(`Found ${allUploads.size} unique upload paths`);

  if (!dryRun && !rewriteOnly) {
    console.log("Downloading / copying assets…");
    await poolMap([...allUploads.entries()], 12, ([p, origin]) =>
      downloadUpload(p, origin, report),
    );
  } else if (rewriteOnly) {
    console.log("Skipping download (--rewrite-only)");
  }

  console.log("Rewriting references…");
  for (const root of scanRoots) {
    for (const file of walkFiles(root)) {
      const ext = path.extname(file).toLowerCase();
      if (!TEXT_EXT.has(ext)) continue;
      const before = fs.readFileSync(file, "utf8");
      const { text: after, replacements } = rewriteText(before);
      if (replacements > 0 && !dryRun && after !== before) {
        fs.writeFileSync(file, after);
        report.filesRewritten++;
        report.rewriteReplacements += replacements;
      }
    }
  }

  // Audit remaining WP upload URLs (media only)
  const remain = new Set();
  const absRemain = new Set();
  const hostRe = /https?:\/\/(?:www\.)?(?:connectresources|connectfreelance)\.ae\/wp-content\/uploads\/[^"'\\\s)>]+/gi;
  for (const root of scanRoots) {
    for (const file of walkFiles(root)) {
      const ext = path.extname(file).toLowerCase();
      if (!TEXT_EXT.has(ext)) continue;
      const text = fs.readFileSync(file, "utf8");
      for (const p of extractUploadPathsFromText(text).keys()) remain.add(p);
      for (const m of text.matchAll(hostRe)) absRemain.add(m[0]);
    }
  }
  report.remainingExternalUploadRefs = [...remain].slice(0, 200);
  report.remainingAbsoluteMediaUrls = [...absRemain].slice(0, 200);

  ensureDir(REPORT_DIR);
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

  const md = [
    "# WordPress media migration report",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "| Metric | Count |",
    "|--------|------:|",
    `| Unique upload paths | ${report.discoveredUploadPaths} |`,
    `| Signature URLs (WP API) | ${report.signatureUrlsFromApi} |`,
    `| Downloaded from live | ${report.downloaded} |`,
    `| Copied from public/wp-content/uploads | ${report.copiedFromLegacy} |`,
    `| Already in assets/images | ${report.alreadyPresent} |`,
    `| Missing / failed | ${report.missing.length} |`,
    `| Files rewritten | ${report.filesRewritten} |`,
    `| Remaining relative upload refs | ${report.remainingExternalUploadRefs.length} |`,
    `| Remaining absolute WP media URLs | ${report.remainingAbsoluteMediaUrls.length} |`,
    "",
    report.missing.length
      ? `## Missing (${report.missing.length})\n\n${report.missing
          .slice(0, 50)
          .map((x) => `- \`${x.path}\` — ${x.error}`)
          .join("\n")}`
      : "## Missing\n\nNone.",
    "",
    report.remainingAbsoluteMediaUrls.length
      ? `## Remaining absolute WP media URLs\n\n${report.remainingAbsoluteMediaUrls
          .slice(0, 30)
          .map((u) => `- ${u}`)
          .join("\n")}`
      : "## Remaining absolute WP media URLs\n\nNone (src + public scan).",
    "",
    "## Notes",
    "",
    "- Upload media is served from `/assets/images/{year}/{month}/...`.",
    "- Legacy copies may remain under `public/wp-content/uploads/` for offline fallback.",
    "- Truncated srcset paths (no file extension) may 404 on live WP as well.",
    "",
  ].join("\n");
  fs.writeFileSync(path.join(REPORT_DIR, "wp-migration-report.md"), md);

  console.log(JSON.stringify(report, null, 2));
  console.log(`\nWrote ${REPORT_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
