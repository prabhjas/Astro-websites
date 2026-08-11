/**
 * Verify Load More API returns images that exist and are real binaries.
 */
import fs from "node:fs";
import path from "node:path";

function isRealImage(buf) {
  if (!buf || buf.length < 32) return false;
  const head = buf.slice(0, 64).toString("utf8").toLowerCase();
  if (head.includes("<!doctype") || head.includes("<html")) return false;
  if (buf[0] === 0xff && buf[1] === 0xd8) return true;
  if (buf.slice(0, 8).toString("hex") === "89504e470d0a1a0a") return true;
  if (buf.slice(0, 4).toString() === "RIFF" && buf.slice(8, 12).toString() === "WEBP") return true;
  if (head.trimStart().startsWith("<svg")) return true;
  return false;
}

const base = "http://127.0.0.1:5113";
// Initial blog listing paths to exclude (approximate — use empty to get newest first)
const url =
  base +
  "/api/blog/load-more/?perPage=6&excludePaths=" +
  encodeURIComponent(
    [
      "/emiratisation-fines-in-the-uae/",
      "/resignation-letter-sample-uae/",
      "/common-recruitment-mistakes/",
      "/average-salary-in-uae/",
      "/benefits-of-medical-recruitment-agencies-in-dubai/",
      "/emiratisation-in-tourism-and-hospitality/",
    ].join(","),
  );

const res = await fetch(url);
const data = await res.json();
const html = data.html || data.cardsHtml || JSON.stringify(data);
console.log("api status", res.status, "keys", Object.keys(data));
const srcs = [...html.matchAll(/src="([^"]+)"/g)].map((m) => m[1]);
console.log("img count", srcs.length);
for (const src of srcs) {
  const publicPath = path.join("public", src.replace(/^\//, ""));
  const distPath = path.join("dist/client", src.replace(/^\//, ""));
  const file = fs.existsSync(publicPath)
    ? publicPath
    : fs.existsSync(distPath)
      ? distPath
      : null;
  if (!file) {
    console.log("MISSING", src);
    continue;
  }
  const buf = fs.readFileSync(file);
  const ok = isRealImage(buf);
  console.log(ok ? "OK" : "BAD", src, buf.length, file.includes("dist") ? "dist" : "public");
}

// Also hard-check fazaa / employee benefits cards specifically
const url2 =
  base +
  "/api/blog/load-more/?perPage=6&excludePaths=" +
  encodeURIComponent(
    // exclude nothing from first page of CMS order — rely on publishedDate order
    "",
  );
// Direct path probe via posts+render isn't exposed; grep HTML for titles
for (const title of ["Fazaa Card", "Employee Benefits"]) {
  console.log(title, "in html?", html.includes(title));
}
