const html = await (await fetch('http://127.0.0.1:5106/blog/')).text();
console.log({
  mirror: (html.match(/astro-mirror-fixes\.js\?v=[^"']+/) || [])[0],
  blogCss: /data-astro-blog-cat-css/.test(html),
  blackCss: /color:#000/.test(html),
  hideUncat: /data-value="1"/.test(html),
  cuscatBtn: /cuscat \.astro-cat-select__btn/.test(html),
});
