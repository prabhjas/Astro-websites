const base = "http://127.0.0.1:5103";

async function head(url) {
  const res = await fetch(url, { redirect: "manual" });
  return {
    status: res.status,
    location: res.headers.get("location") || "",
  };
}

async function code(url) {
  const res = await fetch(url, { redirect: "manual" });
  return res.status;
}

function ok(label, pass, detail = "") {
  console.log(`${pass ? "PASS" : "FAIL"}  ${label}${detail ? "  " + detail : ""}`);
  return pass;
}

let fails = 0;
const check = (label, pass, detail) => {
  if (!ok(label, pass, detail)) fails += 1;
};

const bareAbout = await head(`${base}/about-us`);
check(
  "trailing slash redirect /about-us",
  [301, 302, 307, 308].includes(bareAbout.status) && /\/about-us\/?$/.test(bareAbout.location),
  `${bareAbout.status} ${bareAbout.location}`,
);
check("about-us/ 200", (await code(`${base}/about-us/`)) === 200);
check("runtime-gtm.js 200", (await code(`${base}/runtime-gtm.js`)) === 200);

const home = await (await fetch(`${base}/`)).text();
const canon = home.match(/rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1]
  || home.match(/href=["']([^"']+)["'][^>]*rel=["']canonical["']/i)?.[1]
  || "";
check("canonical absolute https", /^https:\/\/emiratiguard\.com\/?$/.test(canon), canon);
check("robots 200", (await code(`${base}/robots.txt`)) === 200);
check("sitemap_index 200", (await code(`${base}/sitemap_index.xml`)) === 200);
check("llms 200", (await code(`${base}/llms.txt`)) === 200);

const robots = await (await fetch(`${base}/robots.txt`)).text();
check("robots this domain only", /emiratiguard\.com/.test(robots) && !/c-uae\.com/.test(robots));

check("gtm loader marker", /data-runtime-gtm="1"|sp-gtm-ssr/.test(home));
const gtm = await (await fetch(`${base}/runtime-gtm.js`)).text();
check("recreateScript", /recreateScript/.test(gtm));
const ids = [...gtm.matchAll(/GTM-[A-Z0-9]+|G-[A-Z0-9]+/g)].map((m) => m[0]);
check("no placeholder GTM ids", !ids.some((id) => /AAAA|XXXX/.test(id)), ids.join(",") || "(none)");

const nf = await (await fetch(`${base}/this-page-does-not-exist-eg/`)).text();
check(
  "404 brand",
  /Emirati Guard/.test(nf) &&
    /logo-horizontal-emiratiguard/.test(nf) &&
    !/Connect UAE|c-uae\.com/.test(nf),
);
check("home VC content", /Emirati Guard/.test(home) && /vce-row/.test(home));
check("home logo", /logo-horizontal-emiratiguard/.test(home));

const contact = await fetch(`${base}/api/contact/`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Origin: base,
  },
  body: JSON.stringify({
    name: "Smoke Attr",
    email: "smoke@example.com",
    phone: "+971501111111",
    message: "attr test",
    pageUrl: `${base}/contact-us/?gclid=test123&campaignid=1&device=m`,
    gclid: "test123",
    campaignid: "1",
    device: "m",
  }),
});
const contactBody = await contact.text();
check("contact attr submit", contact.status === 200 && /success":true/.test(contactBody), String(contact.status));

console.log(fails === 0 ? "\nPHASE 10 LOOPBACK: PASS" : `\nPHASE 10 LOOPBACK: ${fails} FAIL(S)`);
process.exit(fails === 0 ? 0 : 1);
