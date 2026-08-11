#!/usr/bin/env node
const paths = [
  "/differences-between-recruitment-and-selection-process/",
  "/benefits-of-medical-recruitment-agencies-in-dubai/",
  "/emiratisation-in-tourism-and-hospitality/",
  "/salary-certificate-uae/",
  "/medical-certificate-for-sick-leave-in-uae/",
  "/benefits-of-outsourcing-digital-marketing/",
  "/role-of-emiratisation-in-uae/",
  "/tips-for-hiring-the-right-talent/",
  "/types-of-leaves-in-uae/",
  "/limited-contract-resignation-in-uae/",
  "/outsourcing-for-startup/",
];

function pick(html, re) {
  const m = html.match(re);
  return m ? m[1] : null;
}

for (const p of paths) {
  const html = await (await fetch("https://raadrecruitment.ae" + p)).text();
  const og =
    pick(html, /property=["']og:image["'][^>]*content=["']([^"']+)/i) ||
    pick(html, /content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
  const tw =
    pick(html, /name=["']twitter:image["'][^>]*content=["']([^"']+)/i) ||
    pick(html, /content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i);

  let primary = null;
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(m[1]);
      const graph = data["@graph"] || [data];
      for (const node of graph) {
        const t = String(node["@type"] || "");
        if (/Article|BlogPosting/i.test(t) && node.image) {
          primary = typeof node.image === "string" ? node.image : node.image.url || node.image[0]?.url || node.image[0];
        }
        if (node["@type"] === "ImageObject" && /primaryimage/i.test(String(node["@id"] || "")) && node.url) {
          primary = primary || node.url;
        }
      }
    } catch {}
  }

  // theme post featured image widget
  const featWidget = pick(
    html,
    /elementor-widget-theme-post-featured-image[\s\S]{0,800}?src=["']([^"']+)/i,
  );
  const wpPostImage = pick(html, /class=["'][^"']*wp-post-image[^"']*["'][^>]*src=["']([^"']+)/i);

  const uploads = [...html.matchAll(/\/wp-content\/uploads\/[0-9]{4}\/[0-9]{2}\/[^"'\\\s>]+/gi)]
    .map((m) => m[0])
    .filter((u) => !/logo|favicon|icon|emoji|svg|cropped-favicon/i.test(u));
  const uniq = [...new Set(uploads)].slice(0, 15);

  console.log(
    JSON.stringify(
      {
        path: p,
        og,
        tw,
        primary,
        featWidget,
        wpPostImage,
        uploads: uniq,
      },
      null,
      2,
    ),
  );
}
