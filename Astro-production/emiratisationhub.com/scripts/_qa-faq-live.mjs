const live = await (await fetch('/')).text();
const i = live.indexOf('Frequently Asked Questions');
const chunk = live.slice(i, i + 3000);
console.log('live has accordion-icon?', /accordion-icon/.test(chunk));
console.log(chunk.replace(/\s+/g, ' ').slice(0, 1200));

// CSS for faq icons
const cssMatch = [...live.matchAll(/href=['"]([^'"]*post-1107[^'"]*)['"]/g)].map((m) => m[1]);
console.log('post-1107', cssMatch[0]);
