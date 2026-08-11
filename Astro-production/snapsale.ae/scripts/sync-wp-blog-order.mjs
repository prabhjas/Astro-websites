#!/usr/bin/env node
/**
 * Sync blog archive order: live /blog/ pages 1–6 (Elementor grid order), then WP REST for any remaining slugs.
 */
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'src/data/wp-blog-order.json');
const API = 'https://snapsale.ae/wp-json/wp/v2/posts';
const ORIGIN = 'https://snapsale.ae';
const UA = 'Mozilla/5.0 (compatible; snapsale-ae-astro/1.0)';

const TITLE_LINK_RE =
  /elementor-heading-title elementor-size-default"><a href="https:\/\/kpmpro\.ae\/([^"/]+)\//g;

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.text();
}

function slugsFromArchiveHtml(html) {
  const slugs = [];
  let m;
  while ((m = TITLE_LINK_RE.exec(html)) !== null) slugs.push(m[1]);
  return slugs;
}

async function fetchLiveArchiveOrder() {
  const slugs = [];
  for (let page = 1; page <= 6; page++) {
    const url = page === 1 ? `${ORIGIN}/blog/` : `${ORIGIN}/blog/${page}/`;
    const html = await fetchText(url);
    slugs.push(...slugsFromArchiveHtml(html));
  }
  return slugs;
}

async function fetchWpSlugs() {
  const slugs = [];
  for (let page = 1; page <= 10; page++) {
    const url = `${API}?per_page=100&page=${page}&_fields=slug`;
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) break;
    const data = await res.json();
    if (!data.length) break;
    slugs.push(...data.map((p) => p.slug));
  }
  return slugs;
}

const live = await fetchLiveArchiveOrder();
const wp = await fetchWpSlugs();
const seen = new Set(live);
const merged = [...live];
for (const slug of wp) {
  if (!seen.has(slug)) {
    merged.push(slug);
    seen.add(slug);
  }
}

writeFileSync(OUT, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
console.log(`Wrote ${merged.length} slugs (${live.length} from live archive) to ${OUT}`);
