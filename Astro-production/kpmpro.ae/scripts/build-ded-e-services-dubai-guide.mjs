#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const TEMPLATE = join(ROOT, 'src/legacy/what-is-corporate-tax-in-uae.cleaned.html');
const OUT = join(ROOT, 'src/legacy/ded-e-services-dubai-guide.cleaned.html');
const templateHtml = readFileSync(TEMPLATE, 'utf8');

function buildShareBlock(slug, shareTitle) {
  const shareStart = templateHtml.indexOf('<div class="ssba-modern-2 ssba ssbp-wrap');
  const shareEnd = templateHtml.indexOf(
    '<div class="elementor-element elementor-element-d889927',
    shareStart,
  );
  const encodedTitle = encodeURIComponent(shareTitle);
  return templateHtml
    .slice(shareStart, shareEnd)
    .replaceAll('/what-is-corporate-tax-in-uae/', `/${slug}/`)
    .replaceAll(
      'What%20is%20Corporate%20Tax%20in%20UAE?%20A%20Complete%20Guide%20for%202026',
      encodedTitle,
    );
}

const SLUG = 'ded-e-services-dubai-guide';
const POST_ID = '10521';
const META_TITLE = 'DED E-Services Dubai (2026): Business Setup &amp; DET Licensing Guide';
const H1 = 'DED E-Services Dubai: The Complete 2026 Guide';
const META_DESC =
  'Learn how DED e-services work in Dubai. Understand the shift to DET &amp; Invest in Dubai, license renewals, trade name search, UAE Pass login, and key fees.';
const FEATURED = '/wp-content/uploads/2026/08/ded-e-services-featured.png';
const INFOGRAPHIC = '/wp-content/uploads/2026/08/e-services-ded-capabilities.png';
const CTA = '/wp-content/uploads/2026/08/ded-dubai-e-services-cta.png';
const PUBLISHED = '2026-08-24T06:00:00+00:00';

const TOC_SECTIONS = [
  'What Are DED E-Services?',
  'What Can You Do on DED E-Services?',
  'How to Register & Log In to DED E-Services?',
  'How to Apply for a Service Online in 3 Steps',
  'DED E-Services Fees',
  'DED E-Services vs Invest in Dubai Platform',
  'E-Services for Individuals, Not Only for Businesses',
  'Problems Users Face on DED E-Services',
  'Final Takeaway',
  'FAQs',
];

