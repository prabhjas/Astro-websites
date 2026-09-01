#!/usr/bin/env node
/**
 * Align /eor-main/ with Figma screenshots: copy, section order, and structure.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PAGES_PATH = path.join(ROOT, 'src/data/pages.json');
const ASSET = '/assets/images/2026/eor-main';

function removeTopSection(html, id) {
  return html.replace(
    new RegExp(
      `<section class="elementor-section elementor-top-section elementor-element elementor-element-${id}[\\s\\S]*?</section>\\s*`,
      'g',
    ),
    '',
  );
}

function replaceWidgetContainer(html, widgetId, innerHtml) {
  const anchor = `data-id="${widgetId}"`;
  const start = html.indexOf(anchor);
  if (start === -1) return html;
  const containerOpen = html.indexOf('<div class="elementor-widget-container">', start);
  if (containerOpen === -1) return html;
  const contentStart = containerOpen + '<div class="elementor-widget-container">'.length;
  const close = html.indexOf('</div>\n\t\t\t\t</div>', contentStart);
  if (close === -1) return html;
  return html.slice(0, contentStart) + innerHtml + html.slice(close);
}

function replaceButtonText(html, widgetId, text) {
  const anchor = `data-id="${widgetId}"`;
  const start = html.indexOf(anchor);
  if (start === -1) return html;
  const btn = html.indexOf('elementor-button-text', start);
  if (btn === -1) return html;
  const gt = html.indexOf('>', btn);
  const close = html.indexOf('</', gt);
  return html.slice(0, gt + 1) + text + html.slice(close);
}

function imageBox(id, icon, title, description, extraClass = '') {
  return `<div class="elementor-element elementor-element-${id} elementor-position-top elementor-widget elementor-widget-image-box ${extraClass}" data-id="${id}" data-element_type="widget" data-e-type="widget" data-widget_type="image-box.default">
				<div class="elementor-widget-container">
					<div class="elementor-image-box-wrapper"><figure class="elementor-image-box-img"><img decoding="async" src="${icon}" alt="" /></figure><div class="elementor-image-box-content"><h3 class="elementor-image-box-title">${title}</h3><p class="elementor-image-box-description">${description}</p></div></div>				</div>
				</div>`;
}

function ctaBanner(id, headingId, btnId, title, subtitle, btnText, btnHref, sectionClass) {
  const sub = subtitle
    ? `<div class="elementor-element elementor-element-${id}sub elementor-widget elementor-widget-text-editor" data-id="${id}sub" data-element_type="widget" data-e-type="widget" data-widget_type="text-editor.default"><div class="elementor-widget-container"><p>${subtitle}</p></div></div>`
    : '';
  return `<section class="elementor-section elementor-top-section elementor-element elementor-element-${id} elementor-section-boxed elementor-section-height-default elementor-section-height-default ${sectionClass}" data-id="${id}" data-element_type="section" data-e-type="section">
						<div class="elementor-container elementor-column-gap-default">
					<div class="elementor-column elementor-col-100 elementor-top-column elementor-element elementor-element-${id}a" data-id="${id}a" data-element_type="column" data-e-type="column">
			<div class="elementor-widget-wrap elementor-element-populated">
						<div class="elementor-element elementor-element-${headingId} elementor-widget elementor-widget-heading" data-id="${headingId}" data-element_type="widget" data-e-type="widget" data-widget_type="heading.default">
				<div class="elementor-widget-container"><h2 class="elementor-heading-title elementor-size-default">${title}</h2></div></div>
				${sub}
				<div class="elementor-element elementor-element-${btnId} elementor-widget elementor-widget-button" data-id="${btnId}" data-element_type="widget" data-e-type="widget" data-widget_type="button.default">
				<div class="elementor-widget-container"><div class="elementor-button-wrapper"><a class="elementor-button elementor-button-link elementor-size-sm" href="${btnHref}"><span class="elementor-button-content-wrapper"><span class="elementor-button-text">${btnText}</span></span></a></div></div></div>
					</div></div></div></section>`;
}

const whyCards = `<section class="elementor-section elementor-inner-section elementor-element elementor-element-0db380c elementor-section-boxed elementor-section-height-default elementor-section-height-default" data-id="0db380c" data-element_type="section" data-e-type="section">
						<div class="elementor-container elementor-column-gap-default">
					<div class="elementor-column elementor-col-50 elementor-inner-column elementor-element elementor-element-2c8f357 eor-card-blue" data-id="2c8f357" data-element_type="column" data-e-type="column">
			<div class="elementor-widget-wrap elementor-element-populated">${imageBox('7652827', `${ASSET}/Faster-global-hiring.svg`, 'Faster global hiring', 'An EOR enables companies to hire internationally in days instead of months—ideal for testing new markets or responding quickly to talent needs.')}</div></div>
				<div class="elementor-column elementor-col-50 elementor-inner-column elementor-element elementor-element-89e5197 eor-card-red" data-id="89e5197" data-element_type="column" data-e-type="column">
			<div class="elementor-widget-wrap elementor-element-populated">${imageBox('e7a1c04', `${ASSET}/Reduced-compliance-risk.svg`, 'Reduced compliance risk', 'Employment laws vary widely by country. An EOR remains responsible for compliance with payroll, tax, benefits, termination rules, and statutory reporting.')}</div></div></div></section>
				<section class="elementor-section elementor-inner-section elementor-element elementor-element-e7a1c02 elementor-section-boxed elementor-section-height-default elementor-section-height-default" data-id="e7a1c02" data-element_type="section" data-e-type="section">
						<div class="elementor-container elementor-column-gap-default">
					<div class="elementor-column elementor-col-50 elementor-inner-column elementor-element elementor-element-e7a1c03 eor-card-orange" data-id="e7a1c03" data-element_type="column" data-e-type="column">
			<div class="elementor-widget-wrap elementor-element-populated">${imageBox('e7a1c01', `${ASSET}/No-local-entity-required.svg`, 'No local entity required', 'Setting up a legal entity is costly and time-consuming. An EOR allows companies to hire without long-term legal commitments.')}</div></div>
				<div class="elementor-column elementor-col-50 elementor-inner-column elementor-element elementor-element-e7a1c05 eor-card-purple" data-id="e7a1c05" data-element_type="column" data-e-type="column">
			<div class="elementor-widget-wrap elementor-element-populated">${imageBox('e7a1c06', `${ASSET}/Scalable-hiring-model.svg`, 'Scalable hiring model', 'Employer of Record arrangements work for hiring a single employee or scaling teams across multiple countries without duplicating HR infrastructure.')}</div></div></div></section>`;

const costsSection = `<section class="elementor-section elementor-top-section elementor-element elementor-element-e7a2cost elementor-section-boxed elementor-section-height-default elementor-section-height-default eor-costs" data-id="e7a2cost" data-element_type="section" data-e-type="section">
						<div class="elementor-container elementor-column-gap-default">
					<div class="elementor-column elementor-col-50 elementor-top-column elementor-element elementor-element-e7a2costl" data-id="e7a2costl" data-element_type="column" data-e-type="column">
			<div class="elementor-widget-wrap elementor-element-populated">
						<div class="elementor-element elementor-element-e7a2costh elementor-widget elementor-widget-heading" data-id="e7a2costh" data-element_type="widget" data-e-type="widget" data-widget_type="heading.default"><div class="elementor-widget-container"><h2 class="elementor-heading-title elementor-size-default">Employer of Record Costs: What Companies Should Expect</h2></div></div>
				<div class="elementor-element elementor-element-e7a2costl1 elementor-widget elementor-widget-icon-list" data-id="e7a2costl1" data-element_type="widget" data-e-type="widget" data-widget_type="icon-list.default"><div class="elementor-widget-container"><ul class="elementor-icon-list-items eor-check-purple"><li class="elementor-icon-list-item"><span class="elementor-icon-list-text">Flat monthly fee per employee</span></li><li class="elementor-icon-list-item"><span class="elementor-icon-list-text">Percentage of gross payroll</span></li><li class="elementor-icon-list-item"><span class="elementor-icon-list-text">Hybrid pricing (base fee + variable costs)</span></li></ul></div></div>
				<div class="elementor-element elementor-element-e7a2costp elementor-widget elementor-widget-text-editor" data-id="e7a2costp" data-element_type="widget" data-e-type="widget" data-widget_type="text-editor.default"><div class="elementor-widget-container"><p>Employer of Record pricing varies by provider and country, but most EORs follow one of these models:</p></div></div>
					</div></div>
				<div class="elementor-column elementor-col-50 elementor-top-column elementor-element elementor-element-e7a2costr" data-id="e7a2costr" data-element_type="column" data-e-type="column">
			<div class="elementor-widget-wrap elementor-element-populated">
						<div class="elementor-element elementor-element-e7a2costc1 eor-cost-card elementor-widget elementor-widget-text-editor" data-id="e7a2costc1" data-element_type="widget" data-e-type="widget" data-widget_type="text-editor.default"><div class="elementor-widget-container"><p><strong>Costs are influenced by:</strong></p><ul class="eor-check-red"><li>Country of employment</li><li>Local statutory benefits and employer contributions</li><li>Payroll complexity</li><li>Visa or work permit support requirements</li></ul></div></div>
				<div class="elementor-element elementor-element-e7a2costc2 eor-cost-card elementor-widget elementor-widget-text-editor" data-id="e7a2costc2" data-element_type="widget" data-e-type="widget" data-widget_type="text-editor.default"><div class="elementor-widget-container"><p><strong>While EOR may appear more expensive than local payroll on paper, it often replaces:</strong></p><ul class="eor-check-red"><li>Entity setup costs</li><li>Local legal retainers</li><li>In-country HR and payroll teams</li><li>Compliance and reporting overhead</li></ul></div></div>
				<div class="elementor-element elementor-element-e7a2costn elementor-widget elementor-widget-text-editor" data-id="e7a2costn" data-element_type="widget" data-e-type="widget" data-widget_type="text-editor.default"><div class="elementor-widget-container"><p>For many companies, EOR is <strong>more cost-effective in the short to medium term.</strong></p></div></div>
					</div></div></div></section>`;

const businessSection = `<section class="elementor-section elementor-top-section elementor-element elementor-element-e7a1feat elementor-section-boxed elementor-section-height-default elementor-section-height-default eor-business" data-id="e7a1feat" data-element_type="section" data-e-type="section">
						<div class="elementor-container elementor-column-gap-default">
					<div class="elementor-column elementor-col-100 elementor-top-column elementor-element elementor-element-e7a1feata" data-id="e7a1feata" data-element_type="column" data-e-type="column">
			<div class="elementor-widget-wrap elementor-element-populated">
						<div class="elementor-element elementor-element-e7a1feat0 elementor-widget elementor-widget-heading" data-id="e7a1feat0" data-element_type="widget" data-e-type="widget" data-widget_type="heading.default"><div class="elementor-widget-container"><p class="elementor-heading-title eor-overline">BUSINESS IMPACT DELIVERED WITH CONNECT RESOURCES</p></div></div>
				<div class="elementor-element elementor-element-e7a1feath elementor-widget elementor-widget-heading" data-id="e7a1feath" data-element_type="widget" data-e-type="widget" data-widget_type="heading.default"><div class="elementor-widget-container"><h2 class="elementor-heading-title elementor-size-default">Helping Businesses Expand Faster, Reduce Risk, and Scale Globally</h2></div></div>
				<div class="elementor-element elementor-element-e7a1featp elementor-widget elementor-widget-text-editor" data-id="e7a1featp" data-element_type="widget" data-e-type="widget" data-widget_type="text-editor.default"><div class="elementor-widget-container"><p>Connect Resources simplifies global employment by combining EOR services with in-house immigration, HR, and payroll expertise—so you can hire internationally with confidence.</p></div></div>
				<section class="elementor-section elementor-inner-section elementor-element elementor-element-e7a1featg elementor-section-boxed elementor-section-height-default elementor-section-height-default" data-id="e7a1featg" data-element_type="section" data-e-type="section"><div class="elementor-container elementor-column-gap-default eor-business-grid">
					<div class="elementor-column elementor-col-33 elementor-inner-column elementor-element elementor-element-e7bf1" data-id="e7bf1" data-element_type="column" data-e-type="column"><div class="elementor-widget-wrap elementor-element-populated">${imageBox('e7bf1a', `${ASSET}/Hire-Across-150-Countries.svg`, 'Hire Across 150+ Countries', 'Expand into new markets without setting up local legal entities—hire full-time employees compliantly in the countries that matter to your business.')}</div></div>
					<div class="elementor-column elementor-col-33 elementor-inner-column elementor-element elementor-element-e7bf2" data-id="e7bf2" data-element_type="column" data-e-type="column"><div class="elementor-widget-wrap elementor-element-populated">${imageBox('e7bf2a', `${ASSET}/Faster-Global-Onboarding.svg`, 'Faster Global Onboarding', 'Onboard international employees quickly with compliant contracts, payroll setup, and local benefits aligned to each market.')}</div></div>
					<div class="elementor-column elementor-col-33 elementor-inner-column elementor-element elementor-element-e7bf3" data-id="e7bf3" data-element_type="column" data-e-type="column"><div class="elementor-widget-wrap elementor-element-populated">${imageBox('e7bf3a', `${ASSET}/100-Local-Compliance.svg`, '100% Local Compliance', 'Stay compliant with local labor laws, tax obligations, and statutory reporting in every country where you hire through our EOR model.')}</div></div>
					<div class="elementor-column elementor-col-33 elementor-inner-column elementor-element elementor-element-e7bf4" data-id="e7bf4" data-element_type="column" data-e-type="column"><div class="elementor-widget-wrap elementor-element-populated">${imageBox('e7bf4a', `${ASSET}/Simplified-Global-Payroll.svg`, 'Simplified Global Payroll', 'Pay employees in multiple currencies through a single monthly invoice—without conversion headaches or fragmented payroll systems.')}</div></div>
					<div class="elementor-column elementor-col-33 elementor-inner-column elementor-element elementor-element-e7bf5" data-id="e7bf5" data-element_type="column" data-e-type="column"><div class="elementor-widget-wrap elementor-element-populated">${imageBox('e7bf5a', `${ASSET}/Scale-Without-Operational-Complexity.svg`, 'Scale Without Operational Complexity', 'Grow your global workforce without duplicating HR infrastructure or setting up overseas entities for every new hire.')}</div></div>
					<div class="elementor-column elementor-col-33 elementor-inner-column elementor-element elementor-element-e7bf6" data-id="e7bf6" data-element_type="column" data-e-type="column"><div class="elementor-widget-wrap elementor-element-populated">${imageBox('e7bf6a', `${ASSET}/Dedicated-HR-Legal-Experts.svg`, 'Dedicated HR &amp; Legal Experts', 'Get ongoing support from specialists who understand MENA employment regulations, immigration, and workforce management.')}</div></div>
				</div></section>
				<div class="elementor-element elementor-element-e7a1featbtn elementor-align-center elementor-widget elementor-widget-button" data-id="e7a1featbtn" data-element_type="widget" data-e-type="widget" data-widget_type="button.default"><div class="elementor-widget-container"><div class="elementor-button-wrapper"><a class="elementor-button elementor-button-link elementor-size-sm" href="/contact-us/"><span class="elementor-button-content-wrapper"><span class="elementor-button-text">Book a Demo</span></span></a></div></div></div>
					</div></div></div></section>`;

const pricingCta = ctaBanner(
  'e7a2price',
  'e7a2priceh',
  'e7a2priceb',
  'Get Your EOR Pricing in Under 2 Minutes',
  'Receive a customised pricing estimate based on your hiring plans.',
  'Get Instant Quote',
  '/contact-us/',
  'eor-pricing-cta',
);

const faqSection = `<section class="elementor-section elementor-top-section elementor-element elementor-element-e7a1faq elementor-section-boxed elementor-section-height-default elementor-section-height-default eor-faq-section" data-id="e7a1faq" data-element_type="section" data-e-type="section">
						<div class="elementor-container elementor-column-gap-default">
					<div class="elementor-column elementor-col-40 elementor-top-column elementor-element elementor-element-e7a1faql" data-id="e7a1faql" data-element_type="column" data-e-type="column">
			<div class="elementor-widget-wrap elementor-element-populated">
						<div class="elementor-element elementor-element-e7a1faqh elementor-widget elementor-widget-heading" data-id="e7a1faqh" data-element_type="widget" data-e-type="widget" data-widget_type="heading.default"><div class="elementor-widget-container"><h2 class="elementor-heading-title elementor-size-default">FAQs</h2></div></div>
				<div class="elementor-element elementor-element-e7a1faqb elementor-widget elementor-widget-button" data-id="e7a1faqb" data-element_type="widget" data-e-type="widget" data-widget_type="button.default"><div class="elementor-widget-container"><div class="elementor-button-wrapper"><a class="elementor-button elementor-button-link elementor-size-sm eor-btn-outline" href="/contact-us/"><span class="elementor-button-content-wrapper"><span class="elementor-button-text">Contact Us</span></span></a></div></div></div>
					</div></div>
				<div class="elementor-column elementor-col-60 elementor-top-column elementor-element elementor-element-e7a1faqr" data-id="e7a1faqr" data-element_type="column" data-e-type="column">
			<div class="elementor-widget-wrap elementor-element-populated">
						<div class="elementor-element elementor-element-e7a1faqw elementor-widget elementor-widget-accordion" data-id="e7a1faqw" data-element_type="widget" data-e-type="widget" data-widget_type="accordion.default"><div class="elementor-widget-container"><div class="elementor-accordion">
							<div class="elementor-accordion-item"><div id="elementor-tab-title-e7f1" class="elementor-tab-title" data-tab="1" role="button"><span class="elementor-accordion-icon elementor-accordion-icon-right" aria-hidden="true"><span class="elementor-accordion-icon-closed"><i class="fas fa-chevron-down"></i></span><span class="elementor-accordion-icon-opened"><i class="fas fa-chevron-up"></i></span></span><a class="elementor-accordion-title" tabindex="0">What is an Employer of Record (EOR)?</a></div><div id="elementor-tab-content-e7f1" class="elementor-tab-content elementor-clearfix" data-tab="1"><p>An Employer of Record is a third-party organisation that legally employs workers on behalf of your company while you manage day-to-day work and performance.</p></div></div>
							<div class="elementor-accordion-item"><div id="elementor-tab-title-e7f2" class="elementor-tab-title" data-tab="2" role="button"><span class="elementor-accordion-icon elementor-accordion-icon-right" aria-hidden="true"><span class="elementor-accordion-icon-closed"><i class="fas fa-chevron-down"></i></span><span class="elementor-accordion-icon-opened"><i class="fas fa-chevron-up"></i></span></span><a class="elementor-accordion-title" tabindex="0">How is an EOR different from a PEO?</a></div><div id="elementor-tab-content-e7f2" class="elementor-tab-content elementor-clearfix" data-tab="2"><p>A PEO typically requires co-employment and often a local entity. An EOR becomes the sole legal employer when you have no local presence.</p></div></div>
							<div class="elementor-accordion-item"><div id="elementor-tab-title-e7f3" class="elementor-tab-title" data-tab="3" role="button"><span class="elementor-accordion-icon elementor-accordion-icon-right" aria-hidden="true"><span class="elementor-accordion-icon-closed"><i class="fas fa-chevron-down"></i></span><span class="elementor-accordion-icon-opened"><i class="fas fa-chevron-up"></i></span></span><a class="elementor-accordion-title" tabindex="0">Which countries does Connect Resources support?</a></div><div id="elementor-tab-content-e7f3" class="elementor-tab-content elementor-clearfix" data-tab="3"><p>We support the UAE, Saudi Arabia, Qatar, Oman, Kuwait, Jordan, Egypt, Lebanon, and additional markets across MENA and beyond.</p></div></div>
							<div class="elementor-accordion-item"><div id="elementor-tab-title-e7f4" class="elementor-tab-title" data-tab="4" role="button"><span class="elementor-accordion-icon elementor-accordion-icon-right" aria-hidden="true"><span class="elementor-accordion-icon-closed"><i class="fas fa-chevron-down"></i></span><span class="elementor-accordion-icon-opened"><i class="fas fa-chevron-up"></i></span></span><a class="elementor-accordion-title" tabindex="0">How quickly can I hire through an EOR?</a></div><div id="elementor-tab-content-e7f4" class="elementor-tab-content elementor-clearfix" data-tab="4"><p>Most clients onboard employees in days rather than months, depending on country requirements and documentation.</p></div></div>
						</div></div></div>
					</div></div></div></section>`;

const pages = JSON.parse(fs.readFileSync(PAGES_PATH, 'utf8'));
const idx = pages.findIndex((p) => p.path === '/eor-main/');
let body = pages[idx].bodyHtml;

for (const id of ['e7a0cta1', 'e7a1cta1', 'e7a1cr01', 'e7a1cta2']) {
  body = removeTopSection(body, id);
}

body = replaceWidgetContainer(
  body,
  '715d219',
  '<p>An <strong>Employer of Record (EOR)</strong> is a third-party organization that legally employs workers on behalf of another company. It enables businesses to hire employees in countries where they do not have a local legal entity, while remaining compliant with local labor, tax, and employment regulations.</p>',
);

body = replaceWidgetContainer(
  body,
  '5c20292',
  `<ul class="elementor-icon-list-items eor-check-orange"><li class="elementor-icon-list-item"><span class="elementor-icon-list-text">The employee signs a <strong>locally compliant employment contract</strong> with the EOR</span></li><li class="elementor-icon-list-item"><span class="elementor-icon-list-text">The EOR manages <strong>payroll, tax withholding, statutory benefits, and labor law compliance</strong></span></li><li class="elementor-icon-list-item"><span class="elementor-icon-list-text">The client company retains <strong>full operational control</strong> over day-to-day work and performance</span></li></ul>`,
);

body = replaceWidgetContainer(body, '95efc83', '<div class="elementor-image-box-wrapper"><div class="elementor-image-box-content"><h3 class="elementor-image-box-title">Since 2016</h3><p class="elementor-image-box-description">UAE payroll specialists</p></div></div>');
body = replaceWidgetContainer(body, '2f04023', '<div class="elementor-image-box-wrapper"><div class="elementor-image-box-content"><h3 class="elementor-image-box-title">100%</h3><p class="elementor-image-box-description">On-time WPS accuracy SLA</p></div></div>');
body = replaceWidgetContainer(body, '92400e8', '<div class="elementor-image-box-wrapper"><div class="elementor-image-box-content"><h3 class="elementor-image-box-title">0</h3><p class="elementor-image-box-description">MOHRE penalties for our clients</p></div></div>');

body = body.replace(
  /<section class="elementor-section elementor-inner-section elementor-element elementor-element-0db380c[\s\S]*?<\/section>\s*<section class="elementor-section elementor-inner-section elementor-element elementor-element-e7a1c02[\s\S]*?<\/section>/,
  whyCards,
);

body = replaceButtonText(body, '9caa5c6', 'Talk to an EOR Expert');

body = body.replace(
  /<section class="elementor-section elementor-top-section elementor-element elementor-element-e7a1feat[\s\S]*?<\/section>\s*(?=<section class="elementor-section elementor-top-section elementor-element elementor-element-e7a1test)/,
  businessSection,
);

body = body.replace(/What our clients say/g, 'Hear it from our Customers');

body = body.replace(
  /<section class="elementor-section elementor-top-section elementor-element elementor-element-e7a1faq[\s\S]*?<\/section>/,
  faqSection,
);

if (!body.includes('elementor-element-e7a2cost')) {
  body = body.replace(
    '<section class="elementor-section elementor-top-section elementor-element elementor-element-e7a1feat',
    costsSection + '<section class="elementor-section elementor-top-section elementor-element elementor-element-e7a1feat',
  );
}

if (!body.includes('elementor-element-e7a2price')) {
  body = body.replace(
    '<section class="elementor-section elementor-top-section elementor-element elementor-element-e7a1cta3',
    pricingCta + '<section class="elementor-section elementor-top-section elementor-element elementor-element-e7a1cta3',
  );
}

body = body.replace(
  /elementor-element-e7a1cta3[\s\S]{0,1200}?Get expert guidance on Employer of Record services/,
  (m) => m.replace('Get expert guidance on Employer of Record services', 'Need to Hire Quickly?'),
);
body = replaceButtonText(body, 'e7a1b04', 'VIEW HIRING TIMELINE');
body = body.replace(
  /data-id="e7a1cta3sub"[\s\S]{0,200}?<\/div>\s*<\/div>/,
  '',
);
body = replaceWidgetContainer(
  body,
  'e7a1cta3sub',
  '<p>See how fast you can onboard employees across different countries.</p>',
);

pages[idx].bodyHtml = body;
pages[idx].content = body;
fs.writeFileSync(PAGES_PATH, JSON.stringify(pages, null, 2) + '\n');
console.log('Aligned /eor-main/ with Figma structure and copy.');
