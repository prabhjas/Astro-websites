const paths = [
  "/generator-rental/",
  "/scaffold-rental/",
  "/heavy-machinery-rental/",
  "/construction-equipment-rental/",
  "/heavy-machinery-rental/forklift-rental/",
  "/blog/",
];

for (const p of paths) {
  const html = await (await fetch(`https://spheavyrental.ae${p}?nowprocket=1`, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
  })).text();
  console.log(
    p,
    "len",
    html.length,
    "wp-page",
    html.includes('data-elementor-type="wp-page"'),
    "accordion",
    (html.match(/elementor-accordion/g) || []).length,
    "title",
    html.match(/<title>([^<]+)/)?.[1]?.slice(0, 50),
  );
}
