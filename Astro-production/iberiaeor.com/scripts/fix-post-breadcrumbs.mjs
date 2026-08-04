/**
 * Inject Rank Math-style breadcrumbs into single-post Elementor bodies.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "src", "data");

function stripHtml(s) {
  return String(s || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#8211;/g, "–")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function crumb(title) {
  const safe = stripHtml(title).replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<div class="elementor-element elementor-widget elementor-widget-breadcrumbs sp-post-breadcrumb"><div class="elementor-widget-container"><nav class="rank-math-breadcrumb" aria-label="Breadcrumb"><p><a href="/">Home</a><span class="separator"> » </span><a href="/insights/">Insights</a><span class="separator"> » </span><span class="last">${safe}</span></p></nav></div></div>`;
}

const posts = JSON.parse(fs.readFileSync(path.join(DATA, "posts.json"), "utf8"));
const bodies = JSON.parse(fs.readFileSync(path.join(DATA, "bodies.json"), "utf8"));
let n = 0;
for (const post of posts) {
  let html = post.bodyHtml || "";
  if (!html || !/data-elementor-type="single-post"/.test(html)) continue;
  if (/rank-math-breadcrumb/.test(html) && /Insights<\/a>/.test(html)) continue;
  const block = crumb(post.title);
  if (/rank-math-breadcrumb/.test(html)) {
    html = html.replace(
      /(<nav\b[^>]*\brank-math-breadcrumb\b[^>]*>)([\s\S]*?)(<\/nav>)/gi,
      `$1<p><a href="/">Home</a><span class="separator"> » </span><a href="/insights/">Insights</a><span class="separator"> » </span><span class="last">${stripHtml(post.title)}</span></p>$3`,
    );
  } else {
    html = html.replace(
      /(<div[^>]*data-elementor-type="single-post"[^>]*>)/i,
      `$1\n${block}`,
    );
  }
  post.bodyHtml = html;
  post.content = html;
  bodies[post.path] = html;
  n += 1;
}
fs.writeFileSync(path.join(DATA, "posts.json"), JSON.stringify(posts, null, 2));
fs.writeFileSync(path.join(DATA, "bodies.json"), JSON.stringify(bodies, null, 2));
console.log("post breadcrumbs updated", n);
