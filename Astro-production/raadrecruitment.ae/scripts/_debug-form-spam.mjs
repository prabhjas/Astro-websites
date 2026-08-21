const html = await (await fetch("http://127.0.0.1:5113/contact-us/")).text();
const form = html.match(/<form[\s\S]*?<\/form>/i)?.[0] || "";
const inputs = [...form.matchAll(/<input[^>]*>/gi)].map((m) => m[0]);
for (const inp of inputs) {
  const type = (inp.match(/\btype=["']([^"']+)/i) || [])[1] || "text";
  const name = (inp.match(/\bname=["']([^"']+)/i) || [])[1] || "";
  const val = (inp.match(/\bvalue=["']([^"']*)/i) || [])[1] || "";
  if (/hidden/i.test(type) || !name) continue;
  console.log({ type, name, val: val.slice(0, 80) });
}
console.log("--- text-like including hidden with url-ish ---");
for (const inp of inputs) {
  const type = (inp.match(/\btype=["']([^"']+)/i) || [])[1] || "";
  const name = (inp.match(/\bname=["']([^"']+)/i) || [])[1] || "";
  const val = (inp.match(/\bvalue=["']([^"']*)/i) || [])[1] || "";
  if (/https?:|www\.|\.com/i.test(val) || /url|gclid|page|referrer|landing|initial/i.test(name)) {
    console.log({ type, name, val: val.slice(0, 120) });
  }
}

// Reproduce fieldContainsLink logic
function fieldContainsLink(value) {
  const text = String(value || "");
  if (!text) return false;
  return (
    /https?:\/\//i.test(text) ||
    /www\./i.test(text) ||
    /\b[a-z0-9.-]+\.(com|net|org|io|co|info|biz|xyz|online|site|ru|cn)\b/i.test(text) ||
    /\[[^\]]+\]\([^)]+\)/.test(text) ||
    /<a\s/i.test(text)
  );
}
for (const sample of ["test Mushtaq", "test@gmail.com", "test", "Staff Outsourcing", "http://127.0.0.1:5113/"]) {
  console.log("link?", sample, fieldContainsLink(sample));
}
