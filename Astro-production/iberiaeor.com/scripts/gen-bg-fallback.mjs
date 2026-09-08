/**
 * Safer background fallbacks:
 * Only paint onto the element when it is a motion-effects background host
 * AND the motion layer DOM is missing.
 */
import fs from "node:fs";

const files = [
  "public/wp-content/uploads/elementor/css/post-10.css",
  "public/wp-content/uploads/elementor/css/post-153.css",
  "public/wp-content/uploads/elementor/css/post-158.css",
  "public/wp-content/uploads/elementor/css/post-140.css",
  "public/wp-content/uploads/elementor/css/post-142.css",
  "public/wp-content/uploads/elementor/css/post-144.css",
  "public/wp-content/uploads/elementor/css/post-146.css",
  "public/wp-content/uploads/elementor/css/post-325.css",
  "public/wp-content/uploads/elementor/css/post-357.css",
  "public/wp-content/uploads/elementor/css/post-383.css",
  "public/wp-content/uploads/elementor/css/post-400.css",
  "public/wp-content/uploads/elementor/css/post-980.css",
  "public/wp-content/uploads/elementor/css/post-1191.css",
].filter((f) => fs.existsSync(f));

const out = [];
out.push("/* Motion-effects background fallbacks - only when layer DOM is absent */\n");
const seen = new Set();

for (const file of files) {
  const css = fs.readFileSync(file, "utf8");
  const dual =
    /\.elementor-(\d+)\s+\.elementor-element\.(elementor-element-[a-z0-9]+):not\(\.elementor-motion-effects-element-type-background\)\s*,\s*\.elementor-\d+\s+\.elementor-element\.\2\s*>\s*\.elementor-motion-effects-container\s*>\s*\.elementor-motion-effects-layer\s*\{([^}]+)\}/gi;
  let m;
  while ((m = dual.exec(css))) {
    const pageId = m[1];
    const el = m[2];
    const body = m[3];
    const key = `${pageId}:${el}`;
    if (seen.has(key)) continue;
    const decls = body
      .split(";")
      .map((d) => d.trim())
      .filter((d) => /^background(-|$)/i.test(d));
    if (!decls.length) continue;
    seen.add(key);
    // Apply only when motion host lacks its layer
    out.push(
      `.elementor-${pageId} .elementor-element.${el}.elementor-motion-effects-element-type-background:not(:has(.elementor-motion-effects-layer)){${decls.join(";")};}`,
    );
  }

  const col =
    /\.elementor-(\d+)\s+\.elementor-element\.(elementor-element-[a-z0-9]+)\s*>\s*\.elementor-widget-wrap\s*>\s*\.elementor-motion-effects-container\s*>\s*\.elementor-motion-effects-layer\s*\{([^}]+)\}/gi;
  while ((m = col.exec(css))) {
    const pageId = m[1];
    const el = m[2];
    const body = m[3];
    const key = `${pageId}:${el}:col`;
    if (seen.has(key)) continue;
    const decls = body
      .split(";")
      .map((d) => d.trim())
      .filter((d) => /^background(-|$)/i.test(d));
    if (!decls.length) continue;
    seen.add(key);
    out.push(
      `.elementor-${pageId} .elementor-element.${el} > .elementor-widget-wrap.elementor-element-populated:not(:has(.elementor-motion-effects-layer)){${decls.join(";")};}`,
    );
  }
}

fs.writeFileSync("public/css/elementor-bg-fallback.css", out.join("\n"));
console.log("safe fallback rules", seen.size);
