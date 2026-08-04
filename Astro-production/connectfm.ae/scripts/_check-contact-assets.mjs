import fs from "node:fs";
import path from "node:path";

const needed = [
  "public/wp-content/uploads/elementor/css/custom-frontend.min.css",
  "public/wp-content/uploads/elementor/css/post-10.css",
  "public/wp-content/uploads/elementor/css/post-14.css",
  "public/wp-content/uploads/elementor/css/post-57.css",
  "public/wp-content/uploads/elementor/css/post-1494.css",
  "public/wp-content/plugins/elementor/assets/css/frontend.min.css",
  "public/wp-content/themes/hello-elementor/theme.min.css",
  "public/wp-content/themes/hello-elementor/header-footer.min.css",
  "public/wp-content/uploads/elementor/google-fonts/css/manrope.css",
  "public/wp-content/uploads/elementor/google-fonts/css/plusjakartasans.css",
  "public/wp-content/uploads/elementor/google-fonts/css/poppins.css",
  "public/wp-content/plugins/elementor-pro/assets/css/widget-nav-menu.min.css",
  "public/wp-content/uploads/elementor/css/custom-pro-widget-nav-menu.min.css",
  "public/wp-content/plugins/country-phone-field-contact-form-7/assets/css/intlTelInput.min.css",
  "public/wp-content/uploads/2024/07/contact-img.webp",
];

for (const p of needed) {
  const ok = fs.existsSync(p);
  console.log(ok ? "OK" : "MISS", p, ok ? fs.statSync(p).size : "");
}

const local = await (await fetch("http://127.0.0.1:5092/contact-us/")).text();
const hrefs = [...local.matchAll(/<link[^>]+href=["']([^"']+)["']/gi)].map((m) => m[1].split("?")[0]);
console.log("\nstylesheet count", hrefs.length);
const missingLinked = hrefs.filter((h) => h.startsWith("/") && !fs.existsSync(path.join("public", h.replace(/^\//, ""))));
console.log("missing linked css", missingLinked.slice(0, 40));

const kit = fs.readFileSync("public/wp-content/uploads/elementor/css/post-10.css", "utf8");
console.log("\nkit has --e-global-color-primary", kit.includes("--e-global-color-primary"));
console.log("kit has Manrope", kit.includes("Manrope"));
console.log("kit size", kit.length);
