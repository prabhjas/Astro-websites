import { readFileSync, existsSync } from "fs";
const h = readFileSync("src/legacy/homepage.cleaned.html","utf8");
console.log("class=slider-sec", /class="[^"]*slider-sec/.test(h));
console.log("slider-sec in class attr count", [...h.matchAll(/class="[^"]*slider-sec[^"]*"/g)].length);
const hits = [...h.matchAll(/class="([^"]*(?:slider|carousel|marquee|clients|logo-slider)[^"]*)"/gi)].map(m=>m[1]);
console.log("related classes", [...new Set(hits)].slice(0,50));
console.log("ecs-slider", existsSync("public/wp-content/plugins/ele-custom-skin/modules/container-layout/assets/js/ecs-slider.js"));
console.log("image-carousel chunk", existsSync("public/wp-content/plugins/elementor/assets/js/image-carousel.6167d20b95b33386757b.bundle.min.js"));
// nested carousel live hash
console.log("nested live hash", existsSync("public/wp-content/plugins/elementor-pro/assets/js/nested-carousel.659b0373371215e60dab.bundle.min.js"));
