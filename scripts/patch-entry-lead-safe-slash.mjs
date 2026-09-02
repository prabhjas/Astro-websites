#!/usr/bin/env node
/**
 * Lead-safe trailing-slash patch for @astrojs/node standalone entry.
 *
 * Problem: with trailingSlash: 'always', createStaticHandler 301s ANY bare path
 * (including POST /api/contact) BEFORE SSR/middleware. Browsers treat 301 as GET
 * and drop the body → lost leads.
 *
 * Fix: for non-GET/HEAD, rewrite req.url in-place to the slashed path so SSR
 * handles the request with the body intact (no redirect).
 *
 * Usage (from a site package.json):
 *   "build": "astro build && node ../../scripts/patch-entry-lead-safe-slash.mjs"
 *
 * Or: node scripts/patch-entry-lead-safe-slash.mjs Astro-production/redo.ae
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const MARKER = '/* lead-safe-slash */';

const NEEDLE = `case "always": if (!hasSlash && !hasFileExtension(urlPath) && !isInternalPath(urlPath)) {
					pathname = urlPath + "/" + (urlQuery ? "?" + urlQuery : "");
					res.statusCode = 301;
					res.setHeader("Location", pathname);
					return res.end();
				}`;

const REPLACEMENT = `case "always": if (!hasSlash && !hasFileExtension(urlPath) && !isInternalPath(urlPath)) {
					${MARKER}
					const __leadSafeMethod = (req.method || "GET").toUpperCase();
					if (__leadSafeMethod !== "GET" && __leadSafeMethod !== "HEAD") {
						req.url = urlPath + "/" + (urlQuery ? "?" + urlQuery : "");
						pathname = urlPath + "/";
						break;
					}
					pathname = urlPath + "/" + (urlQuery ? "?" + urlQuery : "");
					res.statusCode = 301;
					res.setHeader("Location", pathname);
					return res.end();
				}`;

// Also match slightly different formatting (multiline always case from source maps / prettier)
const NEEDLE_ALT = `case "always": {
          if (!hasSlash && !hasFileExtension(urlPath) && !isInternalPath(urlPath)) {
            pathname = urlPath + "/" + (urlQuery ? "?" + urlQuery : "");
            res.statusCode = 301;
            res.setHeader("Location", pathname);
            return res.end();
          }
          break;
        }`;

const REPLACEMENT_ALT = `case "always": {
          if (!hasSlash && !hasFileExtension(urlPath) && !isInternalPath(urlPath)) {
            ${MARKER}
            const __leadSafeMethod = (req.method || "GET").toUpperCase();
            if (__leadSafeMethod !== "GET" && __leadSafeMethod !== "HEAD") {
              req.url = urlPath + "/" + (urlQuery ? "?" + urlQuery : "");
              pathname = urlPath + "/";
              break;
            }
            pathname = urlPath + "/" + (urlQuery ? "?" + urlQuery : "");
            res.statusCode = 301;
            res.setHeader("Location", pathname);
            return res.end();
          }
          break;
        }`;

function patchEntry(entryPath) {
  if (!existsSync(entryPath)) {
    console.error(`[lead-safe-slash] missing entry: ${entryPath}`);
    process.exit(1);
  }
  const src = readFileSync(entryPath, 'utf8');
  if (src.includes(MARKER)) {
    console.log(`[lead-safe-slash] already patched: ${entryPath}`);
    return;
  }
  let next = src;
  if (next.includes(NEEDLE)) {
    next = next.replace(NEEDLE, REPLACEMENT);
  } else if (next.includes(NEEDLE_ALT)) {
    next = next.replace(NEEDLE_ALT, REPLACEMENT_ALT);
  } else {
    // Fuzzy: find the always→301 block near createStaticHandler
    const re =
      /case "always":\s*if\s*\(!hasSlash && !hasFileExtension\(urlPath\) && !isInternalPath\(urlPath\)\)\s*\{\s*pathname = urlPath \+ "\/" \+ \(urlQuery \? "\?" \+ urlQuery : ""\);\s*res\.statusCode = 301;\s*res\.setHeader\("Location", pathname\);\s*return res\.end\(\);\s*\}/;
    if (!re.test(next)) {
      console.error(`[lead-safe-slash] pattern not found in ${entryPath}`);
      console.error('[lead-safe-slash] Astro/@astrojs/node bundling may have changed — update this script.');
      process.exit(1);
    }
    next = next.replace(re, REPLACEMENT);
  }
  writeFileSync(entryPath, next);
  console.log(`[lead-safe-slash] patched: ${entryPath}`);
}

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const targets = process.argv.slice(2);

if (targets.length === 0) {
  // Default: cwd is a site package (called from package.json build)
  patchEntry(resolve(process.cwd(), 'dist/server/entry.mjs'));
} else {
  for (const t of targets) {
    const base = resolve(root, t);
    patchEntry(join(base, 'dist/server/entry.mjs'));
  }
}
