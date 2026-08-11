#!/usr/bin/env node
const paths = [
  "/fazaa-card-uae/",
  "/employee-benefits-in-uae/",
  "/emergency-leave-in-uae/",
  "/common-recruitment-challenges/",
  "/types-of-outsourcing/",
];

function isHtml(buf) {
  const h = buf.slice(0, 100).toString("utf8").toLowerCase();
  return h.includes("<!doctype") || h.includes("<html");
}

async function probe(url) {
  try {
    const r = await fetch(url, { headers: { accept: "image/*,*/*" } });
    const b = Buffer.from(await r.arrayBuffer());
    const ok =
      !isHtml(b) &&
      ((b[0] === 0xff && b[1] === 0xd8) ||
        b.slice(0, 4).toString() === "RIFF" ||
        b.slice(0, 8).toString("hex") === "89504e470d0a1a0a");
    return { url, status: r.status, bytes: b.length, ok };
  } catch (e) {
    return { url, ok: false, err: e.message };
  }
}

for (const p of paths) {
  const html = await (await fetch("https://raadrecruitment.ae" + p)).text();
  const urls = [
    ...new Set(
      [...html.matchAll(/https?:\/\/raadrecruitment\.ae(\/wp-content\/uploads\/[^"'\\\s>]+)/gi)].map(
        (m) => m[1].replace(/&amp;/g, "&"),
      ),
    ),
  ].filter((u) => !/logo|favicon|icon|whatsapp|avatar|96x96|150x150|emoji|svg|button/i.test(u));

  console.log("\n===", p, "candidates", urls.length);
  const goods = [];
  for (const u of urls.slice(0, 25)) {
    const res = await probe("https://raadrecruitment.ae" + u);
    if (res.ok) {
      goods.push(res);
      console.log("OK", res.bytes, u);
    }
  }
  if (!goods.length) console.log("NO GOOD IMAGES");
}
