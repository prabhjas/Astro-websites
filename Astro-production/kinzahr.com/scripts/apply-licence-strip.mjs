/**
 * Injects the KinzaHR licence & verification band into every legacy footer.
 *
 * Legacy pages are served straight from src/legacy/*.cleaned.html at runtime
 * (see src/lib/legacy-page.js), and each page carries its own copy of the
 * Elementor footer — so the band has to be written into each file rather than
 * rendered once from a layout. This script is the single place that happens.
 *
 * Source of truth for the facts is src/data/licence.json. Edit that, re-run
 * this, restart the service. Idempotent: re-running replaces the existing band
 * rather than stacking a second one.
 *
 *   node scripts/apply-licence-strip.mjs           # apply
 *   node scripts/apply-licence-strip.mjs --revert  # remove the band again
 *
 * Also drops the oversized footer logo section (the section wrapping the
 * Logo-footer-Desktop image), which the band replaces. Only 6 of the legacy
 * pages carry that logo; the rest are left structurally untouched.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REVERT = process.argv.includes("--revert");

const licence = JSON.parse(readFileSync(join(ROOT, "src/data/licence.json"), "utf8"));

const CSS_HREF = "/css/kinza-licence.css";
const CSS_MARK = "data-kinza-licence-css";
const BAND_START = "<!-- kz-licence:start -->";
const BAND_END = "<!-- kz-licence:end -->";
/**
 * The oversized footer logo is identified by its IMAGE, not by an Elementor
 * data-id: the same data-id is reused for different widgets across pages, and
 * anchoring on it removes the copyright bar on pages that have no logo.
 */
const LOGO_IMG_MARK = "Logo-footer-Desktop";
/** A block containing this is never the logo section — refuse to remove it. */
const NEVER_REMOVE = "All Rights Reserved";

/** Field order shown in the band — mirrors the DET licence document itself. */
const rows = [
  { label: "License Status", value: licence.status, badge: true },
  { label: "Unified License", value: licence.unifiedNumber },
  { label: "License Number", value: licence.number },
  { label: "Business Name", value: licence.businessName },
  { label: "License Type", value: licence.type },
  { label: "Issuing Authority", value: licence.issuingAuthority },
  { label: "Legal Type", value: licence.legalType },
  { label: "Issue Date", value: licence.issueDate },
].filter((r) => r.value);

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const SITE_ORIGIN = "https://kinzahr.com";

/**
 * Organization JSON-LD — the machine-readable half of the licence band.
 * legalName / identifier / hasCredential are what search engines and AI agents
 * actually read when judging whether a business is a real, licensed entity.
 *
 * Legacy pages bypass BaseLayout entirely (they are served straight from
 * src/legacy), so this has to be written into each page alongside the band
 * rather than rendered once from a layout. It lives inside the band markers so
 * re-running the script replaces it instead of stacking duplicates.
 */
function buildOrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": ["Organization", "LocalBusiness"],
    "@id": `${SITE_ORIGIN}/#organization`,
    name: "KinzaHR",
    legalName: licence.businessName,
    url: SITE_ORIGIN,
    identifier: {
      "@type": "PropertyValue",
      name: "DET Trade Licence Number",
      value: licence.number,
      ...(licence.unifiedNumber
        ? { description: `Dubai Unified Licence ${licence.unifiedNumber}` }
        : {}),
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
      ...(pdfReady
        ? { subjectOf: { "@type": "DigitalDocument", url: `${SITE_ORIGIN}${licence.pdfPath}` } }
        : {}),
    },
    ...(licence.address ? { address: { "@type": "PostalAddress", streetAddress: licence.address, addressCountry: "AE", addressRegion: "Dubai" } } : {}),
    ...(licence.activities.length
      ? { knowsAbout: licence.activities }
      : {}),
  };
  // </script> can never appear inside JSON-LD or it would close the tag early.
  const json = JSON.stringify(schema).replace(/<\//g, "<\\/");
  return `<script type="application/ld+json">${json}</script>`;
}

/**
 * The scanned licence PDF is optional: the "view the license" button only
 * appears once the file is actually in public/licence/, so a missing upload can
 * never ship a dead link.
 */
