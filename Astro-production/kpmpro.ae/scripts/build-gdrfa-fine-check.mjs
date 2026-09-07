#!/usr/bin/env node
/**
 * Update live /gdrfa-fine-check/ body + meta from the revised Word brief.
 * Keeps existing chrome, author, related cards, and featured image asset.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'src/legacy/gdrfa-fine-check.cleaned.html');

const SLUG = 'gdrfa-fine-check';
const META_TITLE = 'GDRFA Fine Check: How to Check &amp; Pay UAE Visa Fines';
const META_DESC =
  'Run a GDRFA fine check online in minutes. Step-by-step guide for overstay, visa, and Emirates ID fines via GDRFA app, website, DubaiNow, or Amer centers.';
const H1 = 'GDRFA Fine Check: A Guide to Checking and Paying UAE Visa Fines';
const FEATURED = '/wp-content/uploads/2026/02/senior-people-reading-retirement-plan-contract-terms-with-broker-1.webp';
const CTA = '/wp-content/uploads/2026/09/gdrfa-fine-check-cta.webp';
const MID_IMG = '/wp-content/uploads/2026/02/GDRFA-Fine-Check-in-Dubai-e1771416910968.webp';
const MID_IMG_LG = '/wp-content/uploads/2026/02/GDRFA-Fine-Check-in-Dubai-e1771416910968-1024x740.webp';
const MODIFIED = new Date().toISOString().replace(/\.\d{3}Z$/, '+00:00');

const TOC_SECTIONS = [
  'What Is GDRFA? And Why Fines Matter?',
  'What GDRFA Handles?',
  'Who Can Get a GDRFA Fine?',
  'How to Do a GDRFA Fine Check: Top Four Methods',
  'GDRFA Fine Types and Amounts',
  'How to Check a GDRFA Overstay Fine',
  'GDRFA Fine Check by ID Type',
  'How to Pay a GDRFA Fine',
  'GDRFA Fine Waiver and Dispute Process',
  'Consequences of Unpaid GDRFA Fines',
  'How to Avoid GDRFA Fines Going Forward',
  'FAQs',
];

function tocAnchor(label) {
  return label
    .replace(/&amp;/g, 'and')
    .replace(/[''?]/g, '')
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

const fineTable = `<figure class="wp-block-table"><style id="gdrfa-fine-table-css">.gdrfa-table-wrap{width:100%;overflow-x:auto;margin:1.25rem 0}.gdrfa-data-table{width:100%;min-width:560px;border-collapse:collapse;font-size:15px;line-height:1.45}.gdrfa-data-table th,.gdrfa-data-table td{border:1px solid #d9dee7;padding:12px 14px;text-align:left;vertical-align:top}.gdrfa-data-table thead th{background:#0F2A48;color:#fff;font-weight:700}.gdrfa-data-table tbody tr:nth-child(even) td{background:#f7f9fc}</style>
<div class="gdrfa-table-wrap"><table class="gdrfa-data-table">
<thead><tr><th>Fine type</th><th>2026 position</th><th>Daily rate</th><th>Cap</th></tr></thead>
<tbody>
<tr><td>Visit visa overstay</td><td>Standardised UAE rule</td><td>AED 50</td><td>Depends on the case</td></tr>
<tr><td>Tourist visa overstay</td><td>Standardised UAE rule</td><td>AED 50</td><td>Depends on the case</td></tr>
<tr><td>Residence visa overstay</td><td>Standardised UAE rule</td><td>AED 50</td><td>Depends on the case</td></tr>
<tr><td>Other immigration violations</td><td>Case-specific</td><td>Varies</td><td>Case-specific</td></tr>
</tbody>
</table></div></figure>
${p('The AED 50 daily rate comes from the UAE government\'s current guidance. Always confirm the final payable amount through the official GDRFA record.')}`;

const faqSchema = `<p><script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "How to check a GDRFA fine online?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "Visit the official GDRFA Fines Inquiry Service and search using your file number, UDB number, Emirates ID, or passport number."
    }
  },{
    "@type": "Question",
    "name": "How do I check my GDRFA fine using my Emirates ID?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "Select Emirates ID on the inquiry page, enter your ID, and provide the required information to check your GDRFA fine."
    }
  },{
    "@type": "Question",
    "name": "What's the GDRFA overstay fine amount per day?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "The visit, tourist, and residence visa overstaying fines are standardised at fifty dirhams per day."
    }
  },{
    "@type": "Question",
    "name": "Can I run a GDRFA visa fine check without an Emirates ID?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "You can still check your GDRFA visa fine without an Emirates ID by using your passport number, file number, or UDB number as alternative search options."
    }
  },{
    "@type": "Question",
    "name": "Can I do a GDRFA fine check Dubai search through DubaiNow?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "Absolutely, you can use DubaiNow if the relevant service is available. However, checking through GDRFA is the preferred option for accessing the authoritative fine record."
    }
  },{
    "@type": "Question",
    "name": "How to pay a GDRFA fine after checking it?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "Use GDRFA's official fine-collection service or an Amer Service Center to pay your fine, based on the payment options available for your case."
    }
  },{
    "@type": "Question",
    "name": "Can a GDRFA fine be waived or reduced?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "GDRFA provides a service to request a fine waiver or reduction. Your request must include documents such as a passport copy, an explanation of the violation, and the reason for your inability to pay, along with any other documents requested by the Fines Committee."
    }
  },{
    "@type": "Question",
    "name": "What happens if a GDRFA fine is not paid on time?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "An unpaid fine remains attached to your immigration record and may complicate later transactions or processes, such as departure."
    }
  }]
}
</script>`;

const contentHtml = `
${p('Checking for outstanding fines should be one of your first steps if you\'re travelling or renewing your visa in Dubai. A GDRFA fine check helps you find any Dubai immigration fines linked to your visa or residency status.')}
${p('UAE visa overstay fines are fifty dirhams per day. So even a short delay can add up quickly. The good news is that checking your status becomes simple. You can use GDRFA Dubai\'s official online inquiry service, access digital channels, or visit an Amer Service Center.')}
${p('This guide explains how to check your fines and what to do before they increase.')}
${buildToc(TOC_SECTIONS)}

${h2('What Is GDRFA? And Why Fines Matter?')}
${p('The GDRFA, or General Directorate of Residency and Foreigners Affairs, manages immigration and residency services in Dubai. Its responsibilities include:')}
${ul([
  'Visas',
  'Residence permits',
  '<a href="/entry-permit/">Entry permits</a>',
  'Immigration-related fines.',
])}
${p('A missed expiry date can turn into a costly problem.')}
${p('For example:')}
${p('Someone who plans to leave Dubai after a short trip may discover they have overstayed only when preparing to depart. A simple GDRFA fine check can reveal the issue before it disrupts travel plans. Therefore, being aware of the fines saves you from sudden surprises.')}

${h2('What GDRFA Handles?')}
${p('The authority provides you with immediate immigration services for visas and residency matters in Dubai. The website consists of dedicated services for:')}
${ul(['Visa applications', 'Residence permits', 'Overstay', 'Fines'])}

${h2('Who Can Get a GDRFA Fine?')}
${p('Immigration fines can affect visitors, residents, and sponsors. Some situations are common that trigger fines. Overstaying a visit, tourist, or residence visa pushes you towards fines. Immigration and certain sponsorship-related violations also invite fines.')}
${p('GDRFA\'s inquiry service gives users an opportunity to check fines on their own file or on files under their sponsorship.')}

<p><a href="/contact-us/"><img decoding="async" class="aligncenter size-large wp-image-gdrfa-cta" src="${CTA}" alt="GDRFA Fine Check in Dubai" width="1024" height="546" /></a></p>

${h2('How to Do a GDRFA Fine Check: Top Four Methods')}
${p('You have four practical ways to investigate a Dubai immigration fine.')}

${h3('Method One: GDRFA Official Website')}
${p('The first option is the most direct one.')}
${ol([
  'Open the Fines Inquiry Service',
  'Select your search type',
  'Enter the requested information.',
])}
${p('The service supports File Number, UDB Number, <a href="/emirates-id-status/">Emirates ID</a>, and Passport Number.')}

${h3('Identification Options Accepted')}
${p('Depending on your record, you can search with your Emirates ID, passport number, file number, or UDB number. You may also need to provide your:')}
${ul(['Nationality', 'File type', 'Date of birth', 'Gender'])}

${h3('Method Two: GDRFA Dubai App')}
${p('You can also access immigration services through the GDRFA\'s smart application. Use it to complete various immigration transactions without visiting a service center. It\'s best to check your fines here, if a relevant service is available, before relying on third-party apps or websites.')}

${h3('Method Three: DubaiNow App')}
${p('DubaiNow brings more than two hundred eighty city services from forty-four government and private entities into one platform. Residency and travel are the service categories included. It can provide a convenient digital route if the required immigration service appears in DubaiNow. GDRFA remains the preferred source for the definitive fine record.')}

${h3('Method Four: Amer Service Centers')}
${p('Consider this option as your personal assistance. Amer Service Centers provide access to GDRFA-related services. The route can help when your online record doesn\'t appear. It also works well when your documents contain inconsistencies or your case needs additional clarification.')}

${h2('GDRFA Fine Types and Amounts')}
${p('Not every immigration penalty follows the same calculation. Always check the current government record before paying.')}

${h3('Visa Overstay Fine')}
${p('The UAE government updated its guidance to standardise visit, tourist, and residence visa overstay fines at AED 50 per day. The rule applies after the relevant permitted stay and grace period.')}
${p('Some older GDRFA pages still display historical AED 100-per-day information for certain tourist visa scenarios. Because official pages can contain legacy information, use the current fine displayed in your GDRFA record rather than calculating from an old article.')}

${h3('Emirates ID Renewal Delay Fine')}
${p('An Emirates ID is connected to a person\'s UAE residency status. When the residence visa expires, the Emirates ID issued through ICP also expires.')}
${p('Do not automatically treat every Emirates ID delay as a separate GDRFA overstay fine. Check the underlying immigration record to identify the actual penalty.')}

${h3('Sponsorship and Family Visa Fines')}
${p('Sponsors should monitor the <a href="/uae-visa-status/">visa status</a> of dependents carefully. A missed renewal or unresolved immigration issue involving a spouse, child, or other sponsored person can create additional complications.')}
${p('GDRFA\'s fines service specifically supports checking fines on files under your sponsorship.')}

${h3('Other Immigration Violation Fines')}
${p('Other penalties depend on the specific immigration violation. The amount, payment process, and applicable requirements can differ.')}

${h3('Comparison Table – Fine Type vs. Daily Rate vs. Cap')}
${fineTable}

<p><img decoding="async" class="aligncenter size-large wp-image-9945" src="${MID_IMG_LG}" alt="GDRFA Fine Check Dubai" width="1024" height="740" srcset="${MID_IMG_LG} 1024w, /wp-content/uploads/2026/02/GDRFA-Fine-Check-in-Dubai-e1771416910968-300x217.webp 300w, /wp-content/uploads/2026/02/GDRFA-Fine-Check-in-Dubai-e1771416910968-768x555.webp 768w, /wp-content/uploads/2026/02/GDRFA-Fine-Check-in-Dubai-e1771416910968-1536x1111.webp 1536w, ${MID_IMG} 1632w" sizes="(max-width: 1024px) 100vw, 1024px" /></p>

${h2('How to Check a GDRFA Overstay Fine')}
${p('A GDRFA overstay fine check can take only a few minutes when you have the right identification details.')}

${h3('Step-by-Step Overstay Check')}
${ol([
  'Open the official GDRFA Fines Inquiry Service.',
  'Select your identification method.',
  'Enter your passport number, Emirates ID, file number, or UDB number.',
  'Provide the additional information requested.',
  'Submit the inquiry.',
  'Review the outstanding amount and violation details.',
])}
${p('GDRFA\'s official form confirms these search options and additional identification fields.')}

${h3('What Happens If You Don\'t Pay')}
${p('Ignoring an immigration fine can create problems during later immigration transactions. GDRFA also provides a departure-permit service for certain violators, making it important to resolve outstanding issues before leaving the UAE.')}
${p('A fine should not automatically be described as a travel ban. Travel restrictions can involve separate legal or government proceedings.')}

${h2('GDRFA Fine Check by ID Type')}
${h3('By Emirates ID')}
${p('Select Emirates ID on the official GDRFA inquiry page and enter the requested details. The system checks the immigration record connected to the identification information.')}

${h3('By Passport Number')}
${p('You can conduct a GDRFA visa fine check without an Emirates ID by selecting the passport number. This option is especially useful for visitors and people who do not hold a UAE Emirates ID.')}

${h3('By File Number or UID')}
${p('A file number or UDB number can also identify your immigration record. Keep these details from your visa documents because they can simplify future inquiries.')}

${h2('How to Pay a GDRFA Fine')}
${p('Finding a fine is only half the job. The next step is clearing it.')}

${h3('Online Payment Options')}
${p('GDRFA provides a dedicated service for collecting financial fines related to violations of entry and residency laws.')}
${p('Use the official payment route shown for your case and save the receipt after payment.')}

${h3('Payment via Amer Centers')}
${p('You can also resolve eligible fines through an Amer Service Center. This can be useful when your case involves document issues or requires staff assistance.')}

${h2('GDRFA Fine Waiver and Dispute Process')}
${p('A fine does not necessarily mean you have no options.')}

${h3('When You Can Request a Waiver')}
${p('GDRFA offers an official service to request an exemption or reduction of financial penalties imposed for violations of the Foreigner\'s Entry and Residence Law.')}
${p('Approval is not automatic. The relevant authority reviews the circumstances.')}

${h3('Documents Needed for a Reduction Request')}
${p('GDRFA lists documents that can include:')}
${ul([
  'Passport copy',
  'Letter explaining the violation',
  'Explanation of inability to pay',
  'Additional documents requested by the Fines Committee',
])}
${p('A clear explanation backed by supporting evidence can make the application easier to assess.')}

${h2('Consequences of Unpaid GDRFA Fines')}
${h3('Travel Bans')}
${p('An unpaid immigration fine should not automatically be labelled a travel ban. A travel restriction can arise from separate legal circumstances.')}
${p('If you have concerns before travelling, check your immigration and legal status rather than assuming that paying one fine resolves every restriction.')}

${h3('Visa Renewal Blocks')}
${p('Outstanding immigration issues can complicate future visa transactions. Checking your record before renewal can help you identify problems early.')}

${h2('How to Avoid GDRFA Fines Going Forward')}
${h3('Set Monthly Fine Check Reminders')}
${p('Setting reminders is the smartest way to dodge the bullet. You can set visa expiry dates, grace-period deadlines, passport expiry, dependant visa renewals, Emirates ID validity, and pending immigration applications. A calendar reminder can cost you nothing. It just takes a few minutes but saves you from an overlooked deadline that can cost much.')}

${h3('Use a PRO Service Instead:')}
${p('Companies and sponsors managing many visas may use a <a href="/">KPM PRO</a> service to monitor their renewals, cancellations, and immigration paperwork. Adding professional support does not replace the sponsor\'s responsibility. But it can reduce the chance of missing an important deadline.')}

${h2('FAQs')}
${h3('How to check a GDRFA fine online?')}
${p('Visit the official GDRFA Fines Inquiry Service and search using your:')}
${ul(['File number', 'UDB number', 'Emirates ID', 'Passport number'])}

${h3('How do I check my GDRFA fine using my Emirates ID?')}
${p('Follow these steps to check:')}
${ol(['Select Emirates ID on the inquiry page', 'Enter your ID', 'Provide the information.'])}

${h3('What\'s the GDRFA overstay fine amount per day?')}
${p('The visit, tourist, and residence visa overstaying fines are standardised at fifty dirhams per day.')}

${h3('Can I run a GDRFA visa fine check without an Emirates ID?')}
${p('You can still do it without an Emirates ID by using your passport number, file number, or UDB number as alternative search options.')}

${h3('Can I do a GDRFA fine check Dubai search through DubaiNow?')}
${p('Absolutely, you can use the platform if the relevant service is available. Checking GDRFA is the preferred option for the authoritative fine record.')}

${h3('How to pay a GDRFA fine after checking it?')}
${p('Use GDRFA\'s official fine-collection service or an Amer Service Center to pay your fine. Based on the options available for your case.')}

${h3('Can a GDRFA fine be waived or reduced?')}
${p('GDRFA provides a service to waive or reduce your fine. Your request must include documents such as your passport copy and an explanation of the violation and inability to pay. Plus other documents requested by the Fines Committee.')}

${h3('What happens if a GDRFA fine is not paid on time?')}
${p('An unpaid fine has been attached to your immigration record and may complicate later transactions or processes like departure.')}

${faqSchema}
`.trim();

let html = readFileSync(OUT, 'utf8');

// Preserve share buttons block from existing page if present after content.
const shareStart = html.indexOf('<div class="ssba-modern-2 ssba ssbp-wrap');
const authorStart = html.indexOf('elementor-element-d889927');
let shareBlock = '';
if (shareStart !== -1 && authorStart !== -1 && shareStart < authorStart) {
  // share is inside content container currently; extract and re-append with updated share title
  const shareEnd = html.lastIndexOf('</div>', authorStart);
  // find closing of ssba wrapper more carefully
  const afterShare = html.indexOf('</div>\n</div>\n\t\t\t\t', shareStart);
  const shareClose = html.indexOf('				</div>\n				</div>\n				<div class="elementor-element elementor-element-d889927', shareStart);
  if (shareClose !== -1) {
    shareBlock = html.slice(shareStart, shareClose);
    shareBlock = shareBlock
      .replaceAll(
        'GDRFA%20Fine%20Check%20in%20Dubai:%20Streamlining%20the%20Process%20for%20Residents%20&amp;%20Visitors',
        encodeURIComponent(H1.replace(/&amp;/g, '&')),
      )
      .replaceAll(
        'GDRFA Fine Check in Dubai: Streamlining the Process for Residents &amp; Visitors',
        H1,
      );
  }
}

const contentWidgetOpen =
  'elementor-widget elementor-widget-theme-post-content" data-id="2bfb843" data-element_type="widget" data-e-type="widget" data-widget_type="theme-post-content.default">\n\t\t\t\t<div class="elementor-widget-container">';
const openIdx = html.indexOf(contentWidgetOpen);
if (openIdx === -1) throw new Error('Could not find theme-post-content widget');
const containerStart = openIdx + contentWidgetOpen.length;
const authorIdx = html.indexOf(
  '<div class="elementor-element elementor-element-d889927',
  containerStart,
);
if (authorIdx === -1) throw new Error('Could not find author box after content');

// Close content widget before author: existing markup has </div></div> before author
const beforeAuthor = html.lastIndexOf('</div>', authorIdx);
// Find the widget-container close + widget close immediately before author
const widgetClose = html.lastIndexOf(
  '				</div>\n				</div>\n				<div class="elementor-element elementor-element-d889927',
  authorIdx + 10,
);
if (widgetClose === -1) throw new Error('Could not locate content widget close');

const newContentInner = `\n\t\t\t\t\t${contentHtml}${shareBlock ? `\n${shareBlock}` : ''}\n\t\t\t\t`;
html = html.slice(0, containerStart) + newContentInner + html.slice(widgetClose);

// Meta / title replacements (common variants on the live page)
const oldTitles = [
  'GDRFA Fine Check Dubai: How to Check &amp; Pay Overstay Fines',
  'GDRFA Fine Check in Dubai: Streamlining the Process for Residents &amp; Visitors',
  'GDRFA Fine Check in Dubai: Streamlining the Process for Residents & Visitors',
];
for (const old of oldTitles) {
  html = html.replaceAll(old, META_TITLE);
  html = html.replaceAll(old.replace(/&amp;/g, '&'), META_TITLE.replace(/&amp;/g, '&'));
}

const oldDescs = [
  'Learn how to conduct a GDRFA fine check online. Our guide cover checking overstay penalties via the app/website, and tips to avoid UAE visa fine.',
  'Check GDRFA fines online in Dubai. Learn how to check overstay fines, pay visa penalties, and avoid immigration issues before travel or renewal.',
];
for (const old of oldDescs) {
  html = html.replaceAll(old, META_DESC);
}

// H1 heading widget
html = html.replace(
  /(<h1 class="elementor-heading-title[^"]*">)([\s\S]*?)(<\/h1>)/i,
  `$1${H1}$3`,
);

// Featured image alt
html = html.replace(
  /(src="\/wp-content\/uploads\/2026\/02\/senior-people-reading-retirement-plan-contract-terms-with-broker-1\.webp"[^>]*alt=")[^"]*(")/i,
  `$1GDRFA Fine Check$2`,
);
html = html.replace(
  /(alt=")[^"]*(" src="\/wp-content\/uploads\/2026\/02\/senior-people-reading-retirement-plan-contract-terms-with-broker-1\.webp")/i,
  `$1GDRFA Fine Check$2`,
);

// modified dates
html = html.replaceAll('2026-07-03T09:38:40+00:00', MODIFIED);
html = html.replace(
  /Prepared for Astro Phase 1[^<]+/,
  `Prepared for Astro Phase 1 · ${SLUG} · ${new Date().toISOString()}`,
);

writeFileSync(OUT, html);
console.log('Wrote', OUT);
console.log('H1:', H1);
console.log('Meta title:', META_TITLE.replace(/&amp;/g, '&'));
