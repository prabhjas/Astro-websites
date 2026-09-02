const html = await (await fetch('http://127.0.0.1:4332/blog/')).text();
console.log('length', html.length);
console.log('starts', html.slice(0, 200));
console.log('has body class', html.includes('page-id-1199'));
console.log('body tag', html.match(/<body[^>]*>/i)?.[0]?.slice(0, 120));
console.log('html tag', html.match(/<html[^>]*>/i)?.[0]);
