import { readFileSync } from 'node:fs';
const env = readFileSync('Astro-production/emiratisationhub.com/.env', 'utf8');
for (const line of env.split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i < 0) continue;
  const k = t.slice(0, i);
  if (!/^(WEBSITE|PIPEDRIVE|FORM_|LEAD_|PUBLIC_SITE)/.test(k)) continue;
  const v = t.slice(i + 1);
  console.log(k + '=' + (v ? (k.includes('TOKEN') ? '***' + v.slice(-4) : v.length > 40 ? v.slice(0, 8) + '…' : v) : '(empty)'));
}
