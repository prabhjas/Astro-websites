const cat = await (await fetch('http://127.0.0.1:5106/category/emiratisation/')).text();
console.log({
  inlineCatCss: /data-astro-cat-ui-css/.test(cat),
  greenAccent: /accent-color:var\(--ast-global-color-0/.test(cat),
  currentGreen: /page-numbers\.current\{[^}]*#628c62|background-color:var\(--ast-global-color-0/.test(cat),
});

// Contact form presence + phone flag assets on contact + post
for (const p of ['/contact-us/', '/minimum-wage-in-uae/']) {
  const html = await (await fetch('http://127.0.0.1:5106' + p)).text();
  console.log(p, {
    phone: /wpcf7-phonetext|cg-phone-input/.test(html),
    intlCss: /intlTelInput/.test(html),
    message: /your-message|name=["']message["']/.test(html),
    name: /your-name|name=["']name["']/.test(html),
    mirror: /astro-mirror-fixes/.test(html),
  });
}
