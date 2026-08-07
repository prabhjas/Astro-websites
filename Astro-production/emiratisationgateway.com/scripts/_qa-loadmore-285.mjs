const html = await (await fetch('http://127.0.0.1:5106/blog/')).text();
console.log({
  hasPost285: /post-285\.css/.test(html),
  has217b60e: /217b60e/.test(html),
  btnSnippet: (html.match(/ecs-load-more-button[\s\S]{0,250}/) || [])[0],
});
const css = await (await fetch('http://127.0.0.1:5106/wp-content/uploads/elementor/css/post-285.css')).text();
const rule = css.match(/217b60e[\s\S]{0,350}/);
console.log('css rule', rule && rule[0].slice(0, 350));
