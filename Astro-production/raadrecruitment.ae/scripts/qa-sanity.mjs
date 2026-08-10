const home = await (await fetch("http://127.0.0.1:5102/")).text();
const contact = await (await fetch("http://127.0.0.1:5102/contact/")).text();
console.log({
  homeJquery: home.includes("/wp-includes/js/jquery/jquery.min.js"),
  homeBootstrap: home.includes("oklahoma/js/bootstrap.min.js"),
  homeModeltheme: home.includes("modeltheme-framework/js/mt-plugins.js"),
  homeOldDatatech: home.includes("datatech/assets/js/owl"),
  homeMobileCss: home.includes("ngmanpower-mobile-nav.css"),
  homeHello: home.includes("hello-elementor"),
  contactForm: /wpcf7-form/.test(contact),
  logoHref: /logo[\s\S]{0,160}href="\/"/.test(home),
});
const css = [...home.matchAll(/href="([^"]+\.css)"/g)].map((m) => m[1]);
let miss = 0;
for (const c of css) {
  const r = await fetch("http://127.0.0.1:5102" + c, { method: "HEAD" });
  if (!r.ok) {
    miss++;
    console.log("404", c, r.status);
  }
}
console.log("cssTotal", css.length, "css404", miss);
const js = [...home.matchAll(/src="([^"]+\.js)"/g)].map((m) => m[1]).filter((u) => u.startsWith("/"));
let jsMiss = 0;
for (const s of js) {
  if (s.startsWith("/_astro/")) continue;
  const r = await fetch("http://127.0.0.1:5102" + s, { method: "HEAD" });
  if (!r.ok) {
    jsMiss++;
    console.log("js404", s, r.status);
  }
}
console.log("jsLocal", js.length, "js404", jsMiss);
