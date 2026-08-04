import fs from "node:fs";

async function fetchLive(path) {
  const res = await fetch(`https://eormiddleast.com${path}?nowprocket=1`, {
    headers: { "User-Agent": "EOR-Compare/1.0" },
  });
  return res.text();
}

function summarizeForms(html, label) {
  const forms = [...html.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/gi)].map((m) => {
    const tag = m[0].match(/<form\b[^>]*>/i)?.[0] || "";
    const cls = tag.match(/class="([^"]*)"/i)?.[1] || "";
    const names = [...m[0].matchAll(/name="([^"]+)"/gi)].map((x) => x[1]);
    return {
      class: cls.slice(0, 80),
      names: [...new Set(names)].slice(0, 25),
      hasRecaptcha: /recaptcha/i.test(m[0]),
      hasPhonetext: /phonetext|type="tel"/i.test(m[0]),
      hasElementorForm: /elementor-form/i.test(m[0]),
      hasWpcf7: /wpcf7/i.test(m[0]),
    };
  });
  console.log(`\n=== ${label} forms (${forms.length}) ===`);
  console.log(JSON.stringify(forms, null, 2));
  console.log({
    licence: /LICENSE DETAILS|License Details|S & P HEAVY/i.test(html),
    transactionHide: (html.match(/transaction_hide/g) || []).length,
    gclidVisibleHint: /placeholder="No Tag"/i.test(html),
    floatWhatsapp: /wa\.me|whatsapp/i.test(html),
    title: html.match(/<title>([^<]+)/i)?.[1],
  });
}

const homeLive = await fetchLive("/");
const contactLive = await fetchLive("/contact-us/");
fs.writeFileSync("tmp-eor-sitemaps/live-home.html", homeLive);
fs.writeFileSync("tmp-eor-sitemaps/live-contact.html", contactLive);
summarizeForms(homeLive, "LIVE HOME");
summarizeForms(contactLive, "LIVE CONTACT");

const pages = JSON.parse(
  fs.readFileSync("Astro-production/eormiddleast.com/src/data/pages.json", "utf8"),
);
summarizeForms(pages.find((p) => p.path === "/")?.bodyHtml || "", "LOCAL HOME BODY");
summarizeForms(pages.find((p) => p.path === "/contact-us/")?.bodyHtml || "", "LOCAL CONTACT BODY");
