import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const postsPath = path.join(root, "src/data/posts.json");
const posts = JSON.parse(fs.readFileSync(postsPath, "utf8"));

const headPosts = JSON.parse(
  execSync("git show HEAD:Astro-production/ngmanpower.com/src/data/posts.json", {
    encoding: "utf8",
    maxBuffer: 200 * 1024 * 1024,
    cwd: path.join(root, "../.."),
  }),
);

const idx = posts.findIndex((p) => p.slug === "types-of-contract-uae");
const head = headPosts.find((p) => p.slug === "types-of-contract-uae");
if (idx < 0 || !head) {
  console.error("post missing");
  process.exit(1);
}

const KATE = {
  id: 16,
  slug: "kate-williams",
  name: "Kate Williams",
  avatar: "/wp-content/uploads/2024/05/cropped-image-24-1-128x128.png",
  avatar2x: "/wp-content/uploads/2024/05/cropped-image-24-1-256x256.png",
  info: "Kate is the Global Strategy Director at Connect Group. She is specialized in company formation, international business expansion and employee relocation. She studied in Southampton (United Kingdom) and moved to the UAE in 2014.",
};

function rewriteAuthorOnly(html) {
  if (!html) return html;

  // Restore from HEAD first conceptually by operating on HEAD html.
  // Replace only the post_author element, stop before w-sharing / next sibling.
  const start = html.indexOf('<div class="w-post-elm post_author');
  if (start < 0) throw new Error("author start not found");

  const sharing = html.indexOf('<div class="w-sharing', start);
  if (sharing < 0) throw new Error("sharing block not found after author");

  const kateBlock = `<div class="w-post-elm post_author us_custom_3ae408c5 post_authorp vcard author color_link_inherit with_ava avapos_left"><a href="/author/${KATE.slug}/" class="fn" aria-hidden="true" tabindex="-1"><div class="post-author-ava" style="font-size:96px;"><img alt="${KATE.name}" src="${KATE.avatar}" srcset="${KATE.avatar2x} 2x" class="avatar avatar-96 photo" height="96" width="96" loading="lazy" decoding="async"></div></a><div class="post-author-meta"><a href="/author/${KATE.slug}/" class="post-author-name fn">${KATE.name}</a><div class="post-author-info">${KATE.info}</div></div></div>`;

  return html.slice(0, start) + kateBlock + html.slice(sharing);
}

const restored = {
  ...posts[idx],
  content: rewriteAuthorOnly(head.content),
  bodyHtml: rewriteAuthorOnly(head.bodyHtml),
  author: KATE.id,
  authorSlug: KATE.slug,
  authorName: KATE.name,
};

// Keep any title fix we made earlier if HEAD still has short/wrong title.
if (String(posts[idx].title || "").length > String(head.title || "").length) {
  restored.title = posts[idx].title;
}

posts[idx] = restored;
fs.writeFileSync(postsPath, `${JSON.stringify(posts, null, 2)}\n`);

const check = restored.bodyHtml;
console.log({
  sharing: check.includes("w-sharing"),
  kate: check.includes("/author/kate-williams/"),
  faieez: check.includes("muhammad-faieez"),
  sticky: check.includes("type_sticky"),
  authorThenShare: /post_author[\s\S]{0,80}Kate Williams[\s\S]{0,400}<div class="w-sharing/.test(
    check,
  ),
});
