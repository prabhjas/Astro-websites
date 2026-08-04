import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = await (await fetch('https://kinzahr.com/industries/')).text();
const links = [
  ...html.matchAll(/href="(?:https:\/\/kinzahr\.com)?(\/industries\/[a-z0-9\-]+)\/?"/gi),
].map((m) => m[1].replace(/\/$/, ''));
const uniq = [...new Set(links)].filter((p) => p !== '/industries').sort();
for (const p of uniq) {
  const slug = p.replace(/^\//, '');
  const ok = existsSync(join(ROOT, 'src/legacy', `${slug}.cleaned.html`));
  console.log(`${ok ? 'OK' : 'MISSING'} ${slug}`);
}
