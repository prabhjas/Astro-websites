import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcPng = path.join(
  ROOT,
  'public/wp-content/uploads/2026/01/output-onlinepngtools-Picsart-BackgroundChanger-150x150.png',
);
const publicDir = path.join(ROOT, 'public');
const png = fs.readFileSync(srcPng);

async function pngSize(size) {
  return sharp(png)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

function buildIco(pngBuffers, dims) {
  const count = pngBuffers.length;
  const headerSize = 6 + count * 16;
  let dataAt = headerSize;
  const total = headerSize + pngBuffers.reduce((n, b) => n + b.length, 0);
  const out = Buffer.alloc(total);
  out.writeUInt16LE(0, 0);
  out.writeUInt16LE(1, 2);
  out.writeUInt16LE(count, 4);
  let o = 6;
  for (let i = 0; i < count; i++) {
    const d = dims[i];
    out.writeUInt8(d >= 256 ? 0 : d, o);
    out.writeUInt8(d >= 256 ? 0 : d, o + 1);
    out.writeUInt8(0, o + 2);
    out.writeUInt8(0, o + 3);
    out.writeUInt16LE(1, o + 4);
    out.writeUInt16LE(32, o + 6);
    out.writeUInt32LE(pngBuffers[i].length, o + 8);
    out.writeUInt32LE(dataAt, o + 12);
    o += 16;
    pngBuffers[i].copy(out, dataAt);
    dataAt += pngBuffers[i].length;
  }
  return out;
}

const dims = [16, 32, 48];
const buffers = [];
for (const d of dims) buffers.push(await pngSize(d));
const ico = buildIco(buffers, dims);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), ico);

const b64 = png.toString('base64');
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 150 150" width="150" height="150">
  <image width="150" height="150" xlink:href="data:image/png;base64,${b64}"/>
</svg>
`;
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svg);
fs.copyFileSync(srcPng, path.join(publicDir, 'favicon-32x32.png'));
await sharp(png).resize(32, 32).png().toFile(path.join(publicDir, 'favicon-32.png'));

console.log('favicon.ico', ico.length);
console.log('favicon.svg', fs.statSync(path.join(publicDir, 'favicon.svg')).size);
