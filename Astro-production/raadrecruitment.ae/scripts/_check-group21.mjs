import { readFileSync, writeFileSync } from "fs";
import { createHash } from "crypto";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const localPath = join(ROOT, "public/wp-content/uploads/2023/05/Group-21.png");
const local = readFileSync(localPath);
console.log("local", local.length, createHash("sha1").update(local).digest("hex").slice(0, 12), "colorType", local[25]);

const r = await fetch("/wp-content/uploads/2023/05/Group-21.png", {
  headers: { "User-Agent": "Mozilla/5.0" },
});
const buf = Buffer.from(await r.arrayBuffer());
console.log("live", r.status, buf.length, createHash("sha1").update(buf).digest("hex").slice(0, 12), "colorType", buf[25]);

if (createHash("sha1").update(local).digest("hex") !== createHash("sha1").update(buf).digest("hex")) {
  writeFileSync(localPath, buf);
  console.log("replaced local with live Group-21.png");
} else {
  console.log("local === live");
}

// Check if sharp available to inspect corners
try {
  const sharp = (await import("sharp")).default;
  const { data, info } = await sharp(localPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  // sample corners
  const samples = [
    [0, 0],
    [info.width - 1, 0],
    [0, info.height - 1],
    [info.width - 1, info.height - 1],
    [10, 10],
    [Math.floor(info.width / 2), 10],
  ];
  for (const [x, y] of samples) {
    const i = (y * info.width + x) * info.channels;
    console.log(`px(${x},${y})`, data[i], data[i + 1], data[i + 2], "a", data[i + 3]);
  }
} catch (e) {
  console.log("sharp n/a", e.message);
}
