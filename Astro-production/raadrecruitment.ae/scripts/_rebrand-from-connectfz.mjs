/**
 * Rebrand ngmanpower scaffold → ngmanpower.com (text files only).
 * Run from monorepo root: node Astro-production/ngmanpower.com/scripts/_rebrand-from-ngmanpower.mjs
 */
import {
  readdirSync,
  readFileSync,
  writeFileSync,
  statSync,
  existsSync,
  renameSync,
} from "node:fs";
import { join, extname } from "node:path";

const ROOT = join(process.cwd(), "Astro-production/ngmanpower.com");
const SKIP_DIRS = new Set(["node_modules", "dist", ".data", ".astro", "wp-content", "uploads"]);
const TEXT_EXT = new Set([
  ".ts",
  ".tsx",
  ".astro",
  ".mjs",
  ".js",
  ".json",
  ".md",
  ".yml",
  ".yaml",
  ".html",
  ".css",
  ".txt",
  ".example",
  ".service",
  ".caddy",
  ".svg",
]);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function transform(text) {
  let t = text;
  t = t.replace(/https:\/\/www\.ngmanpower\.com/gi, "https://www.ngmanpower.com");
  t = t.replace(/http:\/\/www\.ngmanpower\.com/gi, "http://www.ngmanpower.com");
  t = t.replace(/https:\/\/ngmanpower\.com/gi, "https://ngmanpower.com");
  t = t.replace(/http:\/\/ngmanpower\.com/gi, "http://ngmanpower.com");
  t = t.replace(/www\.ngmanpower\.com/gi, "www.ngmanpower.com");
  t = t.replace(/ngmanpower\.com/gi, "ngmanpower.com");
  t = t.replace(/NG Manpower Contact Form/g, "NG Manpower Contact Form");
  t = t.replace(/NG Manpower/g, "NG Manpower");
  t = t.replace(/NG Manpower/g, "NG Manpower");
  t = t.replace(/NGManpower/g, "NGManpower");
  t = t.replace(/ngmanpower-astro/g, "ngmanpower-astro");
  t = t.replace(/ngmanpower-serve-swiper/g, "ngmanpower-serve-swiper");
  t = t.replace(/siteId:\s*'ngmanpower'/g, "siteId: 'ngmanpower'");
  t = t.replace(/siteId:\s*"ngmanpower"/g, 'siteId: "ngmanpower"');
  t = t.replace(/site-ngmanpower/g, "site-ngmanpower");
  t = t.replace(/ngmanpower-/g, "ngmanpower-");
  t = t.replace(/\bconnectfz\b/g, "ngmanpower");
  t = t.replace(/\bConnectfz\b/g, "Ngmanpower");
  t = t.replace(/5102/g, "5102");
  t = t.replace(/127\.0\.0\.1:5102/g, "127.0.0.1:5102");
  return t;
}

const files = walk(ROOT);
let changed = 0;
for (const file of files) {
  const ext = extname(file).toLowerCase();
  const base = file.split(/[/\\]/).pop() || "";
  if (
    !TEXT_EXT.has(ext) &&
    !base.endsWith(".env.example") &&
    !base.endsWith(".caddy") &&
    !base.endsWith(".service")
  ) {
    continue;
  }
  const before = readFileSync(file, "utf8");
  const after = transform(before);
  if (after !== before) {
    writeFileSync(file, after);
    changed++;
  }
}

const deploy = join(ROOT, "deploy");
if (existsSync(deploy)) {
  const renames = [
    ["ngmanpower.service", "ngmanpower.service"],
    ["ngmanpower.com.caddy", "ngmanpower.com.caddy"],
    ["ngmanpower.service", "ngmanpower.service"],
    ["ngmanpower.com.caddy", "ngmanpower.com.caddy"],
  ];
  for (const [from, to] of renames) {
    const a = join(deploy, from);
    const b = join(deploy, to);
    if (existsSync(a) && from !== to && !existsSync(b)) renameSync(a, b);
  }
}

console.log(`rebranded ${changed} files under ngmanpower.com`);
