#!/usr/bin/env node
/** Final gate: page assets must be local + binary-valid (ignore legacy .eot). */
const BASE = "http://127.0.0.1:5113";
const pages = ["/", "/emiratisation/", "/contact-us/", "/blog/", "/recruitment/", "/mazaya/"];

function isHtml(b) {
  const h = b.slice(0, 80).toString("utf8").toLowerCase();
  return h.includes("<!doctype") || h.includes("<html");
}
function isImage(b) {
  if (!b || b.length < 12) return false;
  if (b[0] === 0xff && b[1] === 0xd8) return true;
  if (b[0] === 0x89 && b[1] === 0x50) return true;
  if (b.slice(0, 4).toString() === "RIFF" && b.slice(8, 12).toString() === "WEBP")
    return true;
  if (b.slice(0, 3).toString() === "GIF") return true;
  if (b.toString("utf8", 0, 120).includes("<svg")) return true;
  return false;
}
function isFont(b, p) {
  if (!b || b.length < 4) return false;
  if (/\.eot$/i.test(p)) return b.length > 500 && !isHtml(b); // legacy IE
  const a = b.slice(0, 4).toString("ascii");
  return a === "wOF2" || a === "wOFF" || a === "OTTO" || a === "true" || (b[0] === 0 && b[1] === 1);
}

const summary = { pages: {}, brokenImages: [], brokenFonts: [], external: [] };

for (const page of pages) {
  const html = await (await fetch(BASE + page)).text();
  if (html.includes("fonts.googleapis") || html.includes("fonts.gstatic")) {
    summary.external.push({ page, type: "google-fonts-cdn" });
  }
  const imgs = new Set();
  for (const m of html.matchAll(/\b(?:src|data-src)=["']([^"']+)["']/gi)) imgs.add(m[1]);
  for (const m of html.matchAll(/srcset=["']([^"']+)["']/gi)) {
    for (const part of m[1].split(",")) imgs.add(part.trim().split(/\s+/)[0]);
  }
  const css = [...html.matchAll(/href="([^"]+\.css[^"]*)"/gi)].map((m) => m[1].split("?")[0]);
  const fonts = new Set();
  for (const href of css) {
    if (!href.startsWith("/")) continue;
    const cssText = await (await fetch(BASE + href)).text();
    for (const m of cssText.matchAll(/url\(([^)]+)\)/gi)) {
      let u = m[1].replace(/['"]/g, "").split("?")[0];
      if (!u || u.startsWith("data:")) continue;
      if (u.startsWith("http") || u.startsWith("//")) {
        if (/fonts\.googleapis|fonts\.gstatic/.test(u)) {
          summary.external.push({ page, type: "font-cdn", u });
          continue;
        }
        if (/raadrecruitment\.ae/.test(u)) u = new URL(u.startsWith("//") ? "https:" + u : u).pathname;
        else continue;
      } else if (!u.startsWith("/")) {
        const dir = href.replace(/\/[^/]*$/, "/");
        u = new URL(u, "http://x" + dir).pathname;
      }
      if (/\.(woff2?|ttf|otf|eot)$/i.test(u)) fonts.add(u);
      if (/\.(png|jpe?g|webp|gif|svg)$/i.test(u)) imgs.add(u);
    }
  }

  let imgOk = 0;
  for (const src of imgs) {
    if (!src || src.startsWith("data:")) continue;
    if (src.startsWith("http") && !src.includes("127.0.0.1") && !src.includes("raadrecruitment")) {
      summary.external.push({ page, type: "image", src });
      continue;
    }
    const path = src.startsWith("http") ? new URL(src).pathname : src.split("?")[0];
    if (!path.startsWith("/")) continue;
    const res = await fetch(BASE + path);
    const buf = Buffer.from(await res.arrayBuffer());
    if (res.status !== 200 || isHtml(buf) || !isImage(buf)) {
      summary.brokenImages.push({ page, path, status: res.status });
    } else imgOk++;
  }

  let fontOk = 0;
  for (const f of fonts) {
    // Prefer modern formats — skip .eot in pass criteria if woff2 sibling exists
    if (/\.eot$/i.test(f)) {
      const woff2 = f.replace(/\.eot$/i, ".woff2");
      if (fonts.has(woff2)) continue;
    }
    const res = await fetch(BASE + f);
    const buf = Buffer.from(await res.arrayBuffer());
    if (res.status !== 200 || isHtml(buf) || !isFont(buf, f)) {
      summary.brokenFonts.push({ page, font: f, status: res.status });
    } else fontOk++;
  }
  summary.pages[page] = { imgOk, fontOk, css: css.length };
}

console.log(JSON.stringify(summary, null, 2));
const pass =
  summary.brokenImages.length === 0 &&
  summary.brokenFonts.length === 0 &&
  summary.external.length === 0;
console.log(pass ? "PASS" : "FAIL");
