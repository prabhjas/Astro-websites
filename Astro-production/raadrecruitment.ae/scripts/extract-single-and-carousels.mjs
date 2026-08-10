/**
 * Extract Elementor single-post template (652) + post bodies from live.
 * Also refresh carousel-related CSS/assets refs on pages.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import * as cheerio from "cheerio";

const LIVE = "";
const OUT = "src/data";

function absolutize($, base = LIVE) {
  $("[src],[href],[data-src],[data-lazy-src]").each((_, el) => {
    for (const attr of ["src", "href", "data-src", "data-lazy-src"]) {
      const v = $(el).attr(attr);
      if (!v) continue;
      if (v.startsWith("http") || v.startsWith("data:") || v.startsWith("#") || v.startsWith("mailto:"))
        continue;
      try {
        $(el).attr(attr, new URL(v, base).pathname + new URL(v, base).search);
      } catch {}
    }
  });
  // style url()
  $("[style]").each((_, el) => {
    const style = $(el).attr("style") || "";
    $(el).attr(
      "style",
      style.replace(/url\((['"]?)(https?:\/\/spheavyrental\.ae)?(\/[^)'"]+)\1\)/gi, "url($1$3$1)"),
    );
  });
}

function collectCss($) {
  const hrefs = [];
  $('link[rel="stylesheet"]').each((_, el) => {
    let href = $(el).attr("href") || "";
    if (!href) return;
    href = href.replace(LIVE, "").split("?")[0];
    if (href.startsWith("/")) hrefs.push(href);
  });
  return [...new Set(hrefs)];
}

async function downloadAsset(rel) {
  if (!rel.startsWith("/wp-content/")) return;
  const dest = path.join("public", rel.replace(/^\//, ""));
  if (fs.existsSync(dest) && fs.statSync(dest).size > 50) return;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  try {
    const res = await fetch(LIVE + rel);
    if (!res.ok) return;
    fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
    console.log("asset", rel);
  } catch {}
}

const browser = await chromium.launch({ headless: true });

// 1) Capture single post shell from live
const postPage = await browser.newPage();
await postPage.goto(`${LIVE}/wheel-loaders-for-rent/?nowprocket=1`, {
  waitUntil: "networkidle",
  timeout: 90000,
});
await postPage.waitForTimeout(1500);
const postCapture = await postPage.evaluate(() => {
  const root = document.querySelector(".elementor-652, [data-elementor-id='652']");
  const content = document.querySelector(".elementor-widget-theme-post-content, .elementor-widget-theme-post-content .elementor-widget-container");
  const styles = [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.href);
  return {
    bodyClass: document.body.className,
    templateHtml: root?.outerHTML || "",
    hasPostContent: !!content,
    styles,
    mainHtml: document.querySelector("main, #content, .site-main")?.innerHTML?.slice(0, 500) || "",
  };
});
const postHtml = await postPage.content();
fs.writeFileSync("_crawl/live-post-wheel.html", postHtml);
fs.writeFileSync("_crawl/live-post-template-652.html", postCapture.templateHtml || "");
console.log("template652 len", postCapture.templateHtml.length, "bodyClass", postCapture.bodyClass);
console.log("styles sample", postCapture.styles.filter((s) => /652|post-|theme|swiper|testimonial/.test(s)).slice(0, 20));

// Parse full page for elementor-652
const $post = cheerio.load(postHtml);
absolutize($post);
const templateEl = $post(".elementor-652").first();
let templateHtml = templateEl.length ? $post.html(templateEl) : postCapture.templateHtml;
// Replace theme-post-content inner with placeholder
const $t = cheerio.load(templateHtml, { decodeEntities: false });
const contentWidget = $t(".elementor-widget-theme-post-content .elementor-widget-container").first();
if (contentWidget.length) {
  contentWidget.html("<!--POST_CONTENT-->");
} else {
  const alt = $t(".elementor-widget-theme-post-content").first();
  if (alt.length) alt.html('<div class="elementor-widget-container"><!--POST_CONTENT--></div>');
}
templateHtml = $t.root().children().toString() || $t.html();
fs.writeFileSync(`${OUT}/single-post-template.html`, templateHtml);
console.log("saved single-post-template.html", templateHtml.length);

const postCss = collectCss($post).filter(
  (h) =>
    /post-652|post-19|swiper|testimonial|theme-post|widget-|hello-elementor|elementor\/assets\/css/.test(h),
);
fs.writeFileSync(`${OUT}/single-post-css.json`, JSON.stringify(postCss, null, 2));
for (const h of postCss) await downloadAsset(h);
await downloadAsset("/wp-content/uploads/elementor/css/post-652.css");

// 2) Refresh about-us + heavy-machinery carousel HTML after JS (optional: keep SSR slides)
for (const pathUrl of ["/about-us/", "/heavy-machinery-rental/"]) {
  const page = await browser.newPage();
  await page.goto(`${LIVE}${pathUrl}?nowprocket=1`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(2500);
  const html = await page.content();
  const $ = cheerio.load(html);
  absolutize($);
  const body = $("[data-elementor-type=wp-page]").first();
  const bodyHtml = body.length ? $.html(body) : "";
  const pageCss = collectCss($);
  const id = body.attr("data-elementor-id");
  console.log(pathUrl, "body", bodyHtml.length, "id", id, "slides", (bodyHtml.match(/swiper-slide/g) || []).length);

  // update pages.json
  const pages = JSON.parse(fs.readFileSync(`${OUT}/pages.json`, "utf8"));
  const entry = pages.find((p) => p.path === pathUrl || p.path === pathUrl.replace(/\/$/, "") + "/");
  if (entry && bodyHtml) {
    entry.bodyHtml = bodyHtml;
    entry.pageCss = [...new Set([...(entry.pageCss || []), ...pageCss.filter((h) => /swiper|testimonial|e-swiper|post-/.test(h))])];
    console.log("updated", pathUrl, "pageCss", entry.pageCss.length);
  }
  fs.writeFileSync(`${OUT}/pages.json`, JSON.stringify(pages, null, 2));
  await page.close();
}

// 3) For each post, extract article content area from live if bodyHtml is plain content only
const posts = JSON.parse(fs.readFileSync(`${OUT}/posts.json`, "utf8"));
let updated = 0;
for (const post of posts) {
  // Ensure we have readable content; bodyHtml may already be post content
  if (!post.bodyHtml || post.bodyHtml.length < 40) {
    post.bodyHtml = post.content;
  }
  // pageCss for posts
  post.elementorCss = "/wp-content/uploads/elementor/css/post-652.css";
  post.pageCss = [
    "/wp-content/plugins/elementor/assets/lib/swiper/v8/css/swiper.min.css",
    "/wp-content/plugins/elementor/assets/css/conditionals/e-swiper.min.css",
    "/wp-content/uploads/elementor/css/post-652.css",
  ];
  updated++;
}
fs.writeFileSync(`${OUT}/posts.json`, JSON.stringify(posts, null, 2));
console.log("posts updated", updated);

await postPage.close();
await browser.close();
console.log("done");
