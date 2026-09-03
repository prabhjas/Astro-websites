/**
 * Audit and fix <img> tags missing alt attributes across Iberia EOR content.
 * Only adds alt where missing/empty; never modifies existing non-empty alt values.
 *
 * Usage:
 *   node scripts/audit-fix-missing-alt.mjs           # apply fixes + final audit
 *   node scripts/audit-fix-missing-alt.mjs --dry-run # report only, no writes
 *   node scripts/audit-fix-missing-alt.mjs --audit   # audit only
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DRY_RUN = process.argv.includes("--dry-run");
const AUDIT_ONLY = process.argv.includes("--audit");

/** @typedef {{ file: string, field?: string, index: number, src: string, addedAlt: string }} FixRecord */

/** @param {string} html @param {number} pos */
function findContextAlt(html, pos) {
  const before = html.slice(Math.max(0, pos - 5000), pos);
  const after = html.slice(pos, pos + 2500);

  const title = before.match(/\btitle=["']([^"']+)["']/i)?.[1]?.trim() ?? "";
  if (title) return title;

  // Prefer caption/title that follows the image (author cards, image boxes)
  const afterPatterns = [
    /<h3[^>]*class="[^"]*elementor-image-box-title[^"]*"[^>]*>([\s\S]*?)<\/h3>/i,
    /<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i,
    /class="[^"]*widget-image-caption[^"]*"[^>]*>([\s\S]*?)<\//i,
  ];
  for (const re of afterPatterns) {
    const m = after.match(re);
    if (m) {
      const t = stripTags(m[1]).trim();
      if (t) return t;
    }
  }

  return "";
}

/** @param {string} html @param {number} pos */
function findHeadingAlt(html, pos) {
  const before = html.slice(Math.max(0, pos - 4000), pos);
  const patterns = [
    /<h1[^>]*>([\s\S]*?)<\/h1>/gi,
    /<h2[^>]*>([\s\S]*?)<\/h2>/gi,
    /<h3[^>]*>([\s\S]*?)<\/h3>/gi,
    /<h4[^>]*>([\s\S]*?)<\/h4>/gi,
  ];
  for (const re of patterns) {
    let m;
    let last = "";
    while ((m = re.exec(before)) !== null) last = m[1];
    if (last) return stripTags(last).trim();
  }
  return "";
}

