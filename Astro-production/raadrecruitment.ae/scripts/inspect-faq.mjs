const html = await (await fetch("/generator-rental/?nowprocket=1")).text();
const keys = ["e-n-accordion", "elementor-accordion", "Frequently", "faq", "nested-accordion", "toggle", "elementor-tab"];
for (const k of keys) console.log(k, (html.match(new RegExp(k, "gi")) || []).length);
const i = html.toLowerCase().indexOf("frequently");
console.log("snippet", html.slice(Math.max(0, i - 200), i + 1200).replace(/\s+/g, " ").slice(0, 900));
const css = [...html.matchAll(/href="([^"]+\.css[^"]*)"/g)]
  .map((m) => m[1])
  .filter((u) => /accordion|toggle|nested|tab/i.test(u));
console.log("accordion css", css);
const js = [...html.matchAll(/src="([^"]+\.js[^"]*)"/g)]
  .map((m) => m[1])
  .filter((u) => /accordion|nested|frontend/i.test(u));
console.log("related js", js.slice(0, 20));

// Compare local body for generator
const local = await (await fetch("http://127.0.0.1:4321/generator-rental/")).text();
console.log("\nLOCAL accordion counts");
for (const k of keys) console.log(k, (local.match(new RegExp(k, "gi")) || []).length);
const li = local.toLowerCase().indexOf("frequently");
console.log("local snippet", local.slice(Math.max(0, li - 100), li + 800).replace(/\s+/g, " ").slice(0, 700));
