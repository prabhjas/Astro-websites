#!/usr/bin/env node
/**
 * Align Elementor root wrappers with post-{id}.css document ids.
 * Shared Elementor docs (kit/header/popup/loop): 30, 861, 940 — ignored when inferring.
 */
import fs from "node:fs";

const GLOBAL_DOC_IDS = new Set([30, 861, 940]);

function inferDocId(row) {
  const fromCss = [];
  for (const href of row.pageCss || []) {
    const m = String(href).match(/\/post-(\d+)\.css(?:$|\?)/);
    if (!m) continue;
    const id = Number(m[1]);
    if (!GLOBAL_DOC_IDS.has(id)) fromCss.push(id);
  }
  if (fromCss.length) return fromCss[0];
  const html = row.bodyHtml || row.content || "";
  const m = html.match(/data-elementor-id=["'](\d+)["']/);
  if (m) {
    const id = Number(m[1]);
    if (!GLOBAL_DOC_IDS.has(id)) return id;
  }
  return null;
}

function stripWrongRoot(html) {
  // Remove a single outer elementor root we may have added earlier
  return html.replace(
    /^<div\s+data-elementor-type="(?:wp-page|wp-post)"\s+data-elementor-id="\d+"\s+class="elementor elementor-\d+"\s+data-elementor-post-type="(?:page|post)">([\s\S]*)<\/div>\s*$/i,
    "$1",
  );
}

function ensureRoot(html, docId, kind) {
  let body = stripWrongRoot(html.trim());
  if (new RegExp(`data-elementor-id=["']${docId}["']`).test(body)) return body;
  if (new RegExp(`\\belementor-${docId}\\b`).test(body)) return body;
  const type = kind === "page" ? "wp-page" : "wp-post";
  const postType = kind === "page" ? "page" : "post";
  return `<div data-elementor-type="${type}" data-elementor-id="${docId}" class="elementor elementor-${docId}" data-elementor-post-type="${postType}">${body}</div>`;
}

function fixFile(file, kind) {
  const rows = JSON.parse(fs.readFileSync(file, "utf8"));
  let changed = 0;
  for (const row of rows) {
    const docId = inferDocId(row);
    if (!docId) continue;
    row.elementorId = docId;
    // Prefer WP/Elementor document id for theme body classes (page-id-N / elementor-page-N)
    if (kind === "page") row.id = docId;
    for (const key of ["bodyHtml", "content"]) {
      if (typeof row[key] !== "string" || !row[key].trim()) continue;
      if (!/elementor-section|elementor-element|data-element_type/.test(row[key])) continue;
      const next = ensureRoot(row[key], docId, kind);
      if (next !== row[key]) {
        row[key] = next;
        changed++;
      }
    }
  }
  fs.writeFileSync(file, JSON.stringify(rows, null, 2) + "\n");
  console.log(file, "updatedFields", changed, "rows", rows.length);
  console.log(
    " sample",
    rows.slice(0, 3).map((r) => ({ path: r.path, id: r.id, elementorId: r.elementorId })),
  );
}

fixFile("src/data/pages.json", "page");
fixFile("src/data/posts.json", "post");
