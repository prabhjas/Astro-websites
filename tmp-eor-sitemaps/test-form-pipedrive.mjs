const BASE = "http://127.0.0.1:5084";

async function post(body) {
  const res = await fetch(`${BASE}/api/contact/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

console.log("--- geo ---");
const geo = await fetch(`${BASE}/api/geo/`);
console.log(geo.status, await geo.json());

console.log("--- invalid name with digits ---");
console.log(
  await post({
    sub: "John123",
    sub2: "test@example.com",
    "phonetext-725": "+971501234567",
    sub5: "Hello",
    form_name: "EOR Middle East Contact Form",
    page_url: `${BASE}/contact-us/`,
    submission_id: crypto.randomUUID(),
  }),
);

console.log("--- invalid email ---");
console.log(
  await post({
    sub: "John Doe",
    sub2: "not-an-email",
    "phonetext-725": "+971501234567",
    sub5: "Hello",
    form_name: "EOR Middle East Contact Form",
    page_url: `${BASE}/contact-us/`,
    submission_id: crypto.randomUUID(),
  }),
);

console.log("--- invalid phone letters ---");
console.log(
  await post({
    sub: "John Doe",
    sub2: "test@example.com",
    "phonetext-725": "abc123",
    sub5: "Hello",
    form_name: "EOR Middle East Contact Form",
    page_url: `${BASE}/contact-us/`,
    submission_id: crypto.randomUUID(),
  }),
);

console.log("--- valid EOR fields -> Pipedrive ---");
const ok = await post({
  sub: "Fleet Test User",
  sub2: "fleet-test@example.com",
  "phonetext-725": "+971501234567",
  "phonetext-725-country-code": "ae",
  "countrytext-787": "United Arab Emirates",
  sub5: "Local fleet Pipedrive smoke test — please ignore.",
  form_name: "EOR Middle East Contact Form",
  page_url: `${BASE}/contact-us/`,
  initial_url: `${BASE}/contact-us/`,
  submission_id: crypto.randomUUID(),
  submitted_at: new Date().toISOString(),
});
console.log(JSON.stringify(ok, null, 2));

console.log("--- contact page ---");
const page = await fetch(`${BASE}/contact-us/`);
console.log(page.status);
const html = await page.text();
console.log({
  hasCf7: html.includes("wpcf7-form"),
  hasPhoneFlags: html.includes("phone-flags.js"),
  hasBridge: html.includes("cf7-bridge.js"),
  hasIntlCss: html.includes("intlTelInput.min.css"),
  hasCountryCss: html.includes("countrySelect.min.css"),
  hasPhonetext: html.includes("phonetext-725"),
});
