#!/usr/bin/env node
import fs from "node:fs";

const local = await (await fetch("http://127.0.0.1:5113/")).text();
const live = await (await fetch("https://raadrecruitment.ae/")).text();

function extract(html, label) {
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  const ssRelated = [];
  for (const m of scripts) {
    const attrs = m[1] || "";
    const body = (m[2] || "").trim();
    const src = (attrs.match(/\bsrc=["']([^"']+)/i) || [])[1] || "";
    if (
      /n2|smart.?slider|n2ss|_N2/i.test(attrs + body + src) ||
      /n2-ss-/i.test(body)
    ) {
      ssRelated.push({
        src,
        inlineLen: body.length,
        preview: (body || src).slice(0, 200).replace(/\s+/g, " "),
      });
    }
  }
  const hasNextend = html.includes("N2Classes") || html.includes("window.n2const");
  const oilLazy = (html.match(/Oil-and-gas[^>]{0,200}/) || [""])[0];
  const ssReady = {
    ssLoaded: html.includes("n2-ss-loaded"),
    notransition: (html.match(/n2notransition/g) || []).length,
    n2const: html.includes("n2const"),
    ss2: /n2-ss-2/.test(html),
    ssEmbed: /_N2\.r\(|n2\.ready|n2ss\.|new N2Classes/i.test(html),
  };
  console.log("\n====", label);
  console.log("ss scripts", ssRelated.length);
  ssRelated.slice(0, 15).forEach((s, i) =>
    console.log(i, s.src || "(inline)", s.inlineLen, s.preview.slice(0, 160)),
  );
  console.log("flags", ssReady);
  console.log("oil snippet", oilLazy.slice(0, 220));
  return { ssRelated, ssReady };
}

const a = extract(local, "local");
const b = extract(live, "live");

// Find inline init on live missing from local
const liveInlines = b.ssRelated.filter((s) => !s.src && s.inlineLen > 20);
const localInlines = a.ssRelated.filter((s) => !s.src && s.inlineLen > 20);
console.log("\nlive inline count", liveInlines.length, "local", localInlines.length);
for (const li of liveInlines.slice(0, 8)) {
  const key = li.preview.slice(0, 80);
  const found = localInlines.some((x) => x.preview.includes(key.slice(0, 40)));
  console.log(found ? "HAS" : "MISSING", key);
}
