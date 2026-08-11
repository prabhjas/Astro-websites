#!/usr/bin/env node
const html = await (await fetch("http://127.0.0.1:5113/")).text();
console.log({
  elementor1298: html.includes("elementor-1298"),
  elementorTypes: [...html.matchAll(/data-elementor-type="([^"]+)/g)].map((m) => m[1]).slice(0, 8),
  stylesheets: (html.match(/rel="stylesheet"/g) || []).length,
  frontend: html.includes("frontend.css"),
  post1298: html.includes("post-1298.css"),
  astraInline: html.includes("astra-theme-css-inline"),
  post30: html.includes("post-30.css"),
  kit30: /elementor-kit-30/.test(html),
});
