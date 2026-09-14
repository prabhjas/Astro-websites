#!/usr/bin/env node
/**
 * Rewrite /mofa-attestation-in-the-uae/ from Word brief
 * (MOFA Attestation UAE: Complete Guide to Process, Fees & Digital Attestation)
 * Body links (doc only): /mofa-attestation-in-the-uae/, /contact-us/, /trade-license-in-dubai/,
 * /memorandum-of-association-amendment/, /
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CLEANED = join(ROOT, 'src/legacy/mofa-attestation-in-the-uae.cleaned.html');
const JSON_OUT = join(ROOT, 'src/content/blog/mofa-attestation-in-the-uae.json');

const SLUG = 'mofa-attestation-in-the-uae';
const META_TITLE = 'MOFA Attestation UAE 2026: Process, Fees & Digital Guide';
const H1 = 'MOFA Attestation UAE: Complete Guide to Process, Fees & Digital Attestation';
const META_DESC =
  'Complete guide to MOFA attestation UAE — digital vs. courier process, fees, required documents, and FAQs. Updated for 2026.';
const FEATURED = '/wp-content/uploads/2026/09/mofa-attestation-uae-featured.webp';
const CONTACT_CTA = '/wp-content/uploads/2026/09/mofa-attestation-uae-contact-cta.webp';
const INFOGRAPHIC = '/wp-content/uploads/2026/09/mofa-attestation-uae-infographic.webp';
const HOME_CTA = '/wp-content/uploads/2026/09/mofa-attestation-uae-home-cta.webp';
const MODIFIED = '2026-09-14T06:00:00.000Z';

const TOC_SECTIONS = [
  'What Is MOFA Attestation in UAE?',
  'Why Does MOFA Attestation Matter?',
  'Digital vs. Courier-Based MOFA Attestation UAE:',
  'Documents That Require MOFA Attestation in UAE',
  'MOFA Attestation Process: Documents Issued Inside vs. Outside the UAE',
  'UAE MOFA Attestation Fees & Charges',
  'MOFA Attestation vs. Apostille',
  'Verify an MOFA Attested Document Online:',
  'Common Reasons MOFA Attestation Gets Rejected',
  'How KPM PRO Handles MOFA Attestation for You',
  'Conclusion!',
  'FAQs',
];

function tocAnchor(label) {
  return label
    .replace(/&amp;/g, 'and')
    .replace(/[''?!:]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function buildToc(sections) {
  const items = sections
    .map((label) => {
      const id = tocAnchor(label);
      return `<div class="lwptoc_item">    <a href="#${id}">
                <span class="lwptoc_item_label">${label}</span>
    </a>
    </div>`;
    })
    .join('');
  return `<div class="lwptoc lwptoc-autoWidth lwptoc-baseItems lwptoc-light lwptoc-notInherit" data-smooth-scroll="1" data-smooth-scroll-offset="24"><div class="lwptoc_i">    <div class="lwptoc_header">
        <b class="lwptoc_title">Contents</b>                    <span class="lwptoc_toggle">
                <a href="#" class="lwptoc_toggle_label" data-label="show">hide</a>            </span>
            </div>
<div class="lwptoc_items lwptoc_items-visible">
    <div class="lwptoc_itemWrap">${items}</div></div>
</div></div>`;
}

const p = (text) => `<p><span style="font-weight: 400;">${text}</span></p>`;
const h2 = (text) => `<h2 id="${tocAnchor(text)}"><b>${text}</b></h2>`;
const h3 = (text) => `<h3 id="${tocAnchor(text)}"><b>${text}</b></h3>`;
const ul = (items) =>
  `<ul>${items.map((i) => `<li style="font-weight: 400;" aria-level="1"><span style="font-weight: 400;">${i}</span></li>`).join('')}</ul>`;
const ol = (items) =>
  `<ol>${items.map((i) => `<li style="font-weight: 400;" aria-level="1"><span style="font-weight: 400;">${i}</span></li>`).join('')}</ol>`;

const tableCss = `.mofa-table-wrap{width:100%;overflow-x:auto;margin:1.25rem 0}.mofa-data-table{width:100%;min-width:560px;border-collapse:collapse;font-size:15px;line-height:1.45}.mofa-data-table th,.mofa-data-table td{border:1px solid #d9dee7;padding:12px 14px;text-align:left;vertical-align:top}.mofa-data-table thead th{background:#0F2A48;color:#fff;font-weight:700}.mofa-data-table tbody tr:nth-child(even) td{background:#f7f9fc}`;

const feesTable = `<figure class="wp-block-table"><style id="mofa-fees-table-css">${tableCss}</style>
<div class="mofa-table-wrap"><table class="mofa-data-table">
<thead><tr><th>Document type</th><th>MOFA fee in AED</th><th>Courier fee</th><th>Total range</th></tr></thead>
<tbody>
<tr><td>Personal/individual document</td><td>150</td><td>40–150</td><td>190–300</td></tr>
<tr><td>Commercial document</td><td>2,000</td><td>40–150</td><td>2,040–2,150</td></tr>
</tbody>
</table></div></figure>`;

const faqs = [
  {
    q: 'What is MOFA attestation in UAE?',
    a: "It verifies the authenticity of official signatures and seals on a document. It doesn’t verify the document's contents.",
  },
  {
    q: 'How much are MOFA attestation charges in UAE?',
    a: 'The standard MoFA fee is 150 dirhams for individual affairs documents and 2,000 dirhams for commercial documents. The fee excludes applicable delivery or other charges.',
  },
  {
    q: 'Can I do online MOFA attestation in the UAE without visiting an office?',
    a: 'You can do it online if your document qualifies for digital attestation. Eligible digital documents can be processed electronically using UAE Pass. However, other documents may follow the courier-based route.',
  },
  {
    q: 'How long does UAE MOFA attestation take?',
    a: "Digital attestation for eligible documents takes up to two hours during official working hours. On the other hand, courier-based attestation takes around one to three business days. The actual duration depends on the courier provider's service.",
  },
  {
    q: 'Is MOFA attestation the same as apostille?',
    a: "An apostille is issued under the Hague Apostille Convention. The UAE is not a contracting party. Therefore, foreign documents follow the UAE's legalisation and attestation process.",
  },
  {
    q: 'How do I check if my document is MOFA attested?',
    a: 'You can use the official MOFA verification service to check if your MOFA is attested or not. Then enter the attestation reference number and issue date to check the document.',
  },
  {
    q: 'What happens if my MOFA attestation application is rejected?',
    a: 'The application can’t be reopened or amended if your application is rejected. Submit a new application by correcting the stated problem.',
  },
  {
    q: 'Does MOFA attestation expire?',
    a: 'An attested document has no expiry date as per MOFA. The authority receiving the document may impose its own validity period or require a recently issued document for a specific transaction.',
  },
];

const faqSchema = `<p><script type="application/ld+json">
${JSON.stringify(
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  },
  null,
  2,
)}
</script></p>`;

const spacingStyle = `<style id="mofa-post-spacing">
.elementor-widget-theme-post-content .elementor-widget-container > p{margin:0 0 .7em!important;line-height:1.55!important}
.elementor-widget-theme-post-content .elementor-widget-container > ul,
.elementor-widget-theme-post-content .elementor-widget-container > ol{margin:.25em 0 .85em!important;padding-left:1.35em}
.elementor-widget-theme-post-content .elementor-widget-container > ul li,
.elementor-widget-theme-post-content .elementor-widget-container > ol li{margin:0 0 .4em!important;line-height:1.5}
.elementor-widget-theme-post-content .elementor-widget-container > h2{margin:1.35em 0 .55em!important}
.elementor-widget-theme-post-content .elementor-widget-container > h3{margin:1.1em 0 .45em!important}
.elementor-widget-theme-post-content .elementor-widget-container > figure{margin:1em 0!important}
.elementor-widget-theme-post-content .elementor-widget-container > .lwptoc{margin:1em 0!important}
</style>`;

const labeledBullets = (items) =>
  `<ul>${items
    .map(
      ([label, body]) =>
        `<li style="font-weight: 400;" aria-level="1"><span style="font-weight: 400;"><b>${label}</b><br>${body}</span></li>`,
    )
    .join('')}</ul>`;

const contentHtml = `
${spacingStyle}
${p('<b>UAE MOFA attestation</b> is the process used by the UAE Ministry of Foreign Affairs to verify the authenticity of signatures and official seals on documents. The year 2026 makes this process much faster for eligible UAE-issued digital documents.')}
${p('From submitting a degree for a UAE job, a marriage certificate for visa processing, or a company document for an overseas transaction, one missing stamp can send the whole file back to square one. To get out of this trouble, a service has been introduced, named MOFA attestation.')}
${p('The good news is that the digital attestation can now be completed within two hours during official working hours.')}
${p("If you don't have an idea about it? Don’t worry, the KPM PRO guide talks about everything briefly.")}
${p('We’ll cover the topics, including:')}
${ul([
  'What MOFA attestation means',
  'Which route applies to your document',
  'Current fees, required steps, rejection reasons',
  'How to verify an attested document online',
])}
${buildToc(TOC_SECTIONS)}

${h2('What Is MOFA Attestation in UAE?')}
${p('It’s an official verification process. The procedure is performed to confirm the signature’s authenticity. It is also used to verify that seals appearing on documents are genuine. However, it does not verify the contents of the document itself.')}
${p("The service is handled by the Ministry of Foreign Affairs operating in the UAE through its digital channels. Consider it the final checkpoint in a document's journey.")}
${p('The documents can include:')}
${ul([
  'Educational certificates',
  'Birth and marriage certificates',
  'Employment documents',
  'Court papers',
  'Commercial records',
])}
<p><a href="/contact-us/"><img decoding="async" class="aligncenter size-large wp-image-mofa-contact" src="${CONTACT_CTA}" alt="UAE Mofa attestation" width="1466" height="851" /></a></p>

${h2('Why Does MOFA Attestation Matter?')}
${p('MOFA <a href="/mofa-attestation-in-the-uae/">attestation UAE</a> can be required for various matters discussed below:')}
${labeledBullets([
  ['Visa &amp; immigration:', 'Attestation supports your family, residence, and other visa applications.'],
  ['Employment:', 'It validates your educational and employment documents for official use.'],
  ['Business licensing:', 'MOFA supports your company formation, licensing, and commercial transactions.'],
  ['Legal matters:', 'It establishes document authenticity when you’re submitting records to authorities.'],
  ['Banking:', 'Attestation supports certain financial, corporate, or personal transactions.'],
  ['International use:', 'It makes your UAE documents suitable for official use abroad.'],
])}

${h2('Digital vs. Courier-Based MOFA Attestation UAE:')}
${p('The latest update in 2026 is worth knowing. The biggest change you’ll experience now is that MoFA provides digital and courier-based attestation. But here’s the catch: you do not manually choose between them. The system itself determines the appropriate route based on your issuing authority and document type.')}

${h3('Digital Attestation:')}
${p('The fastest route is <b>online MOFA attestation in the UAE</b> with a two-hour turnaround. It is designed for UAE-issued digital documents intended for use outside the UAE.')}
${p('To qualify, your document must be an original digital document issued by an approved UAE authority. It must be in PDF format and equipped with the following:')}
${ul(['QR code', 'Barcode', 'Electronic link', 'Reference number'])}
${p("The document should be complete and unaltered. It must be supported by the issuing authority's list of document types.")}
${p('The process involves:')}
${p('You sign in using your UAE Pass → Select the relevant service → Upload your original digital document → Pay the applicable fee → Submit the application.')}
${p('The digitally attested document is delivered through email or My Requests. MoFA states that eligible digital attestations are completed within two hours during official working hours. MoFA specifically requires the original digital document. That’s why a scanned photograph of a paper certificate doesn’t qualify.')}

${h3('Courier-Based Attestation:')}
${p('The courier-based attestation takes around one to three business days. The courier route is applicable if your document does not qualify for digital attestation.')}
${p('The courier collects the:')}
${ul(['Physical original', 'Submits it for MoFA attestation', 'Returns the attested document'])}
${p("Quite important if you're holding a foreign-issued degree, marriage certificate, or other physical certificate. Don't assume you can upload a scan and finish the process online. Foreign-issued documents follow the applicable physical/digital procedures through the UAE mission and MOFA.")}
<p><img decoding="async" class="aligncenter size-large wp-image-mofa-info" src="${INFOGRAPHIC}" alt="Mofa UAE attestation" width="1024" height="361" /></p>

${h2('Documents That Require MOFA Attestation in UAE')}
${p('MoFA handles a broad range of personal and commercial documents. The exact requirement depends on where the document was issued and where you intend to use it.')}

${h3('Personal Documents')}
${p('Examples include:')}
${ul([
  'Degree certificates',
  'Birth certificates',
  'Death certificates',
  'Marriage certificates',
  'Medical reports',
  'Good conduct or police clearance certificates',
  'Court-issued certificates',
  'Powers of attorney for personal matters',
  'Bank statements',
])}
${p("MoFA's own list describes these as individual-affairs documents and states that educational certificates and transcripts are treated as separate documents.")}

${h3('Commercial Documents')}
${p('Commercial documents can include:')}
${ul([
  '<a href="/trade-license-in-dubai/">Trade licenses</a>',
  '<a href="/memorandum-of-association-amendment/">Memoranda of Association</a>',
  'Commercial registrations',
  'Board resolutions',
  'Commercial contracts and agreements',
])}
${p('Commercial invoices and Certificates of Origin use a separate eDAS 2.0 process. MoFA moved users from the previous eDAS 1.0 system to eDAS 2.0 on 8 June 2026.')}

${h2('MOFA Attestation Process: Documents Issued Inside vs. Outside the UAE')}
${p("This is where many guides blur two different processes. Don't. The route depends on where your document was issued.")}

${h3('Documents Issued Inside the UAE')}
${p('For a physical document issued in the UAE, you need to:')}
${ol([
  'Obtain the original document.',
  'Certify it by the relevant issuing authority.',
  'Apply through the MoFA website or MOFA app.',
  'The system determines which attestation route applies.',
  'Complete payment and the assigned process.',
  'Receive the attested document.',
])}

${h3('Documents Issued Outside the UAE:')}
${p('The documents that are issued abroad follow a different chain.')}
${p('It should generally be:')}
${p('Issued → authenticated by the issuing country’s authorities → attested by the UAE Embassy/Consulate in that country → completed through UAE MOFA')}
${p('The foreign documents should first be attested by the foreign MOFA. The process is followed by the issuing country’s UAE Embassy or Consulate. Contact the UAE MOFA for assistance if there’s no UAE mission in that country.')}

${h2('UAE MOFA Attestation Fees & Charges')}
${p('The MoFA fee schedule lists two main categories:')}
${feesTable}
${p("Courier charges vary by provider and service level. MOFA's published information has listed normal and express courier options separately. Verify the current delivery charge before publishing a fixed total.")}
${p('Commercial invoices follow separate eDAS 2.0 fees and rules.')}
${p('A rejected application by MOFA gives you back the money you spent under its refund procedure. It is processed within fourteen working days. Delivery fees are not refundable in specified cancellation cases.')}

${h2('MOFA Attestation vs. Apostille')}
${p("The UAE doesn’t use apostille in place of attestation. Because an apostille is a simplified authentication certificate created under the 1961 Hague Apostille Convention. The UAE is not listed as a contracting party to that Convention in the Hague Conference on Private International Law's current status table.")}
${p("Therefore, don't assume that an apostille replaces UAE document legalisation. The foreign documents intended for use in the UAE follow the same route:")}
${p('Relevant authentication → UAE mission → MoFA attestation process.')}
${p('The exact sequence can depend on the issuing country and document type.')}

${h2('Verify an MOFA Attested Document Online:')}
${p('You can check whether a document is attested or not through MOFA Verify. To do this, you can visit the official verification service. Then, enter the attestation reference number and issue date. Lastly, check the document status.')}
${p('This is useful when you want to confirm an attestation before submitting it to another authority. Helpful when you need to check work completed by a document service provider. You can also use it to verify a digitally attested document.')}

${h2('Common Reasons MOFA Attestation Gets Rejected')}
${p('A small mistake can stop the process at the gate. Common reasons include:')}
${p('<b>Laminated documents:</b> MOFA doesn’t accept laminated documents.')}
${p('<b>Missing prior attestation:</b> Required authentication from the issuing authority or foreign MOFA was skipped.')}
${p('<b>Incorrect translation:</b> Documents not in Arabic or English need the appropriate legally certified translation.')}
${p('<b>Wrong issuing authority:</b> Selecting the wrong authority or document type can lead to rejection.')}
${p('<b>Non-original documents:</b> A scan or photograph can’t replace an original where the physical-original route applies.')}
${p('<b>Incorrect information:</b> Details entered in the application do not match the document.')}
${p('Rejected applications can’t be amended or reopened as per MOFA. You must correct the problem and submit a new application.')}
<p><a href="/"><img decoding="async" class="aligncenter size-large wp-image-mofa-home" src="${HOME_CTA}" alt="mofa attestation in UAE." width="1500" height="829" /></a></p>

${h2('How KPM PRO Handles MOFA Attestation for You')}
${p('MOFA attestation can look like a simple walkthrough until you trace the entire chain. Starting from identifying the correct route, checking previous authentication, preparing the original, and submitting the application to making sure the finished document reaches you without a costly mistake.')}
${p('It’s not as easy as it sounds. Taking assistance from a team of professionals is definitely the answer.')}
${p('KPM PRO can handle the process from collection to delivery. They can manage document collection, check prior-attestation requirements, coordinate required authentication, MOFA application submission, courier coordination, and completed document delivery.')}
${p('The time spent alone juggling many steps yourself is gone. Get one coordinated process from start to finish. Arrange your MOFA attestation support with KPM PRO!')}

${h2('Conclusion!')}
${p('<b>UAE MOFA attestation</b> is no longer a one-route process. Your digital documents can move through digital attestation in as little as two hours. Other documents continue through the approved courier or UAE mission process.')}
${p('Identifying where the document was issued, completing every required prior authentication, choosing the correct document type, and verifying the finished attestation before submitting it elsewhere is the safest approach any employer can take. Those few minutes of checking can save you days of back-and-forth!')}
${p('Another way is to rely on a <a href="/contact-us/">KPM PRO</a> specialist team. They know best: the process, the fee, and the digital way to get everything ready on time.')}

${h2('FAQs')}
${faqs.map((f) => `${h3(f.q)}\n${p(f.a)}`).join('\n\n')}

${faqSchema}
`.trim();

function replaceBetween(html, startMarker, endMarker, replacement) {
  const start = html.indexOf(startMarker);
  if (start < 0) throw new Error(`Missing start marker: ${startMarker}`);
  const contentStart = start + startMarker.length;
  const end = html.indexOf(endMarker, contentStart);
  if (end < 0) throw new Error(`Missing end marker: ${endMarker}`);
  return html.slice(0, contentStart) + '\n\t\t\t\t\t' + replacement + '\n' + html.slice(end);
}

let html = readFileSync(CLEANED, 'utf8');

html = html.replace(
  /<title>[^<]*<\/title>/i,
  `<title>${META_TITLE}</title>`,
);
html = html.replace(
  /(<meta\s+name="description"\s+content=")[^"]*(")/i,
  `$1${META_DESC}$2`,
);
html = html.replace(
  /(<meta\s+property="og:title"\s+content=")[^"]*(")/i,
  `$1${META_TITLE}$2`,
);
html = html.replace(
  /(<meta\s+property="og:description"\s+content=")[^"]*(")/i,
  `$1${META_DESC}$2`,
);
html = html.replace(
  /(<meta\s+name="twitter:title"\s+content=")[^"]*(")/i,
  `$1${META_TITLE}$2`,
);
html = html.replace(
  /(<meta\s+name="twitter:description"\s+content=")[^"]*(")/i,
  `$1${META_DESC}$2`,
);

// H1 in hero + duplicate H2 heading
html = html.replace(
  /(<h1[^>]*>)[\s\S]*?(<\/h1>)/i,
  `$1${H1}$2`,
);
html = html.replace(
  /(<h2 class="elementor-heading-title elementor-size-default">)[^<]*(<\/h2>)/,
  `$1${H1}$2`,
);

// Featured image + alt
html = html.replace(
  /src="\/wp-content\/uploads\/2026\/03\/Mofa-attestion[^"]*"/g,
  `src="${FEATURED}"`,
);
html = html.replace(
  /alt="Mofa Attestation"/g,
  'alt="Mofa Attestation UAE"',
);
html = html.replace(
  /srcset="[^"]*Mofa-attestion[^"]*"/g,
  `srcset="${FEATURED} 1024w"`,
);

html = html.replace(
  /(<meta\s+property="og:image"\s+content=")[^"]*(")/i,
  `$1${FEATURED}$2`,
);
html = html.replace(
  /(<meta\s+name="twitter:image"\s+content=")[^"]*(")/i,
  `$1${FEATURED}$2`,
);

html = replaceBetween(
  html,
  'data-widget_type="theme-post-content.default">\n\t\t\t\t<div class="elementor-widget-container">',
  '<div class="ssba-modern-2 ssba ssbp-wrap',
  contentHtml,
);

writeFileSync(CLEANED, html);

const existing = JSON.parse(readFileSync(JSON_OUT, 'utf8'));
existing.title = H1;
existing.description = META_DESC;
existing.modifiedAt = MODIFIED;
existing.featuredImage = {
  src: FEATURED,
  alt: 'Mofa Attestation UAE',
  originalUrl: FEATURED,
};
existing.contentHtml = `\n\t\t\t\t\t${contentHtml}`;
existing.og = {
  ...(existing.og || {}),
  title: META_TITLE,
  description: META_DESC,
  image: FEATURED,
};
existing.twitter = {
  ...(existing.twitter || {}),
  title: META_TITLE,
  description: META_DESC,
  image: FEATURED,
};
existing.toc = TOC_SECTIONS.map((text) => ({
  id: tocAnchor(text),
  text,
  level: 2,
}));
writeFileSync(JSON_OUT, `${JSON.stringify(existing, null, 2)}\n`);

console.log('Updated', CLEANED);
console.log('Updated', JSON_OUT);
console.log('Content length', contentHtml.length);
