/**
 * Extract full Elementor single-post HTML (template 652) for every post.
 */
import fs from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";

const ORIGIN = "";
const posts = JSON.parse(fs.readFileSync("src/data/posts.json", "utf8"));

function stripDomain(html) {
  return html
    .replaceAll("", "")
    .replaceAll("", "")
    .replaceAll("//spheavyrental.ae", "");
}

async function download(url) {
  const clean = url.split("?")[0];
  const abs = clean.startsWith("http") ? clean : ORIGIN + clean;
  if (!abs.includes("spheavyrental.ae")) return null;
  const rel = new URL(abs).pathname;
  const dest = path.join("public", rel.replace(/^\//, ""));
  if (fs.existsSync(dest) && fs.statSync(dest).size > 50) return rel;
  try {
    const res = await fetch(abs);
    if (!res.ok) return null;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
    return rel;
  } catch {
    return null;
  }
}

const commonCss = [
  "/wp-content/uploads/elementor/css/post-652.css",
  "/wp-content/plugins/elementor-pro/assets/css/widget-post-info.min.css",
  "/wp-content/plugins/elementor-pro/assets/css/widget-share-buttons.min.css",
  "/wp-content/plugins/elementor-pro/assets/css/widget-author-box.min.css",
  "/wp-content/plugins/elementor-pro/assets/css/widget-posts.min.css",
  "/wp-content/plugins/elementor/assets/css/widget-heading.min.css",
  "/wp-content/plugins/elementor/assets/css/widget-text-editor.min.css",
  "/wp-content/plugins/elementor/assets/css/widget-image.min.css",
  "/wp-content/plugins/elementor/assets/css/widget-button.min.css",
];

for (const href of commonCss) await download(ORIGIN + href);

for (const post of posts) {
  process.stdout.write(`post ${post.path} `);
  try {
    const html = await (
      await fetch(`${ORIGIN}${post.path}?nowprocket=1`, {
        headers: { "User-Agent": "Mozilla/5.0" },
      })
    ).text();
    const $ = cheerio.load(html);
    const el = $(".elementor-652, [data-elementor-id='652']").first();
    if (!el.length) {
      console.log("NO TEMPLATE");
      continue;
    }
    // Remove admin/bar leftovers
    el.find("#wpadminbar").remove();
    post.bodyHtml = stripDomain(el.toString());
    post.elementorCss = "/wp-content/uploads/elementor/css/post-652.css";
    post.pageCss = [...commonCss];
    console.log("ok", post.bodyHtml.length);
  } catch (e) {
    console.log("ERR", e.message);
  }
}

fs.writeFileSync("src/data/posts.json", JSON.stringify(posts, null, 2));
console.log("done", posts.filter((p) => p.bodyHtml && p.bodyHtml.includes("elementor-652")).length);
