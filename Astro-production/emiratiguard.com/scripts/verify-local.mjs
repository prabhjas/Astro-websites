const t = await (await fetch("http://127.0.0.1:4321/")).text();
console.log("wp-custom", t.includes("/css/wp-custom.css"));
console.log("elementor header", t.includes("elementor-location-header"));
console.log("custom header gone", !t.includes('class="sp-header"'));
console.log("post-10", t.includes("post-10.css"));
console.log("body", t.match(/<body[^>]+>/)?.[0]);
console.log("styles", (t.match(/rel="stylesheet"/g) || []).length);
console.log("has hero section id", t.includes("elementor-element-03d063d"));
console.log("has overlay", t.includes("elementor-background-overlay"));
