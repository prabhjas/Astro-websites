#!/usr/bin/env node
const live = await (await fetch("https://raadrecruitment.ae/?nowprocket=1")).text();
const local = await (await fetch("http://127.0.0.1:5113/")).text();

function analyze(html, label) {
  const ids = [...html.matchAll(/elementor-(\d+)/g)].map((m) => m[1]);
  const uniq = [...new Set(ids)].slice(0, 20);
  const wrappers = [...html.matchAll(/class="([^"]*elementor-\d+[^"]*)"/g)]
    .map((m) => m[1])
    .filter((c) => /\belementor\b/.test(c) && /elementor-\d+/.test(c))
    .slice(0, 10);
  const types = [...html.matchAll(/data-elementor-type="([^"]+)"/g)].map((m) => m[1]);
  const idsAttr = [...html.matchAll(/data-elementor-id="(\d+)"/g)].map((m) => m[1]);
  console.log("\n====", label);
  console.log("uniq elementor-N mentions", uniq);
  console.log("types", [...new Set(types)]);
  console.log("data-elementor-id", [...new Set(idsAttr)]);
  console.log("wrapper classes sample", wrappers.slice(0, 5));
  const mainStart = html.indexOf('id="main"');
  console.log("main snippet", html.slice(mainStart, mainStart + 500).replace(/\s+/g, " "));
}

analyze(live, "live");
analyze(local, "local");
