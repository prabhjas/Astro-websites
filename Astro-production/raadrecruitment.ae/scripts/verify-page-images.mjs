#!/usr/bin/env node
/**
 * Verify local pages: every img/srcset/background upload returns HTTP 200 locally.
 * Also flag absolute live hosts and remaining svg placeholders.
 *
 *   node scripts/verify-page-images.mjs
 */
const LOCAL = "http://127.0.0.1:5102";
const paths = [
  "/",
  "/about-us/",
  "/contact-us/",
  "/insights/",
  "/industries/",
  "/construction/",
  "/manufacturing/",
  "/logistics/",
  "/food-industry/",
  "/oil-and-gas/",
  "/landscaping/",
  "/electromechanical/",
  "/factories/",
  "/warehouse/",
];

function collect(html) {
  const urls = new Set();
  for (const m of html.matchAll(/(?:src|href)=["']([^"']+)["']/gi)) {
    urls.add(m[1].split(/\s+/)[0]);
  }
  for (const m of html.matchAll(/srcset=["']([^"']+)["']/gi)) {
    for (const part of m[1].split(",")) urls.add(part.trim().split(/\s+/)[0]);
  }
  for (const m of html.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/gi)) {
    urls.add(m[1].trim());
  }
  return [...urls];
}

function toLocalPath(u) {
  let s = (u || "").trim();
  if (!s || s.startsWith("data:") || s.startsWith("#") || s.startsWith("mailto:")) return null;
  s = s.replace(/^https?:\/\/(?:www\.)?ngmanpower\.com/i, "");
  s = s.replace(/^https?:\/\/127\.0\.0\.1:\d+/i, "");
  if (!s.startsWith("/wp-content/")) return null;
  if (!/\.(png|jpe?g|webp|gif|svg|ico)(\?|$)/i.test(s) && !s.includes("/uploads/")) return null;
  if (/\.(css|js)(\?|$)/i.test(s)) return null;
  return s.split("?")[0].split("#")[0];
}

const summary = [];
const globalMissing = new Set();
const liveAbs = new Set();

for (const path of paths) {
  const res = await fetch(LOCAL + path);
  const html = await res.text();
  const imgs = collect(html);
  const media = [...new Set(imgs.map(toLocalPath).filter(Boolean))];
  const svgPlaceholders = imgs.filter((u) => /^data:image\/svg/i.test(u)).length;
  for (const u of imgs) {
    if (/ngmanpower\.com\/wp-content/i.test(u)) liveAbs.add(u.split("?")[0]);
  }

  let ok = 0;
  let bad = 0;
  const badSamples = [];
  for (const p of media) {
    const r = await fetch(LOCAL + p);
    if (r.status === 200) ok++;
    else {
      bad++;
      globalMissing.add(p);
      if (badSamples.length < 8) badSamples.push({ p, status: r.status });
    }
  }

  summary.push({
    path,
    status: res.status,
    media: media.length,
    ok,
    bad,
    svgPlaceholders,
    pageDesignCss: /\/css\/page-design\//.test(html),
    badSamples,
  });
  console.log(
    path,
    `media=${media.length} ok=${ok} bad=${bad} svg=${svgPlaceholders} designCss=${/\/css\/page-design\//.test(html)}`,
  );
}

console.log(
  JSON.stringify(
    {
      summary,
      liveAbsCount: liveAbs.size,
      liveAbsSamples: [...liveAbs].slice(0, 10),
      globalMissing: [...globalMissing].slice(0, 40),
    },
    null,
    2,
  ),
);
