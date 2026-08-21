#!/usr/bin/env node
import fs from "node:fs";
const pages = JSON.parse(fs.readFileSync("src/data/pages.json", "utf8"));
const home = pages.find((p) => p.path === "/");
console.log({
  id: home?.id,
  path: home?.path,
  title: home?.title,
  hasWrapper: /elementor-\d+/.test(home?.bodyHtml || ""),
  wrapperSnippet: (home?.bodyHtml || "").slice(0, 200),
});
const html = await (await fetch("http://127.0.0.1:5113/")).text();
const m = html.match(/class="elementor elementor-(\d+)"/);
const ids = [...html.matchAll(/data-elementor-id="(\d+)"/g)].map((x) => x[1]);
console.log({ renderedWrapper: m?.[0], ids: [...new Set(ids)].slice(0, 10) });
const main = html.indexOf('id="main"');
console.log("main", html.slice(main, main + 350).replace(/\s+/g, " "));
