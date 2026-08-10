/**
 * Homepage section fixes:
 * 1. Wire Smart Slider n2-ss-2 init
 * 2. Replace broken Vector.png icons with transparent SVGs
 * 3. CSS contrast overrides live in migration-overrides.css
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const UPLOAD = join(ROOT, "public/wp-content/uploads/2023/05");

const ICONS = [
  {
    file: "icon-govt-authorized.svg",
    title: "We are Govt Authorized",
    // shield with star
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0557CF"/><stop offset="1" stop-color="#00C5F9"/></linearGradient></defs><path fill="url(#g)" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 3.18l6 2.67v4.6c0 3.83-2.66 7.57-6 8.89-3.34-1.32-6-5.06-6-8.89v-4.6l6-2.67z"/><path fill="url(#g)" d="M12 7.5l1.09 2.21 2.44.36-1.76 1.72.42 2.43L12 13.1l-2.19 1.12.42-2.43-1.76-1.72 2.44-.36L12 7.5z"/></svg>`,
  },
  {
    file: "icon-trained-manpower.svg",
    title: "Trained Manpower Supply",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0557CF"/><stop offset="1" stop-color="#00C5F9"/></linearGradient></defs><path fill="url(#g)" d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>`,
  },
  {
    file: "icon-time-cost.svg",
    title: "Time and Cost Savings",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0557CF"/><stop offset="1" stop-color="#00C5F9"/></linearGradient></defs><path fill="url(#g)" d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg>`,
  },
  {
    file: "icon-flexible-contracts.svg",
    title: "Flexible Contracts",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0557CF"/><stop offset="1" stop-color="#00C5F9"/></linearGradient></defs><path fill="url(#g)" d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11zM8 12h8v2H8v-2zm0 4h5v2H8v-2z"/></svg>`,
  },
  {
    file: "icon-no-hidden-cost.svg",
    title: "No Hidden Cost",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0557CF"/><stop offset="1" stop-color="#00C5F9"/></linearGradient></defs><path fill="url(#g)" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>`,
  },
];

mkdirSync(UPLOAD, { recursive: true });
for (const icon of ICONS) {
  writeFileSync(join(UPLOAD, icon.file), icon.svg);
  console.log("wrote", icon.file);
}

const pagesPath = join(ROOT, "src/data/pages.json");
const pages = JSON.parse(readFileSync(pagesPath, "utf8"));
const home = pages.find((p) => p.path === "/");
if (!home) throw new Error("home page not found");

function replaceIcons(html) {
  let out = html;
  for (const icon of ICONS) {
    // Replace Vector.png that appears in the iconbox whose title follows shortly after
    // Pattern: img ... Vector.png ... then eventually the title
    const escaped = icon.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(
      `(<div class="w-iconbox-icon"[^>]*>\\s*<img[^>]*src=")[^"]*Vector\\.png("[^>]*>\\s*</div>\\s*<div class="w-iconbox-meta">\\s*<h4 class="w-iconbox-title">${escaped}</h4>)`,
      "i",
    );
    const next = out.replace(re, `$1/wp-content/uploads/2023/05/${icon.file}$2`);
    if (next === out) {
      // Fallback: sequential Vector.png replacement by title proximity
      const titleIdx = out.indexOf(`<h4 class="w-iconbox-title">${icon.title}</h4>`);
      if (titleIdx < 0) {
        console.warn("title not found", icon.title);
        continue;
      }
      const before = out.lastIndexOf("Vector.png", titleIdx);
      if (before < 0 || titleIdx - before > 500) {
        console.warn("Vector.png not near title", icon.title);
        continue;
      }
      out =
        out.slice(0, before) +
        icon.file.replace(/^/, "") + // keep path prefix
        out.slice(before).replace("Vector.png", icon.file);
      // Fix: above is wrong - need full path replace
    } else {
      out = next;
      console.log("replaced via regex", icon.title);
    }
  }
  return out;
}

function replaceIconsV2(html) {
  let out = html;
  for (const icon of ICONS) {
    const titleMarker = `<h4 class="w-iconbox-title">${icon.title}</h4>`;
    const titleIdx = out.indexOf(titleMarker);
    if (titleIdx < 0) {
      console.warn("missing title", icon.title);
      continue;
    }
    const windowStart = Math.max(0, titleIdx - 600);
    const chunk = out.slice(windowStart, titleIdx);
    const vecIdx = chunk.lastIndexOf("Vector.png");
    if (vecIdx < 0) {
      // already replaced?
      if (chunk.includes(icon.file)) {
        console.log("already ok", icon.title);
        continue;
      }
      console.warn("no Vector.png before", icon.title);
      continue;
    }
    const abs = windowStart + vecIdx;
    out = out.slice(0, abs) + icon.file + out.slice(abs + "Vector.png".length);
    console.log("replaced", icon.title, "->", icon.file);
  }
  return out;
}

home.bodyHtml = replaceIconsV2(home.bodyHtml);
home.content = replaceIconsV2(home.content);
writeFileSync(pagesPath, JSON.stringify(pages, null, 2) + "\n");
console.log("pages.json updated");
