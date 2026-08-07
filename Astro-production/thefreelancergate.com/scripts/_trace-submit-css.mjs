const html = await (await fetch("http://127.0.0.1:5092/contact-us/")).text();
const hrefs = [...html.matchAll(/href=["']([^"']+\.css[^"']*)["']/gi)].map((m) => m[1].split("?")[0]);
const childIdx = hrefs.findIndex((h) => h.includes("hello-elementor-child-theme/style.css"));
const wpCustomIdx = hrefs.findIndex((h) => h.includes("/css/wp-custom.css"));
const post57Idx = hrefs.findIndex((h) => h.includes("post-57.css"));
console.log({ childIdx, wpCustomIdx, post57Idx, total: hrefs.length });
console.log("around child", hrefs.slice(Math.max(0, childIdx - 2), childIdx + 5));

const childCss = await (await fetch("http://127.0.0.1:5092/wp-content/themes/hello-elementor-child-theme/style.css")).text();
console.log("served child len", childCss.length, "has purple submit", childCss.includes("background:#3D1457"));

// Find all rules that set background on submit by checking linked sheets that mention FFDD04 or 3D1457 near submit
for (const h of hrefs) {
  if (!h.startsWith("/")) continue;
  try {
    const css = await (await fetch(`http://127.0.0.1:5092${h}`)).text();
    if (/wpcf7-submit|\[type=submit\]|\[type=\"submit\"\]/.test(css) && /FFDD04|3D1457|255,\s*221|#ffd/i.test(css)) {
      console.log("MATCH", h);
      const bits = [...css.matchAll(/[^}]*?(?:wpcf7-submit|\[type=submit\])[^}]*\{[^}]+\}/gi)].map((m) => m[0].slice(0, 180));
      console.log(bits.slice(0, 6));
    }
  } catch {
    /* skip */
  }
}
