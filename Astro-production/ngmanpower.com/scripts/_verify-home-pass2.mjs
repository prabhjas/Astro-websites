const base = "http://127.0.0.1:5102";
await new Promise((r) => setTimeout(r, 1500));
const h = await (await fetch(base + "/")).text();

const checks = {
  "wpcp public js": h.includes("wp-carousel-free-public.min.js"),
  "wpcp swiper bundle": h.includes("wp-carousel-free/public/js/swiper-bundle"),
  "carousel 439 css": h.includes("wp-carousel-439-inline.css"),
  "live-additional css": h.includes("live-additional-home.css"),
  "ss home fix css": h.includes("smartslider-home-fix.css"),
  "ss init": h.includes("smartslider-n2-ss-2-init.js"),
  "migration overrides": h.includes("migration-overrides.css"),
  "logo Synergy": h.includes("logo-Synergy.png"),
  "stats 17000": h.includes("17000") || h.includes("17,000"),
  "consultation": h.includes("Request a Consultation"),
  "Gary testimonial": h.includes("Gary H"),
  "icon govt svg": h.includes("icon-govt-authorized.svg"),
};

console.log(checks);

for (const p of [
  "/css/wp-carousel-439-inline.css",
  "/css/live-additional-home.css",
  "/css/smartslider-home-fix.css",
  "/css/migration-overrides.css",
  "/wp-content/plugins/wp-carousel-free/public/js/wp-carousel-free-public.min.js",
  "/wp-content/plugins/wp-carousel-free/public/js/swiper-bundle.min.js",
]) {
  const r = await fetch(base + p);
  console.log(r.status, p);
}
