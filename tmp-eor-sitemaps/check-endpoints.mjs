const LOCAL = "http://127.0.0.1:5084";
const paths = [
  "/sitemap_index.xml",
  "/page-sitemap.xml",
  "/post-sitemap.xml",
  "/guides-sitemap.xml",
  "/country-sitemap.xml",
  "/eor-sitemap.xml",
  "/insights/",
  "/uae/",
  "/uae/employer-of-record/",
  "/guides/uae-visa-fine/",
  "/qiwa-login/",
  "/about-us/",
  "/contact-us/",
];

function locs(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((m) => m[1]);
}

for (const p of paths) {
  const res = await fetch(LOCAL + p, { redirect: "manual" });
  const ct = res.headers.get("content-type") || "";
  let extra = "";
  if (ct.includes("xml")) {
    const text = await res.text();
    extra = ` locs=${locs(text).length}`;
  }
  console.log(res.status, p + extra);
}
