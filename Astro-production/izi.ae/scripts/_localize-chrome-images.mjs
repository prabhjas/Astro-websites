/**
 * Download remote chrome assets (WhatsApp / blur) and rewrite cleaned HTML to local paths.
 */
import { mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LEGACY = join(ROOT, 'src/legacy');
const PUBLIC = join(ROOT, 'public');

const ASSETS = [
  {
    remote: 'https://redo.ae/wp-content/uploads/2024/03/whatsapp-button.png',
    localPath: 'wp-content/uploads/izi-local/whatsapp-button.png',
  },
  {
    remote: 'https://car.bloggerplex.top/wp-content/uploads/2024/04/car-blur.png',
    localPath: 'wp-content/uploads/izi-local/car-blur.png',
  },
];

async function download(remote, localPath) {
  const dest = join(PUBLIC, localPath);
  mkdirSync(dirname(dest), { recursive: true });
  if (existsSync(dest) && readFileSync(dest).length > 100) {
    console.log('exists', localPath);
    return;
  }
  const r = await fetch(remote, { headers: { 'user-agent': 'Mozilla/5.0' } });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${remote}`);
  const buf = Buffer.from(await r.arrayBuffer());
  writeFileSync(dest, buf);
  console.log('downloaded', localPath, buf.length);
}

for (const a of ASSETS) await download(a.remote, a.localPath);

function walk(dir, acc = []) {
  for (const n of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, n.name);
    if (n.isDirectory()) walk(p, acc);
    else if (n.name.endsWith('.cleaned.html')) acc.push(p);
  }
  return acc;
}

let filesChanged = 0;
let replacements = 0;
for (const file of walk(LEGACY)) {
  let html = readFileSync(file, 'utf8');
  let before = html;
  for (const a of ASSETS) {
    const localUrl = '/' + a.localPath.replace(/\\/g, '/');
    if (html.includes(a.remote)) {
      html = html.split(a.remote).join(localUrl);
      replacements += 1;
    }
  }
  if (html !== before) {
    writeFileSync(file, html);
    filesChanged += 1;
  }
}
console.log({ filesChanged, replacements });
