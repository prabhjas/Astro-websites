#!/usr/bin/env node
import { load } from "cheerio";

const pages = [
  "/",
  "/emiratisation/",
  "/staff-outsourcing-in-uae/",
  "/recruitment/",
];

function analyze(html, label) {
  const $ = load(html);
  const hasText = /Success\s*Story|Our\s*Success/i.test(html);
  // find headings containing Success
  const headings = [];
  $("h1,h2,h3,h4,.elementor-heading-title").each((_, el) => {
    const t = $(el).text().replace(/\s+/g, " ").trim();
    if (/success/i.test(t)) headings.push(t.slice(0, 80));
  });
  // n2 slider related
  const ss = (html.match(/n2-ss-\d+/g) || []).slice(0, 8);
  const male = html.includes("Male-01.png") || html.includes("Female-02");
  console.log("\n====", label);
  console.log({ hasText, headings: [...new Set(headings)], ss: [...new Set(ss)], maleAvatars: male, len: html.length });
}

for (const p of pages) {
  const live = await (await fetch("https://raadrecruitment.ae" + p + "?nowprocket=1")).text();
  const local = await (await fetch("http://127.0.0.1:5113" + p)).text();
  analyze(live, "LIVE " + p);
  analyze(local, "LOCAL " + p);
}
