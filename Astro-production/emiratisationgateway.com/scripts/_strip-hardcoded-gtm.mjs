/**
 * Strip hardcoded GTM / gtag snippets from legacy HTML mirrors.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function stripLegacyAnalytics(html) {
  return html
    .replace(
      /<!--\s*Google Tag Manager\s*\(noscript\)\s*-->[\s\S]*?<!--\s*End Google Tag Manager\s*\(noscript\)\s*-->/gi,
      '',
    )
    .replace(/<!--\s*Google Tag Manager\s*-->[\s\S]*?<!--\s*End Google Tag Manager\s*-->/gi, '')
    .replace(
      /<noscript>\s*<iframe[^>]+googletagmanager\.com\/ns\.html[\s\S]*?<\/iframe>\s*<\/noscript>/gi,
      '',
    )
    .replace(/<iframe[^>]+googletagmanager\.com\/ns\.html[\s\S]*?<\/iframe>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?googletagmanager\.com\/gtm\.js[\s\S]*?<\/script>/gi, '')
    .replace(/<script[^>]+googletagmanager\.com\/gtm\.js[^>]*>\s*<\/script>/gi, '')
    .replace(/<!--\s*Google tag\s*\(gtag\.js\)\s*-->\s*/gi, '')
    .replace(/<script[^>]+googletagmanager\.com\/gtag\/js[^>]*>\s*<\/script>\s*/gi, '')
    .replace(
      /<script[^>]*>\s*window\.dataLayer\s*=\s*window\.dataLayer\s*\|\|\s*\[\];[\s\S]*?gtag\(\s*['"]config['"][\s\S]*?<\/script>\s*/gi,
      '',
    )
    .replace(
      /<script[^>]*>\s*function gtag\(\)[\s\S]*?gtag\(\s*['"]config['"][\s\S]*?<\/script>\s*/gi,
      '',
    );
}

let files = 0;
let changed = 0;

function walk(dir) {
  if (!existsSync(dir)) return;
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) {
      walk(p);
      continue;
    }
    if (!/\.(html|htm)$/i.test(ent.name)) continue;
    files++;
    const before = readFileSync(p, 'utf8');
    let after = stripLegacyAnalytics(before);
    // Remove leftover hardcoded IDs if any remain outside scripts
    if (/GTM-[A-Z0-9]+|googletagmanager\.com\/(?:gtm|gtag)/i.test(after)) {
      after = after
        .replace(/<script[^>]+src=["']https?:\/\/www\.googletagmanager\.com\/[^"']+["'][^>]*>\s*<\/script>/gi, '')
        .replace(/gtag\(\s*['"]config['"]\s*,\s*['"]G-[A-Z0-9]+['"]\s*\);?/gi, '');
    }
    if (after !== before) {
      writeFileSync(p, after);
      changed++;
      console.log('stripped', p.replace(root, ''));
    }
  }
}

walk(join(root, 'src/legacy'));
console.log(JSON.stringify({ files, changed }, null, 2));
