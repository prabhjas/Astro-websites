/**
 * Injects the Connect Freelance licence & verification band into every legacy
 * footer (cleaned pages + chrome + archive shells).
 *
 * Legacy pages are served from src/legacy at runtime, and each page carries its
 * own copy of the Elementor footer — so the band has to be written into each
 * file. This script is the single place that happens.
 *
 * Source of truth: src/data/licence.json. Edit that, re-run this, reload.
 * Idempotent: re-running replaces the existing band rather than stacking.
 *
 *   node scripts/apply-licence-strip.mjs           # apply
 *   node scripts/apply-licence-strip.mjs --revert  # remove the band again
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REVERT = process.argv.includes("--revert");

const licence = JSON.parse(readFileSync(join(ROOT, "src/data/licence.json"), "utf8"));

const CSS_HREF = "/css/cf-licence.css?v=3";
const CSS_MARK = "data-cf-licence-css";
const BAND_START = "<!-- cf-licence:start -->";
const BAND_END = "<!-- cf-licence:end -->";
const COPYRIGHT_MARK = "elementor-element-8c2c697";

function formatLicenceDate(value) {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!iso) return value;
  return `${iso[3]}/${iso[2]}/${iso[1]}`;
}

const rows = [
  { label: "License Status", value: licence.status, badge: true },
  { label: "License Number", value: licence.number },
  { label: "Business Name", value: licence.businessName },
  { label: "License Type", value: licence.type },
  { label: "Issuing Authority", value: licence.issuingAuthority },
  { label: "Legal Type", value: licence.legalType },
  { label: "Issue Date", value: licence.issueDate ? formatLicenceDate(licence.issueDate) : "" },
].filter((r) => r.value);

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const SITE_ORIGIN = "https://connectfreelance.ae";

const pdfReady =
  Boolean(licence.pdfPath) &&
  existsSync(join(ROOT, "public", String(licence.pdfPath).replace(/^\//, "")));

function buildOrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": ["Organization", "LocalBusiness"],
    "@id": `${SITE_ORIGIN}/#organization`,
    name: "Connect Freelance",
    legalName: licence.businessName,
    url: SITE_ORIGIN,
    identifier: {
      "@type": "PropertyValue",
      name: "DET Trade Licence Number",
      value: licence.number,
    },
    hasCredential: {
      "@type": "EducationalOccupationalCredential",
      name: `${licence.type || "Trade"} Trade Licence ${licence.number}`,
      ...(licence.type ? { credentialCategory: licence.type } : {}),
      identifier: licence.number,
      ...(licence.issueDate ? { dateCreated: licence.issueDate } : {}),
      url: licence.verifyUrl,
      recognizedBy: {
        "@type": "GovernmentOrganization",
        name: licence.issuingAuthority,
        url: "https://www.dubaided.gov.ae/",
      },
    },
    ...(licence.address
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: licence.address,
            addressCountry: "AE",
            addressRegion: "Dubai",
          },
        }
      : {}),
  };
  const json = JSON.stringify(schema).replace(/<\//g, "<\\/");
  return `<script type="application/ld+json">${json}</script>`;
}

function buildBand() {
  const rowHtml = rows
    .map(
      (r) => `        <div class="cf-licence__row">
          <dt>${esc(r.label)}</dt>
          <dd>${r.badge ? `<span class="cf-licence__badge">${esc(r.value)}</span>` : esc(r.value)}</dd>
        </div>`,
    )
    .join("\n");

  const pdfBtn = pdfReady
    ? `
        <a class="cf-licence__btn cf-licence__btn--ghost" href="${esc(licence.pdfPath)}" target="_blank" rel="noopener noreferrer">
          Click here to view the license
        </a>`
    : "";

  return `${BAND_START}
${buildOrganizationSchema()}
<section class="cf-licence" aria-labelledby="cf-licence-title">
  <div class="cf-licence__inner">
    <h2 class="cf-licence__title" id="cf-licence-title">License Details</h2>
    <p class="cf-licence__lead"><strong>${esc(licence.businessName)}</strong> is fully licensed in Dubai, UAE by the ${esc(licence.issuingAuthority)}.</p>
    <dl class="cf-licence__grid">
${rowHtml}
    </dl>
    <div class="cf-licence__verify">
      <a class="cf-licence__qr" href="${esc(licence.verifyUrl)}" target="_blank" rel="noopener noreferrer nofollow" aria-label="Verify licence ${esc(licence.number)} on the official Dubai licence portal">
        <img src="${esc(licence.qrPath)}" width="150" height="150" loading="lazy" decoding="async" alt="QR code linking to the official Dubai portal for verifying licence ${esc(licence.number)}" />
      </a>
      <p class="cf-licence__qr-caption">Scan to verify on the official Dubai licence portal</p>
    </div>
    <div class="cf-licence__actions">
      <a class="cf-licence__btn cf-licence__btn--primary" href="${esc(licence.verifyUrl)}" target="_blank" rel="noopener noreferrer nofollow">
        Verify our license
      </a>${pdfBtn}
    </div>
  </div>
</section>
${BAND_END}`;
}

function stripBand(html) {
  const s = html.indexOf(BAND_START);
  const e = html.indexOf(BAND_END);
  if (s < 0 || e < 0) return html;
  return html.slice(0, s) + html.slice(e + BAND_END.length);
}

/** Match the design: last quick link is Freelance Permit, not FAQ's. */
function rewriteQuickLinks(html) {
  return html.replace(
    /href="\/faqs\/"([^>]*>\s*<span class="elementor-icon-list-text">)FAQ'?s(<\/span>)/gi,
    'href="/freelance-license-in-dubai/"$1Freelance Permit$2',
  );
}

