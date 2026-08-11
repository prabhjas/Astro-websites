const html = await (await fetch("http://127.0.0.1:5113/")).text();
const forms = [...html.matchAll(/<form[\s\S]*?<\/form>/gi)].map((m) => m[0]);
console.log("forms", forms.length);
for (const [i, f] of forms.entries()) {
  if (!/wpcf7|your-email/i.test(f)) continue;
  console.log("FORM", i);
  for (const m of f.matchAll(/<(input|textarea|select)([^>]*)>/gi)) {
    const tag = m[1];
    const attrs = m[2];
    const type =
      (attrs.match(/\btype=["']([^"']+)/i) || [])[1] ||
      (tag === "textarea" ? "textarea" : tag === "select" ? "select" : "text");
    const name = (attrs.match(/\bname=["']([^"']+)/i) || [])[1] || "";
    const val = (attrs.match(/\bvalue=["']([^"']*)/i) || [])[1] || "";
    console.log(JSON.stringify({ tag, type, name, val: val.slice(0, 100) }));
  }
}

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

// Simulate filled form values
const filled = {
  "your-name": "test Mushtaq",
  "your-email": "test@gmail.com",
  "phonetext-11": "423432432",
  "countrytext-787": "Pakistan",
  "your-message": "test",
  "selct_multiselct-995[]": "Staff Outsourcing",
  initial_url: "http://127.0.0.1:5113/",
  page_url: "http://127.0.0.1:5113/",
  landing_page_url: "http://127.0.0.1:5113/",
};
for (const [k, v] of Object.entries(filled)) {
  console.log("wouldTrip", k, fieldContainsLink(v), v);
}
