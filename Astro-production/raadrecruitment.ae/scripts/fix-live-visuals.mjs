#!/usr/bin/env node
/**
 * Fix ngmanpower.com visual parity blockers:
 * 1. Un-lazy WP Rocket placeholders (data-lazy-src → src)
 * 2. Extract live Impreza inline CSS (theme-options / header / design / icons / custom)
 * 3. Download missing media + Impreza fonts referenced by live home
 * 4. Decode Cloudflare email protection in footer
 *
 *   node scripts/fix-live-visuals.mjs
 */
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  createWriteStream,
  readdirSync,
  statSync,
} from "node:fs";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "src/data");
const PUBLIC = join(ROOT, "public");
const CSS_OUT = join(PUBLIC, "css");
const ORIGIN = "";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

function stripDomain(html) {
  return html
    .replaceAll("", "")
    .replaceAll("", "")
    .replaceAll("", "")
    .replaceAll("", "")
    .replaceAll("//www.ngmanpower.com", "")
    .replaceAll("//ngmanpower.com", "");
}

/** Promote WP Rocket lazy attrs to real src/srcset. */
function unlazy(html) {
  if (!html) return html;
  let t = html;
  // img with data-lazy-src
  t = t.replace(
    /<img\b([^>]*?)\bsrc=(["'])data:image\/svg\+xml[^"']*\2([^>]*?)\bdata-lazy-src=(["'])([^"']+)\4([^>]*)>/gi,
    (_m, pre, _q1, mid, _q2, real, post) =>
      `<img${pre}src="${real}"${mid}${post}>`.replace(/\sdata-lazy-src=(["'])[^"']*\1/gi, ""),
  );
  t = t.replace(/\sdata-lazy-src=(["'])([^"']+)\1/gi, (_m, q, real) => {
    // if tag already has a non-data src this is leftover — strip attr only when we already fixed
    return "";
  });
  // data-lazy-srcset → srcset
  t = t.replace(/\sdata-lazy-srcset=(["'])([^"']+)\1/gi, ' srcset="$2"');
  t = t.replace(/\sdata-lazy-sizes=(["'])([^"']+)\1/gi, ' sizes="$2"');
  // background lazy
  t = t.replace(/\sdata-lazy-bg=(["'])([^"']+)\1/gi, (_m, _q, url) => {
    return ` style="background-image:url(${url})"`;
  });
  // Remove empty noscript duplicate blocks that follow (optional keep)
  t = t.replace(/<noscript>\s*<img[^>]*>\s*<\/noscript>/gi, "");
  // leftover rocket classes
  t = t.replace(/\sdata-lazy-srcset=(["'])[^"']*\1/gi, "");
  return t;
}

/** Second pass: any remaining data-lazy-src on tags that already have real src elsewhere. */
function unlazyAggressive(html) {
  let t = unlazy(html);
  // Generic: if data-lazy-src present, force src to that value
  t = t.replace(/<img\b([^>]*)>/gi, (full, attrs) => {
    const lazy = attrs.match(/\bdata-lazy-src=(["'])([^"']+)\1/i);
    if (!lazy) return full;
    const real = lazy[2];
    let a = attrs
      .replace(/\bsrc=(["'])[^"']*\1/i, `src="${real}"`)
      .replace(/\sdata-lazy-src=(["'])[^"']*\1/gi, "")
      .replace(/\sdata-lazy-srcset=(["'])([^"']+)\1/gi, ' srcset="$2"')
      .replace(/\sdata-lazy-sizes=(["'])([^"']+)\1/gi, ' sizes="$2"');
    if (!/\bsrc=/i.test(a)) a = ` src="${real}"` + a;
    return `<img${a}>`;
  });
  // source tags
  t = t.replace(/<source\b([^>]*)>/gi, (full, attrs) => {
    const lazy = attrs.match(/\bdata-lazy-srcset=(["'])([^"']+)\1/i);
    if (!lazy) return full;
    let a = attrs
      .replace(/\bsrcset=(["'])[^"']*\1/i, `srcset="${lazy[2]}"`)
      .replace(/\sdata-lazy-srcset=(["'])[^"']*\1/gi, "");
    if (!/\bsrcset=/i.test(a)) a = ` srcset="${lazy[2]}"` + a;
    return `<source${a}>`;
  });
  return t;
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

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html,*/*", Referer: ORIGIN + "/" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

async function download(url, dest) {
  if (existsSync(dest) && statSync(dest).size > 0) return "exists";
  mkdirSync(dirname(dest), { recursive: true });
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Referer: ORIGIN + "/" },
    redirect: "follow",
  });
  if (!res.ok || !res.body) throw new Error(`${res.status} ${url}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
  return "downloaded";
}

function extractStyleById(html, id) {
  const re = new RegExp(
    `<style[^>]*id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/style>`,
    "i",
  );
  const m = html.match(re);
  return m ? m[1].trim() : "";
}

function collectPathsFromHtml(html) {
  const paths = new Set();
  for (const m of html.matchAll(
    /(?:src|href|content|poster|data-src|data-lazy-src)=["']([^"']+)["']/gi,
  )) {
    paths.add(m[1].split(/\s+/)[0]);
  }
  for (const m of html.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/gi)) {
    paths.add(m[1].trim());
  }
  for (const m of html.matchAll(/srcset=["']([^"']+)["']/gi)) {
    for (const part of m[1].split(",")) {
      const u = part.trim().split(/\s+/)[0];
      if (u) paths.add(u);
    }
  }
  return [...paths];
}

function toLocalPath(u) {
  let s = (u || "").trim();
  if (!s || s.startsWith("data:") || s.startsWith("#") || s.startsWith("mailto:"))
    return null;
  s = s.replace(/^https?:\/\/(?:www\.)?ngmanpower\.com/i, "");
  s = s.replace(/^\/\/(?:www\.)?ngmanpower\.com/i, "");
  if (!s.startsWith("/wp-content/") && !s.startsWith("/wp-includes/")) return null;
  return s.split("?")[0].split("#")[0];
}

function walkTextFiles(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (["node_modules", "dist", ".data", ".git"].includes(name)) continue;
      walkTextFiles(p, out);
    } else if (/\.(html|json)$/i.test(name) && !name.includes(".bak")) {
      out.push(p);
    }
  }
  return out;
}

async function main() {
  console.log("Fetching live homepage (nowprocket)...");
  const liveHome = await fetchText(`${ORIGIN}/?nowprocket=1`);

  // --- inline CSS ---
  mkdirSync(CSS_OUT, { recursive: true });
  const inlineMap = {
    "us-theme-options-css": "impreza-theme-options.css",
    "us-header-css": "impreza-header.css",
    "us-design-options-css": "impreza-design-options.css",
    "us-icon-fonts": "impreza-icon-fonts.css",
    "wp-custom-css": "wp-customizer.css",
  };
  const savedCss = [];
  for (const [id, file] of Object.entries(inlineMap)) {
    let css = extractStyleById(liveHome, id);
    if (!css) {
      console.warn(" missing inline style", id);
      continue;
    }
    css = stripDomain(css);
    writeFileSync(join(CSS_OUT, file), css);
    savedCss.push(`/css/${file}`);
    console.log(" wrote", file, css.length, "bytes");
  }
  writeFileSync(
    join(DATA, "impreza-inline-css.json"),
    JSON.stringify(savedCss, null, 2),
  );

  // Poppins from live head if present
  const poppins = [
    ...liveHome.matchAll(
      /href=["'](https:\/\/fonts\.googleapis\.com\/css[^"']*Poppins[^"']*)["']/gi,
    ),
  ].map((m) => m[1]);
  if (poppins[0]) {
    writeFileSync(
      join(DATA, "google-fonts.json"),
      JSON.stringify({ hrefs: [...new Set(poppins)] }, null, 2),
    );
    console.log(" google fonts", poppins[0]);
  }

  // --- unlazy local HTML/JSON ---
  const targets = [
    join(DATA, "header.html"),
    join(DATA, "footer.html"),
    join(DATA, "pages.json"),
    join(DATA, "posts.json"),
    ...walkTextFiles(join(ROOT, "_crawl")),
  ];
  let unlazyFiles = 0;
  for (const file of targets) {
    if (!existsSync(file)) continue;
    const before = readFileSync(file, "utf8");
    if (!/data-lazy-src|data:image\/svg\+xml/i.test(before)) continue;
    let after = unlazyAggressive(before);
    after = decodeCfEmails(after);
    after = stripDomain(after);
    if (after !== before) {
      writeFileSync(file, after);
      unlazyFiles++;
      console.log(" unlazy", file.replace(ROOT, "ngmanpower.com"));
    }
  }
  console.log("unlazy files changed:", unlazyFiles);

  // --- download missing assets from live home + local references ---
  const localHomePaths = new Set();
  for (const f of [join(DATA, "header.html"), join(DATA, "footer.html"), join(DATA, "pages.json")]) {
    if (!existsSync(f)) continue;
    for (const u of collectPathsFromHtml(readFileSync(f, "utf8"))) {
      const p = toLocalPath(u);
      if (p) localHomePaths.add(p);
    }
  }
  for (const u of collectPathsFromHtml(liveHome)) {
    const p = toLocalPath(u);
    if (p) localHomePaths.add(p);
  }
  // always grab known layout-critical files
  for (const p of [
    "/wp-content/uploads/2024/05/Banner.jpg",
    "/wp-content/uploads/2023/05/Footer.jpg",
    "/wp-content/uploads/2023/05/bg-contact-form-optimized.jpg",
    "/wp-content/uploads/2023/12/Flower-BG.png",
    "/wp-content/uploads/2023/05/Rectangle-1.png",
    "/wp-content/uploads/2023/05/Ellipse-1.png",
    "/wp-content/themes/Impreza/fonts/fa-solid-900.woff2",
    "/wp-content/themes/Impreza/fonts/fa-solid-900.woff",
    "/wp-content/themes/Impreza/fonts/fa-regular-400.woff2",
    "/wp-content/themes/Impreza/fonts/fa-regular-400.woff",
    "/wp-content/themes/Impreza/fonts/fa-light-300.woff2",
    "/wp-content/themes/Impreza/fonts/fa-light-300.woff",
    "/wp-content/themes/Impreza/fonts/fa-duotone-900.woff2",
    "/wp-content/themes/Impreza/fonts/fa-duotone-900.woff",
    "/wp-content/themes/Impreza/fonts/fa-brands-400.woff2",
    "/wp-content/themes/Impreza/fonts/fa-brands-400.woff",
    "/wp-content/themes/Impreza/fonts/material-icons.woff2",
    "/wp-content/themes/Impreza/fonts/material-icons.woff",
  ]) {
    localHomePaths.add(p);
  }

  const media = [...localHomePaths].filter(
    (p) =>
      /\.(png|jpe?g|webp|gif|svg|ico|woff2?|ttf|eot|mp4)(\?|$)/i.test(p) ||
      /\/uploads\//.test(p),
  );

  let dlOk = 0;
  let dlFail = 0;
  let dlSkip = 0;
  const concurrency = 6;
  let i = 0;
  async function worker() {
    while (i < media.length) {
      const idx = i++;
      const path = media[idx];
      const dest = join(PUBLIC, ...path.split("/").filter(Boolean));
      try {
        const r = await download(ORIGIN + path, dest);
        if (r === "exists") dlSkip++;
        else {
          dlOk++;
          console.log(" DL", path);
        }
      } catch (e) {
        dlFail++;
        console.warn(" FAIL", path, e.message);
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  console.log(
    JSON.stringify(
      { savedCss, unlazyFiles, dlOk, dlSkip, dlFail, mediaQueued: media.length },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