const RELATED = [
  {
    postId: '1677',
    slug: 'trade-license-renewal-in-dubai',
    category: 'category-pro-services',
    image: '/wp-content/uploads/2023/03/license-renewal-1-1536x864-2.webp',
    imageAlt: 'trade license renewal in dubai',
    title: 'Trade License Renewal in Dubai: Know the Grace Period, and Penalties',
    excerpt:
      'Need a trade license renewal in Dubai? Follow our 2026 guide on the process, required documents, Ejari checks, and how to avoid monthly fines.',
    authorSlug: 'shak-malik',
    authorName: 'Shak Malik',
    avatar: 'cropped-Group-39933-96x96.png',
  },
  {
    postId: '8476',
    slug: 'ded-licenses-in-dubai',
    category: 'category-uncategorized',
    image: '/wp-content/uploads/2025/03/Types-of-DED-Licenses-in-Dubai-Which-One-Is-Right-for-Your-Business.webp',
    imageAlt: 'types of ded licenses in dubai',
    title: 'Types of DED Licenses in Dubai: Which One Is Right for Your Business?',
    excerpt:
      'Explore the different types of DED licenses in Dubai and find out which one suits your business needs, requirements, and growth plans.',
    authorSlug: 'kane-bernard',
    authorName: 'Kane Bernard',
    avatar: 'cropped-Group-39931-96x96.png',
  },
  {
    postId: '8490',
    slug: 'how-to-start-a-business-in-uae',
    category: 'category-uncategorized',
    image: '/wp-content/uploads/2025/04/How-to-Start-a-Business-in-UAE-Definitive-Guide.webp',
    imageAlt: 'how to start a business in UAE',
    title: 'How to Start a Business in UAE 2026: Price, Procedure, and Regulatory Concerns',
    excerpt:
      'Learn how to start a business in the UAE with a clear guide on licensing, location, costs, and the steps to get operating in 2026.',
    authorSlug: 'kane-bernard',
    authorName: 'Kane Bernard',
    avatar: 'cropped-Group-39931-96x96.png',
  },
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

function relatedLoopItem({ postId, slug, category, image, imageAlt, title, excerpt, authorSlug, authorName, avatar }) {
  const url = `/${slug}/`;
  return `<div data-elementor-type="loop-item" data-elementor-id="5894" class="elementor elementor-5894 e-loop-item e-loop-item-${postId} post-${postId} post type-post status-publish format-standard has-post-thumbnail hentry ${category} ast-article-single" data-elementor-post-type="elementor_library" data-custom-edit-handle="1">
					<section class="elementor-section elementor-top-section elementor-element elementor-element-d3dabbd elementor-section-boxed elementor-section-height-default elementor-section-height-default" data-id="d3dabbd" data-element_type="section" data-e-type="section">
						<div class="elementor-container elementor-column-gap-default">
					<div class="elementor-column elementor-col-100 elementor-top-column elementor-element elementor-element-a830b31" data-id="a830b31" data-element_type="column" data-e-type="column">
			<div class="elementor-widget-wrap elementor-element-populated">
						<div class="elementor-element elementor-element-5ee249c elementor-widget elementor-widget-theme-post-featured-image elementor-widget-image" data-id="5ee249c" data-element_type="widget" data-e-type="widget" data-widget_type="theme-post-featured-image.default">
				<div class="elementor-widget-container">
																<a href="${url}" target="_blank">
							<img width="1500" height="1000" style="width:100%;height:220px;object-fit:cover;display:block;" src="${image}" class="attachment-full size-full wp-image-${postId}" alt="${imageAlt}" />								</a>
															</div>
				</div>
				<div class="elementor-element elementor-element-f1ba8fd elementor-widget elementor-widget-theme-post-title elementor-page-title elementor-widget-heading" data-id="f1ba8fd" data-element_type="widget" data-e-type="widget" data-widget_type="theme-post-title.default">
				<div class="elementor-widget-container">
					<h2 class="elementor-heading-title elementor-size-default"><a href="${url}" target="_blank">${title}</a></h2>				</div>
				</div>
				<div class="elementor-element elementor-element-bf5a7f6 elementor-widget elementor-widget-theme-post-excerpt" data-id="bf5a7f6" data-element_type="widget" data-e-type="widget" data-widget_type="theme-post-excerpt.default">
				<div class="elementor-widget-container">
					<p>${excerpt}				</div>
				</div>
				<section class="elementor-section elementor-inner-section elementor-element elementor-element-b0b500a elementor-section-content-middle elementor-section-boxed elementor-section-height-default elementor-section-height-default" data-id="b0b500a" data-element_type="section" data-e-type="section">
						<div class="elementor-container elementor-column-gap-default">
					<div class="elementor-column elementor-col-50 elementor-inner-column elementor-element elementor-element-f791ecb" data-id="f791ecb" data-element_type="column" data-e-type="column">
			<div class="elementor-widget-wrap elementor-element-populated">
						<div class="elementor-element elementor-element-a2e8035 elementor-widget elementor-widget-post-info" data-id="a2e8035" data-element_type="widget" data-e-type="widget" data-widget_type="post-info.default">
				<div class="elementor-widget-container">
							<ul class="elementor-inline-items elementor-icon-list-items elementor-post-info">
								<li class="elementor-icon-list-item elementor-repeater-item-2ab385c elementor-inline-item" >
						<a href="/author/${authorSlug}/">
											<span class="elementor-icon-list-icon">
								<img width="96" height="96" class="elementor-avatar"  src="/wp-content/uploads/2024/05/${avatar}" alt="Picture of ${authorName}">							</span>
									<span class="elementor-icon-list-text elementor-post-info__item elementor-post-info__item--type-author">
										${authorName}					</span>
									</a>
				</li>
				</ul>
						</div>
				</div>
					</div>
		</div>
				<div class="elementor-column elementor-col-50 elementor-inner-column elementor-element elementor-element-e2de78d" data-id="e2de78d" data-element_type="column" data-e-type="column">
			<div class="elementor-widget-wrap elementor-element-populated">
						<div class="elementor-element elementor-element-7f62f2a elementor-widget elementor-widget-image" data-id="7f62f2a" data-element_type="widget" data-e-type="widget" data-widget_type="image.default">
				<div class="elementor-widget-container">
																<a href="${url}" target="_blank">
							<img width="35" height="34"  src="/wp-content/uploads/2024/10/iconoir_arrow-left.svg" class="attachment-large size-large wp-image-5904" alt="iconoir_arrow-left" />								</a>
															</div>
				</div>
					</div>
		</div>
					</div>
		</section>
					</div>
		</div>
					</div>
		</section>
				</div>`;
}

const p = (text) => `<p><span style="font-weight: 400;">${text}</span></p>`;
const h2 = (text) => `<h2 id="${tocAnchor(text)}"><b>${text}</b></h2>`;
const h3 = (text) => `<h3><b>${text}</b></h3>`;
const h4 = (text) => `<h4><b>${text}</b></h4>`;
const ul = (items) =>
  `<ul>${items.map((i) => `<li style="font-weight: 400;" aria-level="1"><span style="font-weight: 400;">${i}</span></li>`).join('')}</ul>`;
const ol = (items) =>
  `<ol>${items.map((i) => `<li style="font-weight: 400;" aria-level="1"><span style="font-weight: 400;">${i}</span></li>`).join('')}</ol>`;

const compareTable = `<figure class="wp-block-table"><style id="ded-compare-table-css">.ded-compare-wrap{width:100%;overflow-x:auto;margin:1.25rem 0}.ded-compare-table{width:100%;min-width:560px;border-collapse:collapse;font-size:15px;line-height:1.45}.ded-compare-table th,.ded-compare-table td{border:1px solid #d9dee7;padding:12px 14px;text-align:left;vertical-align:top}.ded-compare-table thead th{background:#0F2A48;color:#fff;font-weight:700}.ded-compare-table tbody tr:nth-child(even) td{background:#f7f9fc}</style>
<div class="ded-compare-wrap"><table class="ded-compare-table">
<thead>
<tr>
<th>Feature</th>
<th>DED e-services search term</th>
<th>Invest in Dubai platform</th>
</tr>
</thead>
<tbody>
<tr>
<td><b>Main purpose</b></td>
<td>Legacy term for Dubai economic services</td>
<td>Current unified digital business journey</td>
</tr>
<tr>
<td><b>Mainland business information</b></td>
<td>Associated with DED</td>
<td>Managed within DET-supported digital services</td>
</tr>
<tr>
<td><b>Business setup</b></td>
<td>Available through digital channels</td>
<td>Core business setup journey</td>
</tr>
<tr>
<td><b>Business name search</b></td>
<td>Linked to DED services</td>
<td>Available through Invest in Dubai</td>
</tr>
<tr>
<td><b>License information</b></td>
<td>DED-related searches</td>
<td>Search by license number or Dubai Unified License (DUL) number</td>
</tr>
</tbody>
</table></div></figure>`;

const contentHtml = `
${p('Having a business idea, a ready trade name, and a complete folder of documents does not mean you are ready to trade. You first need to know which platform to apply on. Everything else comes after that.')}
${p('Searching for <b>DED e-services</b> can send you through old DED references, newer Department of Economy and Tourism (DET) pages, Invest in Dubai services, <a href="/uae-pass/">UAE Pass</a> logins, and different licensing journeys.')}
${p('Here is the good news: Dubai has moved toward a more unified digital business environment. Licensing entities and relevant government bodies now support the Invest in Dubai platform, together with DET.')}
${p('This guide explains:')}
${ul([
  'How <a href="/ded-services/">DED e-services</a> in Dubai work today',
  'What has changed under DET and Invest in Dubai',
  'How you can complete key licensing tasks without outdated information',
])}
${buildToc(TOC_SECTIONS)}

${h2('What Are DED E-Services?')}
${p('DED e-services are the online government services historically associated with the Department of Economic Development in Dubai.')}
${p('Today, Dubai’s official economic authority is the Department of Economy and Tourism (DET). Users now complete most digital journeys through the Invest in Dubai platform and connected government channels. Mainland <a href="/trade-license-in-dubai/">business licensing</a> and registration can often be started with a few clicks.')}
${p('In simple terms, the digital journey can help you start a mainland business. You can search and reserve a business name, apply for licenses and approvals, renew eligible licenses, and update business information. You can also search license details using a license number or Dubai Unified License number, and access selected services for online businesses and entrepreneurs.')}

${h3('Who Operates DED Dubai E-Services')}
${p('The name has changed. The need for digital business services has only grown. DET now manages key mainland business registration and licensing functions in Dubai, and the official Invest in Dubai platform already confirms this.')}
${p('This distinction matters. Many older websites still use “DED” as the main brand name. The term remains widely searched, but you should check the current official platform before submitting applications or making payments.')}

${h3('Why Was the Platform Introduced?')}
${p('Starting a business once meant moving between forms, approvals, counters, and payment points. Dubai’s digital approach has reduced that friction.')}
${p('Decree No. 13 of 2024 established a framework for a unified digital platform for establishing companies in Dubai. It calls for:')}
${ul([
  'Smoother investor journeys',
  'Standardised procedures',
  'Unified data registration',
  'One-step fee payment',
  'Instant licensing and renewal',
])}

${h2('What Can You Do on DED E-Services?')}
${p('The exact services available depend on your business activity, legal structure, location, and regulatory requirements.')}
<p><img decoding="async" class="aligncenter size-large wp-image-ded-capabilities" src="${INFOGRAPHIC}" alt="e services ded" width="661" height="712" /></p>

${h3('Services for New Businesses')}
${p('Start by answering three questions:')}
${ul([
  'What will I call the company?',
  'What activity will I carry out?',
  'What approval do I need?',
])}

${h4('Trade Name Reservation')}
${p('The Invest in Dubai platform provides a business-name search journey so you can check name availability before you progress with <a href="/how-to-start-a-business-in-uae/">business setup</a>.')}
${p('Choose the name carefully. A strong brand can lose momentum if it conflicts with naming rules or an existing registration.')}

${h4('Instant License Issuance')}
${p('Dubai’s unified digital platform supports instant licensing as part of a wider effort to fast-track company establishment. Eligibility depends on the business type and applicable conditions. Do not assume every activity qualifies. Always check the requirements linked to your selected activity before you build a launch timeline around instant approval.')}

${h4('Initial Approval Application')}
${p('Some business activities require an approval stage before licensing can move forward. Documents and external approvals vary, especially in regulated sectors where another government authority may need to review the activity. See our guide to <a href="/ded-initial-approval/">DED initial approval</a> if your activity needs this step.')}

${h3('Services for Existing Businesses')}
${p('Your digital journey does not end when you receive a license. You also need tools to manage changes and stay compliant.')}

${h4('License Renewal')}
${p('Dubai’s digital platform framework includes instant license renewal as part of its service model. The actual process and eligibility depend on the license and whether outstanding requirements exist. For a full walkthrough, see <a href="/trade-license-renewal/">trade license renewal</a> and our <a href="/trade-license-renewal-in-dubai/">trade license renewal in Dubai</a> guide.')}

${h4('License Amendment')}
${p('Businesses change over time. A company may add a service, remove an activity, change a legal structure, or update details. Digital journeys can support these changes, but the required approvals vary by activity. Learn more about <a href="/trade-license-amendment/">trade license amendment</a>.')}

${h4('Paying Inspection Fines')}
${p('Before you complete certain business transactions, check whether outstanding penalties or compliance issues will block the application. Use the official service journey linked to your license or regulatory authority.')}

${h2('How to Register &amp; Log In to DED E-Services?')}
${p('Modern DED e-services connect users to Invest in Dubai and other integrated digital channels. Here is how to get started.')}

${h3('Creating an Account')}
${p('Follow these steps:')}
${ol([
  'Open the official Invest in Dubai platform.',
  'Select the relevant business or licensing service.',
  'Enter your personal and business details.',
  'Complete identity or account verification where requested.',
  'Continue with the service application.',
])}
${p('A registration process is included for users creating an account.')}

${h3('Logging In with UAE Pass')}
${p('<a href="/uae-pass/">UAE Pass</a> can simplify identity verification and access to integrated government services where it is available. Use the login option shown in the official service journey and confirm that your UAE Pass details match the information required for the application.')}

${h3('Common Login Errors &amp; Fixes')}
${p('These issues are common when you try to log in:')}
${ul([
  'Incorrect mobile number or email details',
  'Expired identity documents',
  'UAE Pass verification problems',
  'Browser cache issues',
  'Temporary service or payment interruptions',
])}
${p('<b>Our two cents:</b> Try clearing your browser cache or switching browsers first. If the problem continues, use the official platform support channel. Never share your credentials with an unofficial third party.')}

${h2('How to Apply for a Service Online in 3 Steps')}
${p('The process feels difficult until you break it into actions.')}

${h3('Step One: Select Your Service')}
${p('Choose the exact service based on your goal, such as:')}
${ul([
  'Business setup',
  'Name registration',
  '<a href="/trade-license-renewal-in-dubai/">Trade license renewal</a>',
  'Business information search',
])}

${h3('Step Two: Upload Required Documents')}
${p('Upload the documents requested for your selected activity and legal structure.')}

${h3('Step Three: Pay Fees &amp; Track Status')}
${p('Review the fee summary and complete payment through the official method shown in the journey. Then track your application in the same digital flow. Finish one session before starting the next.')}

${h2('DED E-Services Fees')}
${p('There is no single fixed DED e-services fee. Your total cost depends on the business activity, legal structure, license type, number of activities, external approvals, office or address requirements, and any amendment or renewal needs.')}

${h3('Trade License Fees')}
${p('License costs change from case to case. A professional activity and a regulated commercial activity may follow very different fee structures. The safest approach is to generate the official fee summary during your application. Do not rely on a generic price published on an outdated blog. For license types, see <a href="/ded-licenses-in-dubai/">DED licenses in Dubai</a>.')}

${h3('Renewal &amp; Amendment Fees')}
${p('These costs also depend on the specific transaction. Before you pay, check whether your license has extra requirements or outstanding issues that could block completion.')}

${h3('Payment Methods Accepted')}
${p('Payment options can vary by service and digital journey. Follow the payment methods displayed in the official application flow.')}

${h2('DED E-Services vs Invest in Dubai Platform')}
${p('This comparison should clear the confusion.')}
${compareTable}

${h3('What Is Handled on Each Platform?')}
${p('“DED e-services Dubai” is best understood today as a popular search phrase, not a standalone portal covering every business transaction. Invest in Dubai provides:')}
${ul([
  'Business setup information',
  'Name-search tools',
  'License-information search functions',
])}
${p('You can also <a href="/how-to-check-trade-license-online/">check a trade license online</a> using the official license or DUL number.')}

${h3('When Will You Be Redirected Between the Two?')}
${p('Some services involve integrated systems, external regulators, UAE Pass, or other government entities. That is normal. Follow the official redirect and confirm that you remain within a legitimate government or authorised service environment.')}

${h2('E-Services for Individuals, Not Only for Businesses')}
${p('These services are not only for large companies. Individuals can also benefit.')}

${h3('E-Trader License for Home-Based and Social Media Sellers')}
${p('Dubai identifies the E-Trader License as an option for small entrepreneurs selling products and services through social media or online platforms. Availability and eligibility depend on the requirements and the business setup you choose.')}

${h3('Consumer Complaints &amp; Fine Payments')}
${p('Dubai also operates wider digital government channels for customer feedback, complaints, and service participation. The official participation platform connects users with more than 40 government entities and participating organisations.')}
${p('For business-specific fines or complaints, use the exact service linked to the responsible authority.')}

${h2('Problems Users Face on DED E-Services')}
${h3('Document Rejection Reasons')}
${p('Documents are often rejected because of missing information, incorrect file formats, expired documents, mismatched names or details, and missing external approvals. Check every field before submission. One mismatch can delay you far more than five extra minutes of review.')}

${h3('Payment Gateway Issues')}
${p('If a payment fails, confirm that the service session is still active and check whether the amount was deducted. Wait before retrying. Save any transaction reference and contact official support if the status does not update.')}

${h3('When to Use a PRO Service')}
${p('A <a href="/">PRO</a> can help when your case involves multiple approvals, complex documentation, or regulatory coordination. Simple digital services may not require an intermediary. Start with the official journey first. If you still have difficulty, partner with a reliable PRO.')}

<p><a href="/contact-us/"><img decoding="async" class="aligncenter size-large wp-image-ded-cta" src="${CTA}" alt="ded dubai e-services" width="1024" height="545" /></a></p>

${h2('Final Takeaway')}
${p('Switching between separate portals for DED e-services is now outdated. The time you used to spend finding the right channel can go into planning the business itself. Use the current official DET-supported digital journey and verify the exact requirements for your activity. Each completed step moves you closer to the moment the business becomes real.')}
${p('If the process still feels hard, <a href="/contact-us/">KPM PRO</a> can help. The team specialises in business setup, from gathering documents to submitting them successfully through digital channels.')}

${h2('FAQs')}
${h3('What are DED e-services?')}
${p('It is a commonly used term for digital economic and business licensing services operating in Dubai. Now, many mainland business journeys connect with the DET and the Invest in Dubai platform.')}

${h3('How to log in to DED e-services?')}
${p('You can log in to DED e-services by:')}
${ul([
  'Starting with the official service journey',
  'Creating or accessing your account',
  'Using UAE Pass or other login methods',
])}

${h3('Can a Dubai trade license be renewed online through DED e-services?')}
${p('If you fall within an eligible license category, the renewal can be completed through Dubai’s digital business service framework.')}

${h3("What's the difference between DED e-services and Invest in Dubai?")}
${p('<b>DED e-services:</b> It is a legacy search term used for Dubai economic and licensing services.')}
${p('<b>Invest in Dubai:</b> It is part of Dubai’s current unified digital approach for business setup and related licensing journeys.')}

${h3('Do individuals need DED e-services? Or is it only for companies?')}
${p('Individuals can also use relevant digital business services. Dubai recognises the E-Trader License for eligible online and social media business activity.')}

${h3('How much do DED e-services cost?')}
${p('DED e-services costs vary by:')}
${ul(['Service', 'Activity', 'License type', 'Approvals', 'Transaction'])}
${p('For more updated numbers, you can check the official fee summary during the application.')}

<p><script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "What are DED e-services?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "It is a commonly used term for digital economic and business licensing services operating in Dubai. Now, many mainland business journeys connect with the DET and the Invest in Dubai platform."
    }
  },{
    "@type": "Question",
    "name": "How to log in to DED e-services?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "You can log in to DED e-services by starting with the official service journey, creating or accessing your account, and using UAE Pass or other login methods."
    }
  },{
    "@type": "Question",
    "name": "Can a Dubai trade license be renewed online through DED e-services?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "If you fall within an eligible license category, the renewal can be completed through Dubai's digital business service framework."
    }
  },{
    "@type": "Question",
    "name": "What's the difference between DED e-services and Invest in Dubai?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "DED e-services: It is a legacy search term used for Dubai economic and licensing services. Invest in Dubai: It is part of Dubai's current unified digital approach for business setup and related licensing journeys."
    }
  },{
    "@type": "Question",
    "name": "Do individuals need DED e-services? Or is it only for companies?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "Individuals can also use relevant digital business services. Dubai recognises the E-Trader License for eligible online and social media business activity."
    }
  },{
    "@type": "Question",
    "name": "How much do DED e-services cost?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "DED e-services costs vary by service, activity, license type, approvals, and transaction. For more updated numbers, you can check the official fee summary during the application."
    }
  }]
}
</script><!-- Simple Share Buttons Adder (8.5.6) simplesharebuttons.com --></p>
${buildShareBlock(SLUG, 'DED E-Services Dubai: The Complete 2026 Guide')}
`.trim();

let html = templateHtml;

html = html.replaceAll('what-is-corporate-tax-in-uae', SLUG);
html = html.replaceAll('What Is Corporate Tax in UAE? Rates, Filing &amp; 2026 Rules', META_TITLE);
html = html.replaceAll(
  'What is corporate tax in UAE? 9% on profits above AED 375,000. Learn who must pay, how to file on EmaraTax, 2026 penalty changes.',
  META_DESC,
);
html = html.replaceAll('What is Corporate Tax in UAE? A Complete Guide for 2026', H1);
html = html.replace(
  /<link rel="preload" data-rocket-preload as="image"[^>]+>/,
  `<link rel="preload" data-rocket-preload as="image" href="${FEATURED}" fetchpriority="high">`,
);
html = html.replaceAll('/wp-content/uploads/2026/06/What-is-Corporate-Tax-in-UAE.webp', FEATURED);
html = html.replace(
  /<img fetchpriority="high"\s+width="1024" height="683" src="[^"]+" class="attachment-large size-large wp-image-10309" alt="[^"]+"[^/]*\/>/,
  `<img fetchpriority="high" width="1024" height="571" src="${FEATURED}" class="attachment-large size-large wp-image-ded-featured" alt="ded e services" />`,
);

html = html.replace(/postid-10306/, `postid-${POST_ID}`);
html = html.replace(
  /(elementor-location-single post-)10306( post type-post)/,
  `$1${POST_ID}$2`,
);
html = html.replaceAll('tag-corporate-tax-in-uae tag-corporate-tax-uae', 'tag-ded-e-services tag-ded-dubai');
html = html.replaceAll('wpcf7-f4114-p10306', `wpcf7-f4114-p${POST_ID}`);
html = html.replaceAll('value="10306"', `value="${POST_ID}"`);
html = html.replaceAll('/wp-json/wp/v2/posts/10306', `/wp-json/wp/v2/posts/${POST_ID}`);
html = html.replaceAll('?p=10306', `?p=${POST_ID}`);
html = html.replaceAll('/wp-content/uploads/2026/06/What-is-Corporate-Tax-in-UAE', FEATURED.replace('.png', ''));
html = html.replaceAll('What-is-Corporate-Tax-in-UAE', 'ded-e-services-featured');

html = html.replace(
  /<img fetchpriority="high"\s+width="1024" height="683"[\s\S]*?\/>/,
  `<img fetchpriority="high" width="1024" height="571" src="${FEATURED}" class="attachment-large size-large wp-image-ded-featured" alt="ded e services" />`,
);

const contentStart = html.indexOf(
  '<div class="elementor-element elementor-element-2bfb843 elementor-widget elementor-widget-theme-post-content"',
);
const containerStart =
  html.indexOf('<div class="elementor-widget-container">', contentStart) +
  '<div class="elementor-widget-container">'.length;
const authorBoxStart = html.indexOf(
  '<div class="elementor-element elementor-element-d889927 elementor-author-box',
  contentStart,
);
const beforeContent = html.slice(0, containerStart);
const afterContent = html.slice(authorBoxStart);

html = beforeContent + '\n\t\t\t\t\t' + contentHtml + '\n\t\t\t\t' + afterContent;

const relatedStart = html.indexOf('<p>Relative Articles</p>');
const loopContainerStart = html.indexOf('<div class="elementor-loop-container elementor-grid" role="list">', relatedStart);
const styleEnd = html.indexOf('</style>', loopContainerStart) + '</style>'.length;
const loopStart = html.indexOf('<div data-elementor-type="loop-item"', styleEnd);
const loopTailMarker = '\n\t\t\t\t</div>\n\t\t\t\t</div>\n\t\t\n\t\t\t\t\t\t</div>';
const loopTailStart = html.indexOf(loopTailMarker, loopStart);
if (loopStart === -1 || loopTailStart === -1) {
  throw new Error('Could not locate related articles loop block in template');
}
const newRelatedBlock = RELATED.map((item) => relatedLoopItem(item)).join('\n\t\t\t\t');
html = html.slice(0, loopStart) + newRelatedBlock + html.slice(loopTailStart);

html = html.replace(
  /<style id="loop-5894">([\s\S]*?)<\/style>/,
  (match, css) =>
    `<style id="loop-5894">${css}.elementor-5894 .elementor-element.elementor-element-5ee249c img{width:100%;height:220px;object-fit:cover;display:block;}</style>`,
);

html = html.replaceAll('2026-06-08T04:56:12+00:00', PUBLISHED);
html = html.replaceAll('2026-07-20T06:19:05+00:00', PUBLISHED);
html = html.replace(
  /Prepared for Astro Phase 1[^<]+/,
  `Prepared for Astro Phase 1 · ${SLUG} · ${new Date().toISOString()}`,
);

html = html.replace(
  /\s*<section class="elementor-section elementor-top-section elementor-element elementor-element-ad81016[\s\S]*?<\/section>\s*(?=<\/div>\s*<\/main)/,
  '\n',
);

writeFileSync(OUT, html);
console.log('Wrote', OUT);

const orderPath = join(ROOT, 'src/data/wp-blog-order.json');
let order = [];
try {
  order = JSON.parse(readFileSync(orderPath, 'utf8'));
  if (!Array.isArray(order)) order = [];
} catch {
  order = [];
}
order = [SLUG, ...order.filter((s) => s !== SLUG)];
writeFileSync(orderPath, `${JSON.stringify(order, null, 2)}\n`);
console.log('Insights order: prepended', SLUG);