/** @param {string} src */
function altFromFilename(src) {
  const base = path.basename(src.split("?")[0], path.extname(src.split("?")[0]));
  if (!base || /^wp-image-\d+$/i.test(base)) return "";
  return base
    .replace(/^cropped-+/gi, "")
    .replace(/-scaled$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\d{1,2}x\d{1,2}\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** @param {string} tag @param {string} html */
function deriveAlt(tag, html) {
  const pos = html.indexOf(tag);
  const src = tag.match(/\bsrc=["']([^"']+)["']/i)?.[1] ?? "";
  const fromTitle = tag.match(/\btitle=["']([^"']+)["']/i)?.[1]?.trim() ?? "";
  const fromContext = pos >= 0 ? findContextAlt(html, pos) : "";
  const fromFile = altFromFilename(src);
  const fromHeading = pos >= 0 ? findHeadingAlt(html, pos) : "";

  for (const c of [fromTitle, fromContext, fromFile, fromHeading]) {
    const t = (c || "").trim();
    if (t.length >= 2) return t.length <= 120 ? t : t.slice(0, 117) + "...";
  }
  return "";
}

/**
 * @param {string} html
 */
function processHtml(html) {
  /** @type {Omit<FixRecord, 'file'|'field'>[]} */
  const fixes = [];
  /** @type { { index: number, src: string, reason: string }[] } */
  const missing = [];
  let imgIndex = 0;
  let searchFrom = 0;

  const out = html.replace(/<img\b[\s\S]*?>/gi, (tag) => {
    imgIndex++;
    const pos = html.indexOf(tag, searchFrom);
    if (pos >= 0) searchFrom = pos + tag.length;

    const src = tag.match(/\bsrc=["']([^"']+)["']/i)?.[1] ?? "";
    if (hasAltValue(tag)) return tag;

    const alt = deriveAlt(tag, html);
    if (!alt) {
      missing.push({ index: imgIndex, src, reason: "could not derive alt text" });
      return tag;
    }

    let newTag;
    const staticAlt = tag.match(/\balt=(["'])(.*?)\1/i);
    if (staticAlt) {
      newTag = tag.replace(/\balt=(["']).*?\1/i, `alt="${escapeAttr(alt)}"`);
    } else if (/\bsrc=/i.test(tag)) {
      newTag = tag.replace(/\bsrc=/i, `alt="${escapeAttr(alt)}" src=`);
    } else {
      newTag = tag.replace(/^<img/i, `<img alt="${escapeAttr(alt)}"`);
    }

    fixes.push({ index: imgIndex, src, addedAlt: alt });
    return newTag;
  });

  return { html: out, fixes, missing };
}

/** @param {string} s */
function stripTags(s) {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/** @param {string} s */
function escapeAttr(s) {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/** @param {string} content */
function countMissingAlt(content) {
  let missing = 0;
  forEachImgTag(content, (tag) => {
    if (!hasAltValue(tag)) missing++;
  });
  return missing;
}

/** @param {string} html @param {(tag: string) => void} fn */
function forEachImgTag(html, fn) {
  const re = /<img\b[\s\S]*?>/gi;
  let m;
  while ((m = re.exec(html)) !== null) fn(m[0]);
}

/** @param {string} tag */
function hasAltValue(tag) {
  const staticAlt = tag.match(/\balt=(["'])(.*?)\1/i);
  if (staticAlt && staticAlt[2].trim() !== "") return true;
  if (/\balt=\{/i.test(tag)) return true; // Astro/JSX dynamic alt
  return false;
}

/** @type {FixRecord[]} */
let totalFixes = [];

function applyToJson(filePath, fields) {
  const rel = path.relative(root, filePath).replace(/\\/g, "/");
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  let changed = false;

  if (Array.isArray(data)) {
    for (const entry of data) {
      for (const field of fields) {
        if (typeof entry[field] !== "string" || !entry[field].includes("<img")) continue;
        const { html, fixes, missing } = processHtml(entry[field]);
        if (fixes.length) {
          entry[field] = html;
          changed = true;
          for (const f of fixes) {
            totalFixes.push({ file: rel, field: `${entry.path || entry.slug || entry.id}:${field}`, ...f });
          }
        }
        if (missing.length && !AUDIT_ONLY) {
          for (const m of missing) {
            console.warn(`WARN could not fix ${rel} ${entry.path}:${field} img#${m.index} ${m.src}`);
          }
        }
      }
    }
  } else {
    for (const [key, val] of Object.entries(data)) {
      if (typeof val !== "string" || !val.includes("<img")) continue;
      const { html, fixes } = processHtml(val);
      if (fixes.length) {
        data[key] = html;
        changed = true;
        for (const f of fixes) totalFixes.push({ file: rel, field: key, ...f });
      }
    }
  }

  if (changed && !DRY_RUN && !AUDIT_ONLY) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
  }
}

function applyToText(filePath) {
  const rel = path.relative(root, filePath).replace(/\\/g, "/");
  const raw = fs.readFileSync(filePath, "utf8");
  if (!raw.includes("<img")) return;
  const { html, fixes } = processHtml(raw);
  if (fixes.length) {
    for (const f of fixes) totalFixes.push({ file: rel, ...f });
    if (!DRY_RUN && !AUDIT_ONLY) fs.writeFileSync(filePath, html);
  }
}

const jsonTargets = [
  { file: path.join(root, "src/data/pages.json"), fields: ["content", "bodyHtml"] },
  { file: path.join(root, "src/data/posts.json"), fields: ["content", "bodyHtml"] },
  { file: path.join(root, "src/data/bodies.json"), fields: null, isMap: true },
];

const textTargets = [
  path.join(root, "src/data/header.html"),
  path.join(root, "src/data/footer.html"),
  path.join(root, "src/pages/[...slug].astro"),
  path.join(root, "src/pages/search.astro"),
  path.join(root, "src/pages/404.astro"),
  path.join(root, "src/components/AuthorHero.astro"),
  path.join(root, "src/components/LicenceStrip.astro"),
  path.join(root, "src/components/PostCard.astro"),
  path.join(root, "src/lib/blog-card-html.ts"),
  path.join(root, "src/lib/eor-latest-post-filter.ts"),
];

if (!AUDIT_ONLY) {
  for (const t of jsonTargets) {
    if (!fs.existsSync(t.file)) continue;
    applyToJson(t.file, t.isMap ? [] : t.fields);
  }
  for (const filePath of textTargets) {
    if (fs.existsSync(filePath)) applyToText(filePath);
  }
}

// Final audit
let remaining = 0;
/** @type {{ file: string, src: string }[]} */
const remainingList = [];

function auditFile(filePath, handler) {
  const rel = path.relative(root, filePath).replace(/\\/g, "/");
  handler(fs.readFileSync(filePath, "utf8"), rel);
}

for (const t of jsonTargets) {
  if (!fs.existsSync(t.file)) continue;
  auditFile(t.file, (raw, rel) => {
    const data = JSON.parse(raw);
    if (Array.isArray(data)) {
      for (const entry of data) {
        for (const field of t.fields || ["content", "bodyHtml"]) {
          if (typeof entry[field] !== "string") continue;
          forEachImgTag(entry[field], (tag) => {
            if (!hasAltValue(tag)) {
              remaining++;
              remainingList.push({
                file: rel,
                src: tag.match(/\bsrc=["']([^"']+)["']/i)?.[1] ?? tag.slice(0, 80),
              });
            }
          });
        }
      }
    } else {
      for (const html of Object.values(data)) {
        if (typeof html !== "string") continue;
        remaining += countMissingAlt(html);
      }
    }
  });
}

for (const filePath of textTargets) {
  if (!fs.existsSync(filePath)) continue;
  auditFile(filePath, (raw, rel) => {
    forEachImgTag(raw, (tag) => {
      if (!hasAltValue(tag)) {
        remaining++;
        remainingList.push({
          file: rel,
          src: tag.match(/\bsrc=["']([^"']+)["']/i)?.[1] ?? tag.slice(0, 80),
        });
      }
    });
  });
}

// Unique fix count (content/bodyHtml duplicates share same src+alt)
const uniqueFixes = new Map();
for (const f of totalFixes) {
  uniqueFixes.set(`${f.file}|${f.src}|${f.addedAlt}`, f);
}

console.log(
  JSON.stringify(
    {
      mode: AUDIT_ONLY ? "audit" : DRY_RUN ? "dry-run" : "apply",
      imagesUpdated: uniqueFixes.size,
      fixRecordsWritten: totalFixes.length,
      remainingWithoutAlt: remaining,
      remainingSamples: remainingList.slice(0, 20),
    },
    null,
    2,
  ),
);

if (remaining > 0) process.exit(1);
