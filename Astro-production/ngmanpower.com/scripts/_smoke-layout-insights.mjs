const base = "http://127.0.0.1:5102";

async function check(path, needles) {
  const res = await fetch(base + path);
  const html = await res.text();
  const out = { path, status: res.status };
  for (const n of needles) out[n] = html.includes(n);
  console.log(out);
  return html;
}

await check("/manufacturing/", [
  "industry-layout-fix.css",
  "1-4.png",
  "us_custom_0493f734",
  "Frame-364",
]);

await check("/construction/", [
  "industry-layout-fix.css",
  "Frame-383.jpg",
]);

const insights = await check("/insights/", [
  "insights-load-more.js",
  "data-sp-insights-load-more",
  "data-sp-insights-list",
  "g-loadmore",
  "Load More",
]);

const ids = [...insights.matchAll(/data-id="(\d+)"/g)].map((m) => m[1]);
console.log("shown ids", ids.length, ids.slice(0, 5));

const api = await fetch(
  `${base}/api/blog/load-more/?format=impreza&perPage=12&exclude=${ids.join(",")}`,
);
const json = await api.json();
console.log("api", {
  status: api.status,
  ok: json.ok,
  hasMore: json.hasMore,
  htmlLen: json.html?.length,
  hasArticle: json.html?.includes("w-grid-item"),
  sample: json.html?.slice(0, 180),
});

// ensure no duplicate ids in response vs page
const newIds = [...(json.html || "").matchAll(/data-id="(\d+)"/g)].map((m) => m[1]);
const overlap = newIds.filter((id) => ids.includes(id));
console.log("new cards", newIds.length, "overlap", overlap);
