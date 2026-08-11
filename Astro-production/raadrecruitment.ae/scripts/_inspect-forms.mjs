const urls = ["http://127.0.0.1:5113/contact-us/", "http://127.0.0.1:5113/"];
for (const url of urls) {
  const r = await fetch(url);
  const html = await r.text();
  console.log("\n====", url, r.status);
  const forms = [...html.matchAll(/<form[\s\S]*?<\/form>/gi)];
  console.log("forms", forms.length);
  for (const [i, m] of forms.entries()) {
    const f = m[0];
    if (!/wpcf7|contact|your-email|phonetext|first-name|sub2/i.test(f)) continue;
    console.log("--- form", i, "len", f.length);
    const names = [...f.matchAll(/\bname=["']([^"']+)["']/gi)].map((x) => x[1]);
    console.log("fields", names);
    const action = f.match(/action=["']([^"']*)["']/i)?.[1];
    const cls = f.match(/class=["']([^"']*)["']/i)?.[1];
    console.log({ action, cls: cls?.slice(0, 120) });
  }
}
