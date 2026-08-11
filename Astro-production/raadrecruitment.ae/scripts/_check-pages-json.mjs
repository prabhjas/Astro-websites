#!/usr/bin/env node
import fs from "node:fs";
import { createRequire } from "node:module";

const path = "Astro-production/raadrecruitment.ae/src/data/pages.json";
try {
  const pages = JSON.parse(fs.readFileSync(path, "utf8"));
  console.log("parse ok", pages.length);
  console.log(
    "paths",
    pages.map((p) => p.path || p.slug || p.url).slice(0, 20),
  );
  const home = pages.find(
    (p) => p.path === "/" || p.slug === "" || p.slug === "/" || p.slug === "home",
  );
  console.log(
    "home",
    home
      ? {
          id: home.id,
          path: home.path,
          slug: home.slug,
          title: home.title,
          bodyLen: (home.bodyHtml || home.content || "").length,
        }
      : null,
  );
} catch (e) {
  console.log("PARSE FAIL", e.message);
}
