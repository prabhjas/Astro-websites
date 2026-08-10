import fs from "node:fs";
import path from "node:path";

const ORIGIN = "";
const html = fs.readFileSync("_crawl/homepage.html", "utf8");

// WP Rocket patterns
const rocketCss = [...html.matchAll(/data-rocket-[^>]*href=(["'])(.*?)\1/g)].map((m) => m[2]);
const anyCss = [...html.matchAll(/["']([^"']*?\.css(?:\?[^"']*)?)["']/g)].map((m) => m[1]);
const styles = html.match(/<style[\s\S]*?<\/style>/gi) || [];
console.log("rocket css attrs", rocketCss.slice(0, 30));
console.log("any .css strings", [...new Set(anyCss)].slice(0, 50));
console.log("style tags", styles.length, "total chars", styles.reduce((a, s) => a + s.length, 0));

// Save inline styles
fs.writeFileSync("_crawl/inline-styles.html", styles.join("\n\n"));

// Check header/footer uniqueness
const header = fs.readFileSync("_crawl/header.html", "utf8");
const footer = fs.readFileSync("_crawl/footer.html", "utf8");
console.log("header===footer", header === footer);
console.log("header has location-header", header.includes("location-header"));
console.log("footer has location-footer", footer.includes("location-footer"));
console.log("header snippet", header.slice(0, 300));

// Look for elementor locations
for (const key of ["elementor-location-header", "elementor-location-footer", 'data-elementor-id="153"', 'data-elementor-id="158"', 'data-elementor-id="10"']) {
  console.log(key, html.includes(key), "idx", html.indexOf(key));
}

// Try fetching without rocket - use ?nowprocket=1
const urls = [
  `${ORIGIN}/?nowprocket=1`,
  `${ORIGIN}/wp-content/uploads/elementor/css/post-10.css`,
  `${ORIGIN}/wp-content/uploads/elementor/css/post-153.css`,
  `${ORIGIN}/wp-content/uploads/elementor/css/post-158.css`,
  `${ORIGIN}/wp-content/uploads/elementor/css/post-19.css`,
  `${ORIGIN}/wp-content/themes/hello-elementor/style.min.css`,
  `${ORIGIN}/wp-content/themes/hello-elementor/theme.min.css`,
  `${ORIGIN}/wp-content/themes/hello-elementor/header-footer.min.css`,
  `${ORIGIN}/wp-content/plugins/elementor/assets/css/frontend.min.css`,
  `${ORIGIN}/wp-content/plugins/elementor-pro/assets/css/frontend.min.css`,
  `${ORIGIN}/wp-content/plugins/elementor/assets/css/widget-image.min.css`,
];

async function main() {
  const found = [];
  for (const u of urls) {
    try {
      const res = await fetch(u, { headers: { "User-Agent": "Mozilla/5.0" } });
      console.log(res.status, u, res.headers.get("content-type"));
      if (res.ok) {
        const text = await res.text();
        if (u.includes("nowprocket")) {
          fs.writeFileSync("_crawl/homepage-nowprocket.html", text);
          const hrefs = [...text.matchAll(/href=(["'])(.*?)\1/g)].map((m) => m[2]).filter((x) => x.includes(".css"));
          console.log("nowprocket css", hrefs.length);
          hrefs.forEach((h) => console.log(" ", h));
          found.push(...hrefs);
        } else if (u.includes(".css")) {
          const dest = path.join("public", new URL(u).pathname.replace(/^\//, ""));
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          fs.writeFileSync(dest, text);
          found.push(u.replace(ORIGIN, ""));
          console.log(" saved", dest, text.length);
        }
      }
    } catch (e) {
      console.log("fail", u, e.message);
    }
  }
  fs.writeFileSync("_crawl/css-found.json", JSON.stringify([...new Set(found)], null, 2));
}

main();
