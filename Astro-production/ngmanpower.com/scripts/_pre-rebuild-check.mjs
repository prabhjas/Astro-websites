const h = await (await fetch("http://127.0.0.1:5102/")).text();
console.log("BEFORE rebuild check — will rebuild next");
console.log("wpcp public js linked", h.includes("wp-carousel-free-public.min.js"));
console.log("carousel 439 css", h.includes("wp-carousel-439-inline.css"));
console.log("live-additional", h.includes("live-additional-home.css"));
console.log("ss home fix", h.includes("smartslider-home-fix.css"));
