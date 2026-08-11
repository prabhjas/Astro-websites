import fs from "fs";

const pages = JSON.parse(fs.readFileSync("src/data/pages.json", "utf8"));
const blog = pages.find((p) => p.path === "/blog/" || p.path === "/blog");
const html = blog?.bodyHtml || blog?.content || "";
const hrefs = [...html.matchAll(/href=["'](\/[^"']+\/)["']/g)].map((m) => m[1]);
const postPaths = [...new Set(hrefs)].filter(
  (p) =>
    p !== "/blog/" &&
    !p.startsWith("/category/") &&
    !p.startsWith("/author/") &&
    !p.startsWith("/tag/") &&
    p.split("/").filter(Boolean).length === 1,
);
console.log("initial paths", postPaths.length);
console.log(postPaths.slice(0, 20));

const exclude = postPaths.join(",");
const url =
  "http://127.0.0.1:5113/api/blog/load-more/?perPage=6&excludePaths=" + encodeURIComponent(exclude);
const res = await fetch(url);
const data = await res.json();
console.log("paths", data.paths);
console.log("ids", data.ids);

function isReal(buf) {
  const head = buf.slice(0, 64).toString("utf8").toLowerCase();
  if (head.includes("<!doctype") || head.includes("<html")) return false;
  if (buf[0] === 0xff && buf[1] === 0xd8) return true;
  if (buf.slice(0, 8).toString("hex") === "89504e470d0a1a0a") return true;
  if (buf.slice(0, 4).toString() === "RIFF" && buf.slice(8, 12).toString() === "WEBP") return true;
  if (head.trimStart().startsWith("<svg")) return true;
  return false;
}

const thumbs = [...(data.html || "").matchAll(/class="[^"]*size-full[^"]*"[^>]*src="([^"]+)"|src="([^"]+)"[^>]*class="[^"]*size-full/g)]
  .map((m) => m[1] || m[2])
  .filter(Boolean);
// simpler: all /wp-content or /images thumbs
const srcs = [...(data.html || "").matchAll(/src="(\/(?:wp-content|images)[^"]+)"/g)].map((m) => m[1]);
console.log("thumbs", srcs);
for (const src of srcs) {
  const r = await fetch("http://127.0.0.1:5113" + src);
  const buf = Buffer.from(await r.arrayBuffer());
  console.log(r.status, isReal(buf) ? "OK" : "BAD", buf.length, src);
}
