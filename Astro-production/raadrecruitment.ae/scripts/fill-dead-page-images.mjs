#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ORIGIN = "https://raadrecruitment.ae";
const fails = JSON.parse(fs.readFileSync("scripts/_page-asset-fails.json", "utf8"));

function isImg(b) {
  return (
    (b[0] === 0xff && b[1] === 0xd8) ||
    (b[0] === 0x89 && b[1] === 0x50) ||
    (b.slice(0, 4).toString() === "RIFF" && b.slice(8, 12).toString() === "WEBP")
  );
}

async function probe(rel) {
  const r = await fetch(ORIGIN + rel, {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "image/*" },
  });
  const b = Buffer.from(await r.arrayBuffer());
  return isImg(b) ? b : null;
}

const altsFor = (rel) => {
  const base = rel.replace(/\.[a-z0-9]+$/i, "");
  const name = path.posix.basename(base);
  const list = [
    rel.replace(/\.webp$/i, ".png"),
    rel.replace(/\.webp$/i, ".jpg"),
    rel.replace(/\.webp$/i, ".jpeg"),
    rel.replace(/-scaled\.webp$/i, ".jpg"),
    // known older copies
    `/wp-content/uploads/2023/08/${name}.png`,
    `/wp-content/uploads/2023/08/${name}.jpg`,
    `/wp-content/uploads/2023/07/${name}.png`,
    `/wp-content/uploads/2023/07/${name}.jpg`,
  ];
  // specific maps
  if (/emiratisation-deadline/i.test(rel)) {
    list.unshift(
      "/wp-content/uploads/2023/08/Emiratisation-Deadline-Looms-Private-RAAD.png",
    );
  }
  if (/Experience-Operational/i.test(rel)) {
    list.unshift(
      "/wp-content/uploads/2023/08/Experience-Operational-Excellence-with-Proven-Staff-Outsourcing-Strategies-with-RAAD.png",
    );
  }
  if (/recruitment-agency-in-dubai|recruitment-services/i.test(rel)) {
    list.unshift("/wp-content/uploads/2023/07/person-for-raad.png");
  }
  if (/mazaya|adnoc/i.test(rel)) {
    list.unshift("/wp-content/uploads/2023/07/person-for-raad.png");
  }
  if (/Staff-Outsourcing|Tailored-Staff/i.test(rel)) {
    list.unshift("/wp-content/uploads/2023/07/Staff-Outsourcingv2.jpg");
  }
  return [...new Set(list)];
};

const contentFiles = [
  "src/data/pages.json",
  "src/data/posts.json",
];
let pages = fs.readFileSync("src/data/pages.json", "utf8");
let posts = fs.readFileSync("src/data/posts.json", "utf8");

for (const rel of fails) {
  if (rel.endsWith(".svg")) {
    // minimal svg placeholder for eicons.svg
    const dest = "public" + rel;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(
      dest,
      `<svg xmlns="http://www.w3.org/2000/svg"></svg>\n`,
    );
    console.log("svg placeholder", rel);
    continue;
  }
  let found = null;
  let foundRel = null;
  for (const alt of altsFor(rel)) {
    const b = await probe(alt);
    if (b) {
      found = b;
      foundRel = alt;
      break;
    }
  }
  if (!found) {
    // last resort: use person-for-raad
    found = await probe("/wp-content/uploads/2023/07/person-for-raad.png");
    foundRel = "/wp-content/uploads/2023/07/person-for-raad.png";
  }
  if (!found) {
    console.log("NOALT", rel);
    continue;
  }
  const dest = "public" + rel;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, found);
  // also keep a good canonical path
  if (foundRel && foundRel !== rel) {
    const dest2 = "public" + foundRel;
    if (!fs.existsSync(dest2)) {
      fs.mkdirSync(path.dirname(dest2), { recursive: true });
      fs.writeFileSync(dest2, found);
    }
    // rewrite markup to preferred working path when different format
    if (/\.(png|jpe?g)$/i.test(foundRel)) {
      pages = pages.split(rel).join(foundRel);
      posts = posts.split(rel).join(foundRel);
    }
  }
  console.log("filled", rel, "<-", foundRel, found.length);
}

fs.writeFileSync("src/data/pages.json", pages);
fs.writeFileSync("src/data/posts.json", posts);
console.log("done");
