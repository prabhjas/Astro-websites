const html = await (await fetch('http://127.0.0.1:5107/')).text();
const m = html.match(/<form[^>]*class="[^"]*wpcf7-form[^"]*"[\s\S]*?<\/form>/i);
if (!m) {
  console.log('no form');
  process.exit(1);
}
const form = m[0];
console.log('form length', form.length);
const names = [...form.matchAll(/\bname="([^"]+)"/gi)].map((x) => x[1]);
console.log('fields', names);
console.log('has subject', /your-subject|name="subject"/.test(form));
console.log('has company', /company/.test(form));
console.log('has honeypot', /honeypot|website|url-78|akismet/.test(form));
console.log('has experience', /experience/.test(form));
// Print input/textarea snippets
for (const tag of ['input', 'textarea', 'select']) {
  const re = new RegExp(`<${tag}\\b[^>]*>`, 'gi');
  let mm;
  while ((mm = re.exec(form))) {
    const s = mm[0];
    if (/type="hidden"/i.test(s) && /(_wpcf7|utm_|gclid|submission|page_url|referrer|form_)/i.test(s)) continue;
    console.log(s.slice(0, 220));
  }
}
