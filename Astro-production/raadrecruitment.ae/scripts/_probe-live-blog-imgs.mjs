const r = await fetch("https://raadrecruitment.ae/blog/", {
  headers: { "user-agent": "raad-check" },
});
const html = await r.text();
console.log("status", r.status, "len", html.length);

for (const slug of ["fazaa-card-uae", "employee-benefits-in-uae", "emergency-leave-in-uae"]) {
  const idx = html.indexOf(slug);
  console.log("\n===", slug, "idx", idx);
  if (idx < 0) continue;
  const chunk = html.slice(Math.max(0, idx - 2200), idx + 500);
  const imgs = [...chunk.matchAll(/src=["']([^"']+)["']/g)].map((m) => m[1]);
  console.log(imgs.filter((u) => /wp-content|data:|placeholder|uploads/i.test(u)).slice(0, 8));
}

// Also load-more AJAX? Check Easy Content Slider / Elementor
const lm = html.match(/load.?more|ecs_ajax|elementor-pagination/i);
console.log("\nloadmore hint", !!lm);