function restoreQuickLinks(html) {
  return html.replace(
    /href="\/freelance-license-in-dubai\/"([^>]*>\s*<span class="elementor-icon-list-text">)Freelance Permit(<\/span>)/gi,
    'href="/faqs/"$1FAQ\'s$2',
  );
}

function rewriteFooterEmail(html) {
  return html.replace(
    /(<div class="elementor-element elementor-element-a88b7f8[\s\S]*?<p class="elementor-heading-title elementor-size-default">)[\s\S]*?(<\/p>)/i,
    '$1<a href="mailto:contact@connectfreelance.ae">contact@connectfreelance.ae</a>$2',
  );
}

function apply(html) {
  let out = stripBand(html);
  out = rewriteQuickLinks(out);
  out = rewriteFooterEmail(out);

  const linkTag = `<link rel="stylesheet" href="${CSS_HREF}" ${CSS_MARK}="1" />`;
  out = out.replace(
    new RegExp(`<link rel="stylesheet" href="/css/cf-licence\\.css[^"]*" ${CSS_MARK}="1" />\\s*`, "g"),
    "",
  );
  if (/<\/head>/i.test(out)) {
    out = out.replace(/<\/head>/i, `${linkTag}\n</head>`);
  }

  const band = (/<\/head>/i.test(out) ? "" : `${linkTag}\n`) + buildBand();

  const copyIdx = out.lastIndexOf(COPYRIGHT_MARK);
  if (copyIdx >= 0) {
    const sectionStart = out.lastIndexOf("<section", copyIdx);
    if (sectionStart >= 0) {
      return out.slice(0, sectionStart) + band + "\n" + out.slice(sectionStart);
    }
  }

  const footerIdx = out.lastIndexOf("</footer>");
  if (footerIdx >= 0) return out.slice(0, footerIdx) + band + "\n" + out.slice(footerIdx);
  if (/<\/body>/i.test(out)) return out.replace(/<\/body>/i, `${band}\n</body>`);
  return out + band;
}

function revert(html) {
  let out = stripBand(html);
  out = restoreQuickLinks(out);
  out = out.replace(/\s*<link rel="stylesheet" href="\/css\/cf-licence\.css[^"]*" data-cf-licence-css="1" \/>/g, "");
  return out;
}

function listHtmlFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) return listHtmlFiles(p);
    return entry.name.endsWith(".cleaned.html") || entry.name === "template.html" || entry.name === "footer.html"
      ? [p]
      : [];
  });
}

const targets = [
  ...listHtmlFiles(join(ROOT, "src/legacy")),
  join(ROOT, "public/chrome/footer.html"),
].filter((p, i, all) => existsSync(p) && all.indexOf(p) === i);

let changed = 0;
for (const file of targets) {
  const before = readFileSync(file, "utf8");
  const after = REVERT ? revert(before) : apply(before);
  if (after !== before) {
    writeFileSync(file, after);
    changed += 1;
  }
}

console.log(`${REVERT ? "Reverted" : "Applied"} licence band: ${changed}/${targets.length} files updated`);
if (!REVERT) {
  console.log(`  licence PDF button: ${pdfReady ? "shown" : "hidden (no pdfPath)"}`);
}
