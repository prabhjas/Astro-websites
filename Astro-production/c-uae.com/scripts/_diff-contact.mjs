import fs from "node:fs";
import path from "node:path";

const ORIGIN = "https://c-uae.com";
const live = await (await fetch(`${ORIGIN}/contact-us/?nowprocket=1`, {
  headers: { "User-Agent": "CUAE-Astro/1.0" },
})).text();
const local = await (await fetch("http://127.0.0.1:5092/contact-us/")).text();

function pickImgs(html) {
  return [...html.matchAll(/src=["']([^"']+)["']/gi)]
    .map((m) => m[1].split("?")[0])
    .filter((u) => /wp-content\/uploads/i.test(u))
    .map((u) => {
      try {
        return new URL(u, ORIGIN).pathname;
      } catch {
        return u;
      }
    });
}

function pickBg(html) {
  return [...html.matchAll(/url\((['"]?)([^)'"]+)\1\)/gi)].map((m) => m[2].split("?")[0]);
}

const liveImgs = [...new Set(pickImgs(live))];
const localImgs = [...new Set(pickImgs(local))];
const missingLocalFiles = liveImgs.filter((p) => !fs.existsSync(path.join("public", p.replace(/^\//, ""))));

console.log({
  liveLen: live.length,
  localLen: local.length,
  liveHasReady: live.includes("Are you Ready"),
  liveImgCount: liveImgs.length,
  localImgCount: localImgs.length,
  liveOnly: liveImgs.filter((i) => !localImgs.includes(i)).slice(0, 20),
  localOnly: localImgs.filter((i) => !liveImgs.includes(i)).slice(0, 20),
  missingFiles: missingLocalFiles.slice(0, 30),
  liveCssPost1494: [...live.matchAll(/post-1494\.css[^"']*/g)].slice(0, 3),
  liveHasWpa: live.includes("WP Armour") || live.includes("wpa"),
  localHasWpa: local.includes("WP Armour") || local.includes("wpa"),
});

// Check hero image near form
const liveHero = live.match(/Are you Ready[\s\S]{0,2500}src=["']([^"']+)["']/i);
const localHero = local.match(/Are you Ready[\s\S]{0,2500}src=["']([^"']+)["']/i);
console.log({ liveHero: liveHero?.[1], localHero: localHero?.[1] });
