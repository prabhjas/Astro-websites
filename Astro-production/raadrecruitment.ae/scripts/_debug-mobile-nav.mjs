const html = await (await fetch("http://127.0.0.1:5113/")).text();
const m = html.match(/<header[^>]*id="masthead"[\s\S]*?(?=<div id="content"|id="content")/);
if (!m) {
  console.log("no masthead");
  process.exit(0);
}
const h = m[0];
console.log("masthead block len", h.length);
console.log("has ast-mobile-header", h.includes('id="ast-mobile-header"'));
console.log("has menu-toggle", h.includes("main-header-menu-toggle"));
console.log("data-type", (h.match(/id="ast-mobile-header"[^>]*data-type="([^"]+)"/) || [])[1]);

// Check if Astra selector #masthead > #ast-mobile-header would match
// Extract open tags path to mobile header
const mi = h.indexOf('id="ast-mobile-header"');
const before = h.slice(0, mi);
let depth = 0;
const stack = [];
const re = /<\/?([a-zA-Z0-9-]+)(\s[^>]*)?>/g;
let match;
while ((match = re.exec(before))) {
  const full = match[0];
  const tag = match[1].toLowerCase();
  if (full.startsWith("</")) {
    depth--;
    stack.pop();
  } else if (!full.endsWith("/>") && !["br", "img", "input", "meta", "link", "hr", "svg", "path"].includes(tag)) {
    depth++;
    stack.push(tag + (full.includes("id=") ? full.match(/id="([^"]+)"/)?.[0] || "" : ""));
  }
}
console.log("depth before mobile header", depth);
console.log("parent chain tip", stack.slice(-8));

// Visibility CSS clues from rendered page - check if content has display none styles
const contentMatch = h.match(/ast-mobile-header-content[^"]*"[^>]*/);
console.log("mobile content open tag", contentMatch?.[0]?.slice(0, 200));

// Does frontend.js load before our mobile nav?
const scripts = [...html.matchAll(/src="([^"]*(?:frontend|mobile-nav)[^"]*)"/g)].map((x) => x[1]);
console.log("nav-related scripts order", scripts);
