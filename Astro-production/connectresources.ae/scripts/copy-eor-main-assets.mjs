#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = '/Users/rajpalsingh/Downloads/EOR Hub - Assets (1)';
const DEST = path.join(ROOT, 'public/assets/images/2026/eor-main');

function slug(name) {
  return name
    .replace(/\.(svg|webp|png)$/i, '')
    .replace(/[%+]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

function copyDir(subdir, ext) {
  const from = path.join(SRC, subdir);
  if (!fs.existsSync(from)) {
    console.warn('Missing source dir:', from);
    return;
  }
  for (const file of fs.readdirSync(from)) {
    if (!file.toLowerCase().endsWith(ext)) continue;
    const base = slug(file) + ext;
    fs.copyFileSync(path.join(from, file), path.join(DEST, base));
    console.log(`${subdir}/${file} -> eor-main/${base}`);
  }
}

fs.mkdirSync(DEST, { recursive: true });
copyDir('ICONS', '.svg');
copyDir('WEBP', '.webp');
copyDir('PNG', '.png');

// Mirror key icons to legacy 2026/08 paths referenced in HTML
const legacyDir = path.join(ROOT, 'public/assets/images/2026/08');
fs.mkdirSync(legacyDir, { recursive: true });

const legacyMap = {
  'UAE.svg': 'UAE.svg',
  'KSA.svg': 'KSA.svg',
  'Qatar.svg': 'Qatar.svg',
  'Oman.svg': 'Oman.svg',
  'Kuwait.svg': 'Kuwait.svg',
  'Jordan.svg': 'Jordan.svg',
  'Egypt.svg': 'Egypt.svg',
  'Lebanon.svg': 'Lebanon.svg',
  'Faster global hiring.svg': 'Faster-global-hiring.svg',
  'No local entity required.svg': 'No-local-entity-required.svg',
  'Reduced compliance risk.svg': 'Reduced-compliance-risk.svg',
  'Scalable hiring model.svg': 'Scalable-hiring-model.svg',
  'Pay in multiple currencies without conversion headache.svg':
    'Pay-in-multiple-currencies-without-conversion-headache.svg',
  'Offer competitive, locally compliant benefits.svg':
    'Offer-competitive-locally-compliant-benefits.svg',
  'Stay 100% compliant without setting up local entities.svg':
    'Stay-100-compliant-without-setting-up-local-entities.svg',
  'Hire full-time employees in any of 150+ countries.svg':
    'Hire-full-time-employees-in-any-of-150-countries.svg',
};

for (const [srcName, destName] of Object.entries(legacyMap)) {
  const src = path.join(SRC, 'ICONS', srcName);
  if (!fs.existsSync(src)) continue;
  fs.copyFileSync(src, path.join(legacyDir, destName));
  fs.copyFileSync(src, path.join(DEST, destName));
}

for (const file of ['EOR Img.webp', 'Employer of Record as a Strategic Hiring Model.webp']) {
  const src = path.join(SRC, 'WEBP', file);
  if (!fs.existsSync(src)) continue;
  const dest = slug(file) + '.webp';
  fs.copyFileSync(src, path.join(DEST, dest));
  fs.copyFileSync(src, path.join(legacyDir, dest));
}

console.log('Done copying EOR main assets.');
