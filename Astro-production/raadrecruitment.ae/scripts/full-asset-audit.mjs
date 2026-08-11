#!/usr/bin/env node
/**
 * Full asset audit for local raadrecruitment homepage (+ sample pages).
 */
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE || "http://127.0.0.1:5113";
const PUBLIC = path.join(process.cwd(), "public");

const paths = ["/", "/emiratisation/", "/contact-us/", "/blog/"];

function isImageBuf(buf) {
  if (!buf || buf.length < 12) return false;
  if (buf[0] === 0xff && buf[1] === 0xd8) return true;
  if (buf[0] === 0x89 && buf[1] === 0x50) return true;
  if (buf.slice(0, 4).toString() === "RIFF" && buf.slice(8, 12).toString() === "WEBP")
    return true;
  if (buf.slice(0, 6).toString("ascii").startsWith("GIF")) return true;
  if (buf.slice(0, 200).toString("utf8").toLowerCase().includes("<svg")) return true;
  return false;
}
function isHtmlBuf(buf) {
  const h = buf.slice(0, 80).toString("utf8").toLowerCase();
  return h.includes("<!doctype") || h.includes("<html");
}
function isFontBuf(buf, p) {
  if (!buf || buf.length < 4) return false;
  // woff2 = 0x77 0x4F 0x46 0x32 "wOF2"
  const sig = buf.slice(0, 4).toString("ascii");
  if (sig === "wOF2" || sig === "wOFF") return true;
  // ttf/otf
  if (buf[0] === 0x00 && buf[1] === 0x01 && buf[2] === 0x00 && buf[3] === 0x00) return true;
  if (sig === "OTTO" || sig === "true") return true;
  if (/\.svg$/i.test(p) && buf.toString("utf8", 0, 200).includes("<svg")) return true;
  return false;
}

async function fetchBuf(url) {
  const res = await fetch(url);
  const buf = Buffer.from(await res.arrayBuffer());
  return { status: res.status, buf, ct: res.headers.get("content-type") || "" };
}

function abs(u) {
  if (!u) return null;
  u = u.trim().replace(/^url\(/i, "").replace(/\)$/, "").replace(/['"]/g, "");
  if (!u || u.startsWith("data:")) return null;
  if (u.startsWith("//")) return "https:" + u;
  if (u.startsWith("http")) return u;
  if (u.startsWith("/")) return BASE + u;
  return BASE + "/" + u;
}

const report = {
  pages: {},
  externalImages: [],
  externalFonts: [],
  brokenImages: [],
  brokenFonts: [],
  brokenCss: [],
  googleFonts: [],
};

for (const p of paths) {
  const html = await (await fetch(BASE + p)).text();
  const cssHrefs = [...html.matchAll(/href="([^"]+\.css[^"]*)"/gi)].map((m) => m[1]);
  const imgSrcs = [
    ...html.matchAll(/\b(?:src|data-src|data-lazy-src|data-bg)=["']([^"']+)["']/gi),
  ].map((m) => m[1]);
  const srcsets = [...html.matchAll(/srcset=["']([^"']+)["']/gi)].flatMap((m) =>
    m[1].split(",").map((x) => x.trim().split(/\s+/)[0]),
  );
  const bgUrls = [...html.matchAll(/url\(([^)]+)\)/gi)].map((m) => m[1]);

  const images = new Set(
    [...imgSrcs, ...srcsets, ...bgUrls]
      .map((u) => abs(u))
      .filter(Boolean)
      .filter((u) => /\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(u) || u.includes("/uploads/")),
  );

  for (const href of cssHrefs) {
    if (/fonts\.googleapis|fonts\.gstatic/.test(href)) {
      report.googleFonts.push(href);
      continue;
    }
    const url = abs(href);
    if (!url) continue;
    if (!url.includes("127.0.0.1") && !url.includes("raadrecruitment")) {
      // skip other cdns for now unless font-related
    }
    const r = await fetchBuf(url);
    if (r.status !== 200 || isHtmlBuf(r.buf)) {
      report.brokenCss.push({ page: p, url, status: r.status });
      continue;
    }
    // extract font-face and url() from css
    const css = r.buf.toString("utf8");
    for (const m of css.matchAll(/url\(([^)]+)\)/gi)) {
      let u = m[1].replace(/['"]/g, "").trim();
      if (!u || u.startsWith("data:")) continue;
      // resolve relative to css path
      let resolved;
      if (u.startsWith("http") || u.startsWith("//")) resolved = abs(u);
      else if (u.startsWith("/")) resolved = BASE + u.split("?")[0];
      else {
        const cssPath = new URL(url).pathname;
        const dir = cssPath.replace(/\/[^/]*$/, "/");
        resolved = BASE + path.posix.normalize(dir + u.split("?")[0]);
      }
      if (/\.(woff2?|ttf|otf|eot)(\?|$)/i.test(resolved)) {
        if (/fonts\.gstatic|fonts\.googleapis|typekit|use\.typekit/.test(resolved)) {
          report.externalFonts.push({ page: p, from: url, font: resolved });
        } else {
          const fr = await fetchBuf(resolved);
          const pathname = new URL(resolved).pathname;
          if (
            fr.status !== 200 ||
            isHtmlBuf(fr.buf) ||
            !isFontBuf(fr.buf, pathname)
          ) {
            report.brokenFonts.push({
              page: p,
              font: pathname,
              status: fr.status,
              html: isHtmlBuf(fr.buf),
            });
          }
        }
      }
      if (/\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(resolved)) {
        images.add(resolved);
      }
    }
  }

  for (const img of images) {
    if (/gravatar|facebook|googleusercontent/.test(img)) continue;
    if (/^https?:\/\//i.test(img) && !img.includes("127.0.0.1")) {
      // should be local-relative when served; absolute self-origin is also ok if rewritten
      if (!img.includes("raadrecruitment.ae") && !img.includes("127.0.0.1")) {
        report.externalImages.push({ page: p, img });
        continue;
      }
    }
    const pathname = new URL(img, BASE).pathname;
    const r = await fetchBuf(BASE + pathname);
    if (r.status !== 200 || isHtmlBuf(r.buf) || !isImageBuf(r.buf)) {
      report.brokenImages.push({
        page: p,
        path: pathname,
        status: r.status,
        html: isHtmlBuf(r.buf),
      });
    }
  }

  report.pages[p] = {
    css: cssHrefs.length,
    images: images.size,
  };
}

fs.writeFileSync(
  "scripts/_asset-audit-report.json",
  JSON.stringify(report, null, 2),
);
console.log(
  JSON.stringify(
    {
      pages: report.pages,
      googleFonts: report.googleFonts.length,
      externalFonts: report.externalFonts.length,
      externalImages: report.externalImages.length,
      brokenCss: report.brokenCss.length,
      brokenFonts: report.brokenFonts.length,
      brokenImages: report.brokenImages.length,
      sampleBrokenImages: report.brokenImages.slice(0, 20),
      sampleBrokenFonts: report.brokenFonts.slice(0, 20),
      sampleExternalFonts: report.externalFonts.slice(0, 10),
      sampleGoogle: report.googleFonts.slice(0, 5),
    },
    null,
    2,
  ),
);