// An empty pdfPath means the scanned licence is deliberately not published (it
// renews yearly and would silently go stale). Guard first: join(ROOT, "public",
// "") resolves to public/ itself, which exists, and would otherwise render a
// "view the license" button pointing at nothing.
const pdfReady = Boolean(licence.pdfPath)
  && existsSync(join(ROOT, "public", licence.pdfPath.replace(/^\//, "")));

function buildBand() {
  const rowHtml = rows
    .map(
      (r) => `        <div class="kz-licence__row">
          <dt>${esc(r.label)}</dt>
          <dd>${r.badge ? `<span class="kz-licence__badge">${esc(r.value)}</span>` : esc(r.value)}</dd>
        </div>`,
    )
    .join("\n");

  const pdfBtn = pdfReady
    ? `
        <a class="kz-licence__btn kz-licence__btn--ghost" href="${esc(licence.pdfPath)}" target="_blank" rel="noopener noreferrer">
          Click here to view the license <span aria-hidden="true">&#8599;</span>
        </a>`
    : "";

  return `${BAND_START}
${buildOrganizationSchema()}
<section class="kz-licence" aria-labelledby="kz-licence-title">
  <div class="kz-licence__inner">
    <div class="kz-licence__details">
      <h2 class="kz-licence__title" id="kz-licence-title">License Details</h2>
      <p class="kz-licence__lead">${esc(licence.businessName)} is fully licensed in Dubai, UAE by the ${esc(licence.issuingAuthority)}.</p>
      <dl class="kz-licence__grid">
${rowHtml}
      </dl>
      <div class="kz-licence__actions">
        <a class="kz-licence__btn kz-licence__btn--primary" href="${esc(licence.verifyUrl)}" target="_blank" rel="noopener noreferrer nofollow">
          Verify our license <span aria-hidden="true">&#8599;</span>
        </a>${pdfBtn}
      </div>
    </div>
    <div class="kz-licence__verify">
      <a class="kz-licence__qr" href="${esc(licence.verifyUrl)}" target="_blank" rel="noopener noreferrer nofollow" aria-label="Verify licence ${esc(licence.number)} on the official Dubai licence portal">
        <img src="${esc(licence.qrPath)}" width="150" height="150" loading="lazy" decoding="async" alt="QR code linking to the official Dubai portal for verifying licence ${esc(licence.number)}" />
      </a>
      <p class="kz-licence__qr-caption">Scan to verify on the<br />official Dubai licence portal</p>
    </div>
  </div>
</section>
${BAND_END}`;
}

/**
 * Removes the balanced <section> that wraps the oversized footer logo image.
 * Refuses to touch a block that carries the copyright line — that means the
 * anchor landed in the wrong section and removing it would delete real content.
 */
function removeLogoSection(html, file) {
  const anchor = html.indexOf(LOGO_IMG_MARK);
  if (anchor < 0) return html;
  const start = html.lastIndexOf("<section", anchor);
  if (start < 0) return html;

  let depth = 0;
  let i = start;
  const openRe = /<section\b/gi;
  const closeRe = /<\/section\s*>/gi;
  while (i < html.length) {
    openRe.lastIndex = i;
    closeRe.lastIndex = i;
    const o = openRe.exec(html);
    const c = closeRe.exec(html);
    if (!c) return html; // unbalanced — leave the file alone
    if (o && o.index < c.index) {
      depth += 1;
      i = o.index + o[0].length;
    } else {
      depth -= 1;
      i = c.index + c[0].length;
      if (depth === 0) {
        const block = html.slice(start, i);
        if (block.includes(NEVER_REMOVE)) {
          console.warn(
            `  ! ${basename(file)}: logo section also contains the copyright line — left untouched`,
          );
          return html;
        }
        return html.slice(0, start) + html.slice(i);
      }
    }
  }
  return html;
}

function stripBand(html) {
  const s = html.indexOf(BAND_START);
  const e = html.indexOf(BAND_END);
  if (s < 0 || e < 0) return html;
  return html.slice(0, s) + html.slice(e + BAND_END.length);
}

function apply(html, file) {
  let out = stripBand(html); // idempotent: drop any previous band first
  out = removeLogoSection(out, file);

  // Stylesheet link — into <head> when the file is a full document, otherwise
  // inline just above the band (valid, and the fragment has no head of its own).
  const linkTag = `<link rel="stylesheet" href="${CSS_HREF}" ${CSS_MARK}="1" />`;
  const hasLink = out.includes(CSS_MARK);
  if (!hasLink && /<\/head>/i.test(out)) {
    out = out.replace(/<\/head>/i, `${linkTag}\n</head>`);
  }

  const band = (hasLink || /<\/head>/i.test(out) ? "" : `${linkTag}\n`) + buildBand();

  // Sit inside the footer element, as its closing band.
  const idx = out.lastIndexOf("</footer>");
  if (idx >= 0) return out.slice(0, idx) + band + "\n" + out.slice(idx);
  if (/<\/body>/i.test(out)) return out.replace(/<\/body>/i, `${band}\n</body>`);
  return out + band;
}

function revert(html) {
  let out = stripBand(html);
  out = out.replace(new RegExp(`\\s*<link rel="stylesheet" href="${CSS_HREF}" ${CSS_MARK}="1" />`, "g"), "");
  return out;
}

const targets = [
  ...readdirSync(join(ROOT, "src/legacy"))
    .filter((f) => f.endsWith(".cleaned.html"))
    .map((f) => join(ROOT, "src/legacy", f)),
  join(ROOT, "src/legacy/chrome/footer.html"),
  join(ROOT, "public/chrome/footer.html"),
].filter((p) => existsSync(p));

let changed = 0;
let logosRemoved = 0;
for (const file of targets) {
  const before = readFileSync(file, "utf8");
  const hadLogo = before.includes(LOGO_IMG_MARK);
  const after = REVERT ? revert(before) : apply(before, file);
  if (after !== before) {
    writeFileSync(file, after);
    changed += 1;
    if (hadLogo && !after.includes(LOGO_IMG_MARK) && !REVERT) logosRemoved += 1;
  }
}

console.log(`${REVERT ? "Reverted" : "Applied"} licence band: ${changed}/${targets.length} files updated`);
if (!REVERT) {
  console.log(`  oversized footer logo removed from ${logosRemoved} file(s)`);
  console.log(
    `  licence PDF button: ${pdfReady ? "shown" : `hidden (public${licence.pdfPath} not present)`}`,
  );
}
