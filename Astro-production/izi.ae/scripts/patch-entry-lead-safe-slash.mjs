#!/usr/bin/env node
/**
 * Lead-safe trailing-slash patch for @astrojs/node standalone entry.
 * See repo scripts/patch-entry-lead-safe-slash.mjs for full rationale.
 *
 * @astrojs/node createStaticHandler 301s bare paths BEFORE SSR. POST bodies die.
 * For non-GET/HEAD, rewrite req.url to the slashed path in-place (no redirect).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const MARKER = '/* lead-safe-slash */';
const entryPath = resolve(process.cwd(), 'dist/server/entry.mjs');

if (!existsSync(entryPath)) {
  console.error(`[lead-safe-slash] missing entry: ${entryPath}`);
  process.exit(1);
}

const src = readFileSync(entryPath, 'utf8');
if (src.includes(MARKER)) {
  console.log(`[lead-safe-slash] already patched: ${entryPath}`);
  process.exit(0);
}

const re =
  /case "always":\s*if\s*\(!hasSlash && !hasFileExtension\(urlPath\) && !isInternalPath\(urlPath\)\)\s*\{\s*pathname = urlPath \+ "\/" \+ \(urlQuery \? "\?" \+ urlQuery : ""\);\s*res\.statusCode = 301;\s*res\.setHeader\("Location", pathname\);\s*return res\.end\(\);\s*\}/;

const replacement = `case "always": if (!hasSlash && !hasFileExtension(urlPath) && !isInternalPath(urlPath)) {
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

if (!re.test(src)) {
  console.error(`[lead-safe-slash] pattern not found in ${entryPath}`);
  process.exit(1);
}

writeFileSync(entryPath, src.replace(re, replacement));
console.log(`[lead-safe-slash] patched: ${entryPath}`);
