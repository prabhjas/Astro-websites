#!/usr/bin/env node
import fs from "node:fs";
const pages = JSON.parse(fs.readFileSync("src/data/pages.json", "utf8"));
console.log(
  pages.map((p) => ({
    id: p.id,
    path: p.path,
    pageCss: (p.pageCss || []).filter((c) => /\/post-\d+\.css/.test(c)),
    keys: Object.keys(p).filter((k) => /id|wp|elementor/i.test(k)),
  })),
);
