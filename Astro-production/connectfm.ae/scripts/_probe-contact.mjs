const local = await fetch("http://127.0.0.1:5092/contact-us/");
const html = await local.text();
console.log("local status", local.status, "len", html.length);
console.log("ready", html.includes("Are you Ready"));
console.log("contact now", html.includes("Contact Us Now"));
console.log("wpcf7", html.includes("wpcf7"));
console.log("cf7-bridge", html.includes("cf7-bridge"));
console.log("post-1494", html.includes("post-1494.css"));
console.log("post-14.css", html.includes("post-14.css"));
const imgs = [...html.matchAll(/src=["']([^"']+)["']/g)]
  .map((m) => m[1])
  .filter((u) => /uploads/i.test(u))
  .slice(0, 20);
console.log("upload imgs", imgs);
const fs = await import("node:fs");
const cssPath = "public/wp-content/uploads/elementor/css/post-1494.css";
console.log("css exists", fs.existsSync(cssPath), fs.existsSync(cssPath) ? fs.statSync(cssPath).size : 0);
