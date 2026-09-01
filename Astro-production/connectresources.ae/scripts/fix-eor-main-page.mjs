#!/usr/bin/env node
/**
 * Fix /eor-main/ page content: strip Figma export garbage, restore copy,
 * complete benefit cards, and append missing sections from the Figma design.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PAGES_PATH = path.join(ROOT, 'src/data/pages.json');
const ASSET = '/assets/images/2026/eor-main';

function stripFigmaMetadata(html) {
  return html
    .replace(/<span data-metadata="(?:[^"\\]|\\.)*"><\/span>/gi, '')
    .replace(/<span data-buffer="(?:[^"\\]|\\.)*"><\/span>/gi, '')
    .replace(/<span data-metadata="[^"]*"><\/span>/gi, '')
    .replace(/<span data-buffer="[^"]*"><\/span>/gi, '');
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

function replaceHeadingTitle(html, widgetId, titleHtml) {
  const anchor = `data-id="${widgetId}"`;
  const start = html.indexOf(anchor);
  if (start === -1) return html;
  const open = html.indexOf('class="elementor-heading-title', start);
  if (open === -1) return html;
  const gt = html.indexOf('>', open);
  const close = html.indexOf('</', gt);
  return html.slice(0, gt + 1) + titleHtml + html.slice(close);
}

function replaceInnerSection(html, sectionId, newSectionHtml) {
  const re = new RegExp(
    `<section class="elementor-section elementor-inner-section elementor-element elementor-element-${sectionId}[\\s\\S]*?</section>`,
  );
  return html.replace(re, newSectionHtml);
}

function imageBox(id, icon, title, description) {
  const titleHtml = title
    ? `<h3 class="elementor-image-box-title">${title}</h3>`
    : '';
  return `<div class="elementor-element elementor-element-${id} elementor-position-top elementor-widget elementor-widget-image-box" data-id="${id}" data-element_type="widget" data-e-type="widget" data-widget_type="image-box.default">
				<div class="elementor-widget-container">
					<div class="elementor-image-box-wrapper"><figure class="elementor-image-box-img"><img decoding="async" src="${icon}" class="attachment-full size-full" alt="" /></figure><div class="elementor-image-box-content">${titleHtml}<p class="elementor-image-box-description">${description}</p></div></div>				</div>
				</div>`;
}

const whyCardsSection = `<section class="elementor-section elementor-inner-section elementor-element elementor-element-0db380c elementor-section-boxed elementor-section-height-default elementor-section-height-default" data-id="0db380c" data-element_type="section" data-e-type="section">
						<div class="elementor-container elementor-column-gap-default">
					<div class="elementor-column elementor-col-50 elementor-inner-column elementor-element elementor-element-2c8f357" data-id="2c8f357" data-element_type="column" data-e-type="column">
			<div class="elementor-widget-wrap elementor-element-populated">
						${imageBox('7652827', `${ASSET}/Faster-global-hiring.svg`, 'Faster global hiring', 'An EOR enables companies to hire internationally in days instead of months—ideal for testing new markets or responding quickly to talent needs.')}
					</div>
		</div>
				<div class="elementor-column elementor-col-50 elementor-inner-column elementor-element elementor-element-89e5197" data-id="89e5197" data-element_type="column" data-e-type="column">
			<div class="elementor-widget-wrap elementor-element-populated">
						${imageBox('e7a1c01', `${ASSET}/No-local-entity-required.svg`, 'No local entity required', 'Setting up a legal entity is costly and time-consuming. An EOR allows companies to hire without long-term legal commitments.')}
					</div>
		</div>
					</div>
		</section>
				<section class="elementor-section elementor-inner-section elementor-element elementor-element-e7a1c02 elementor-section-boxed elementor-section-height-default elementor-section-height-default" data-id="e7a1c02" data-element_type="section" data-e-type="section">
						<div class="elementor-container elementor-column-gap-default">
					<div class="elementor-column elementor-col-50 elementor-inner-column elementor-element elementor-element-e7a1c03" data-id="e7a1c03" data-element_type="column" data-e-type="column">
			<div class="elementor-widget-wrap elementor-element-populated">
						${imageBox('e7a1c04', `${ASSET}/Reduced-compliance-risk.svg`, 'Reduced compliance risk', 'Employment laws vary widely by country. An EOR remains responsible for compliance with payroll, tax, benefits, termination rules, and statutory reporting.')}
					</div>
		</div>
				<div class="elementor-column elementor-col-50 elementor-inner-column elementor-element elementor-element-e7a1c05" data-id="e7a1c05" data-element_type="column" data-e-type="column">
			<div class="elementor-widget-wrap elementor-element-populated">
						${imageBox('e7a1c06', `${ASSET}/Scalable-hiring-model.svg`, 'Scalable hiring model', 'Employer of Record arrangements work for hiring a single employee or scaling teams across multiple countries without duplicating HR infrastructure.')}
					</div>
		</div>
					</div>
		</section>`;

function ctaSection(id, headingId, btnId, title, btnText, btnHref, bgClass) {
  return `<section class="elementor-section elementor-top-section elementor-element elementor-element-${id} elementor-section-boxed elementor-section-height-default elementor-section-height-default ${bgClass}" data-id="${id}" data-element_type="section" data-e-type="section" data-settings="{&quot;background_background&quot;:&quot;classic&quot;}">
						<div class="elementor-container elementor-column-gap-default">
					<div class="elementor-column elementor-col-100 elementor-top-column elementor-element elementor-element-${id}a" data-id="${id}a" data-element_type="column" data-e-type="column">
			<div class="elementor-widget-wrap elementor-element-populated">
						<div class="elementor-element elementor-element-${headingId} elementor-widget elementor-widget-heading" data-id="${headingId}" data-element_type="widget" data-e-type="widget" data-widget_type="heading.default">
				<div class="elementor-widget-container">
					<h2 class="elementor-heading-title elementor-size-default">${title}</h2>				</div>
				</div>
				<div class="elementor-element elementor-element-${btnId} elementor-widget elementor-widget-button" data-id="${btnId}" data-element_type="widget" data-e-type="widget" data-widget_type="button.default">
				<div class="elementor-widget-container">
									<div class="elementor-button-wrapper">
					<a class="elementor-button elementor-button-link elementor-size-sm" href="${btnHref}">
						<span class="elementor-button-content-wrapper">
									<span class="elementor-button-text">${btnText}</span>
					</span>
					</a>
				</div>				</div>
				</div>
					</div>
		</div>
					</div>
		</section>`;
}

function testimonialCard(id, quote, name, role, avatar) {
  return `<div class="elementor-column elementor-col-33 elementor-inner-column elementor-element elementor-element-${id}" data-id="${id}" data-element_type="column" data-e-type="column">
			<div class="elementor-widget-wrap elementor-element-populated">
						<div class="elementor-element elementor-element-${id}t elementor-widget elementor-widget-testimonial" data-id="${id}t" data-element_type="widget" data-e-type="widget" data-widget_type="testimonial.default">
				<div class="elementor-widget-container">
					<div class="elementor-testimonial-wrapper">
						<div class="elementor-testimonial-content">"${quote}"</div>
						<div class="elementor-testimonial-meta elementor-has-image">
							<div class="elementor-testimonial-meta-inner">
								<div class="elementor-testimonial-image"><img decoding="async" src="${avatar}" alt="${name}"></div>
								<div class="elementor-testimonial-details">
									<div class="elementor-testimonial-name">${name}</div>
									<div class="elementor-testimonial-job">${role}</div>
								</div>
							</div>
						</div>
					</div>
				</div>
				</div>
					</div>
		</div>`;
}

const appendedSections = `
${ctaSection('e7a1cta1', 'e7a1h01', 'e7a1b01', 'Expand globally without setting up a local entity', 'Talk to an EOR Expert', '/contact-us/', 'eor-cta eor-cta-1')}
${ctaSection('e7a1cr01', 'e7a1h02', 'e7a1b02', 'Why companies choose Connect Resources for EOR', 'Request a Proposal', '/contact-us/', 'eor-why-cr')}
<section class="elementor-section elementor-top-section elementor-element elementor-element-e7a1feat elementor-section-boxed elementor-section-height-default elementor-section-height-default" data-id="e7a1feat" data-element_type="section" data-e-type="section">
						<div class="elementor-container elementor-column-gap-default">
					<div class="elementor-column elementor-col-100 elementor-top-column elementor-element elementor-element-e7a1feata" data-id="e7a1feata" data-element_type="column" data-e-type="column">
			<div class="elementor-widget-wrap elementor-element-populated">
						<section class="elementor-section elementor-inner-section elementor-element elementor-element-e7a1feat1 elementor-section-boxed elementor-section-height-default elementor-section-height-default" data-id="e7a1feat1" data-element_type="section" data-e-type="section">
						<div class="elementor-container elementor-column-gap-default">
					<div class="elementor-column elementor-col-50 elementor-inner-column elementor-element elementor-element-e7a1f1" data-id="e7a1f1" data-element_type="column" data-e-type="column">
			<div class="elementor-widget-wrap elementor-element-populated">
						${imageBox('e7a1f1a', `${ASSET}/100-Local-Compliance.svg`, '100% Emirati-owned EOR in Dubai', 'We combine years of experience with strong local connections that enable faster visa and work permit processing with full compliance.')}
						${imageBox('e7a1f1b', `${ASSET}/Simplified-Global-Payroll.svg`, 'Flexible workforce solutions in Dubai', 'We can legally source, deploy, and scale your workforce as your projects require—including HR outsourcing, PEO services, and other workforce solutions.')}
					</div>
		</div>
				<div class="elementor-column elementor-col-50 elementor-inner-column elementor-element elementor-element-e7a1f2" data-id="e7a1f2" data-element_type="column" data-e-type="column">
			<div class="elementor-widget-wrap elementor-element-populated">
						${imageBox('e7a1f2a', `${ASSET}/Hire-Across-150-Countries.svg`, 'Hire or relocate anywhere across the MENA region', 'We use the global Employer of Record (EOR) framework as the sole legal employer for your employees across MENA countries—one monthly invoice and centralised management.')}
						${imageBox('e7a1f2b', `${ASSET}/Dedicated-HR-Legal-Experts.svg`, 'End-to-end services, all in one place', 'We handle talent employment and onboarding, recruitment, immigration, legal matters, and HR consulting so you can save valuable time during UAE expansion.')}
					</div>
		</div>
					</div>
		</section>
					</div>
		</div>
					</div>
		</section>
${ctaSection('e7a1cta2', 'e7a1h03', 'e7a1b03', 'Ready to hire your next international employee?', 'Get Started Today', '/contact-us/', 'eor-cta eor-cta-2')}
<section class="elementor-section elementor-top-section elementor-element elementor-element-e7a1test elementor-section-boxed elementor-section-height-default elementor-section-height-default" data-id="e7a1test" data-element_type="section" data-e-type="section">
						<div class="elementor-container elementor-column-gap-default">
					<div class="elementor-column elementor-col-100 elementor-top-column elementor-element elementor-element-e7a1testa" data-id="e7a1testa" data-element_type="column" data-e-type="column">
			<div class="elementor-widget-wrap elementor-element-populated">
						<div class="elementor-element elementor-element-e7a1testh elementor-widget elementor-widget-heading" data-id="e7a1testh" data-element_type="widget" data-e-type="widget" data-widget_type="heading.default">
				<div class="elementor-widget-container">
					<h2 class="elementor-heading-title elementor-size-default">What our clients say</h2>				</div>
				</div>
						<section class="elementor-section elementor-inner-section elementor-element elementor-element-e7a1testr elementor-section-boxed elementor-section-height-default elementor-section-height-default" data-id="e7a1testr" data-element_type="section" data-e-type="section">
						<div class="elementor-container elementor-column-gap-default eor-testimonial-row">
					${testimonialCard('e7t1', 'Connect Resources made international hiring straightforward. Their EOR team handled compliance and payroll seamlessly while we focused on onboarding talent.', 'Sarah Mitchell', 'HR Director', `${ASSET}/Avatar01.webp`)}
					${testimonialCard('e7t2', 'We expanded into three new markets without setting up local entities. The EOR model saved us months of legal work and kept everything compliant.', 'James Okonkwo', 'COO', `${ASSET}/Avatar02.webp`)}
					${testimonialCard('e7t3', 'Reliable, responsive, and deeply knowledgeable about MENA employment law. Connect Resources is our go-to partner for global hiring.', 'Fatima Al-Rashid', 'People Operations Lead', `${ASSET}/Avatar03.webp`)}
					</div>
		</section>
					</div>
		</div>
					</div>
		</section>
<section class="elementor-section elementor-top-section elementor-element elementor-element-e7a1strat elementor-section-boxed elementor-section-height-default elementor-section-height-default" data-id="e7a1strat" data-element_type="section" data-e-type="section">
						<div class="elementor-container elementor-column-gap-default">
					<div class="elementor-column elementor-col-50 elementor-top-column elementor-element elementor-element-e7a1strl" data-id="e7a1strl" data-element_type="column" data-e-type="column">
			<div class="elementor-widget-wrap elementor-element-populated">
						<div class="elementor-element elementor-element-e7a1strh elementor-widget elementor-widget-heading" data-id="e7a1strh" data-element_type="widget" data-e-type="widget" data-widget_type="heading.default">
				<div class="elementor-widget-container">
					<h2 class="elementor-heading-title elementor-size-default">Employer of Record as a <span class="yelorn">Strategic Hiring Model</span></h2>				</div>
				</div>
				<div class="elementor-element elementor-element-e7a1strp elementor-widget elementor-widget-text-editor" data-id="e7a1strp" data-element_type="widget" data-e-type="widget" data-widget_type="text-editor.default">
				<div class="elementor-widget-container">
									<p>The Employer of Record model exists to solve one core challenge: how to employ people compliantly, without borders slowing growth. For companies expanding globally, building distributed teams, or testing new markets, an Employer of Record offers a practical balance between speed, compliance, and flexibility. When used correctly, it becomes more than an HR solution—it becomes a strategic enabler of growth.</p>								</div>
				</div>
					</div>
		</div>
				<div class="elementor-column elementor-col-50 elementor-top-column elementor-element elementor-element-e7a1strr" data-id="e7a1strr" data-element_type="column" data-e-type="column">
			<div class="elementor-widget-wrap elementor-element-populated">
						<div class="elementor-element elementor-element-e7a1stri elementor-widget elementor-widget-image" data-id="e7a1stri" data-element_type="widget" data-e-type="widget" data-widget_type="image.default">
				<div class="elementor-widget-container">
									<img decoding="async" src="${ASSET}/Employer-of-Record-as-a-Strategic-Hiring-Model.webp" class="attachment-full size-full" alt="Employer of Record as a Strategic Hiring Model">								</div>
				</div>
					</div>
		</div>
					</div>
		</section>
${ctaSection('e7a1cta3', 'e7a1h04', 'e7a1b04', 'Get expert guidance on Employer of Record services', 'Get a Free Consultation', '#eor-consultation-form', 'eor-cta eor-cta-3')}
<section class="elementor-section elementor-top-section elementor-element elementor-element-e7a1faq elementor-section-boxed elementor-section-height-default elementor-section-height-default" data-id="e7a1faq" data-element_type="section" data-e-type="section">
						<div class="elementor-container elementor-column-gap-default">
					<div class="elementor-column elementor-col-100 elementor-top-column elementor-element elementor-element-e7a1faqa" data-id="e7a1faqa" data-element_type="column" data-e-type="column">
			<div class="elementor-widget-wrap elementor-element-populated">
						<div class="elementor-element elementor-element-e7a1faqh elementor-widget elementor-widget-heading" data-id="e7a1faqh" data-element_type="widget" data-e-type="widget" data-widget_type="heading.default">
				<div class="elementor-widget-container">
					<h2 class="elementor-heading-title elementor-size-default">Frequently Asked Questions</h2>				</div>
				</div>
				<div class="elementor-element elementor-element-e7a1faqw elementor-widget elementor-widget-accordion" data-id="e7a1faqw" data-element_type="widget" data-e-type="widget" data-widget_type="accordion.default">
				<div class="elementor-widget-container">
							<div class="elementor-accordion">
							<div class="elementor-accordion-item">
					<div id="elementor-tab-title-e7f1" class="elementor-tab-title" data-tab="1" role="button" aria-controls="elementor-tab-content-e7f1" aria-expanded="false">
													<span class="elementor-accordion-icon elementor-accordion-icon-right" aria-hidden="true">
															<span class="elementor-accordion-icon-closed"><i class="fas fa-arrow-down"></i></span>
								<span class="elementor-accordion-icon-opened"><i class="fas fa-arrow-up"></i></span>
														</span>
												<a class="elementor-accordion-title" tabindex="0">What is an Employer of Record (EOR)?</a>
					</div>
					<div id="elementor-tab-content-e7f1" class="elementor-tab-content elementor-clearfix" data-tab="1" role="region" aria-labelledby="elementor-tab-title-e7f1"><p>An Employer of Record is a third-party organisation that legally employs workers on behalf of your company. The EOR handles payroll, taxes, benefits, and compliance while you manage the employee's day-to-day work.</p></div>
				</div>
							<div class="elementor-accordion-item">
					<div id="elementor-tab-title-e7f2" class="elementor-tab-title" data-tab="2" role="button" aria-controls="elementor-tab-content-e7f2" aria-expanded="false">
													<span class="elementor-accordion-icon elementor-accordion-icon-right" aria-hidden="true">
															<span class="elementor-accordion-icon-closed"><i class="fas fa-arrow-down"></i></span>
								<span class="elementor-accordion-icon-opened"><i class="fas fa-arrow-up"></i></span>
														</span>
												<a class="elementor-accordion-title" tabindex="0">How is an EOR different from a PEO?</a>
					</div>
					<div id="elementor-tab-content-e7f2" class="elementor-tab-content elementor-clearfix" data-tab="2" role="region" aria-labelledby="elementor-tab-title-e7f2"><p>A PEO typically requires a co-employment arrangement and often a local entity. An EOR becomes the sole legal employer, which is ideal when you need to hire in a country where you have no legal presence.</p></div>
				</div>
							<div class="elementor-accordion-item">
					<div id="elementor-tab-title-e7f3" class="elementor-tab-title" data-tab="3" role="button" aria-controls="elementor-tab-content-e7f3" aria-expanded="false">
													<span class="elementor-accordion-icon elementor-accordion-icon-right" aria-hidden="true">
															<span class="elementor-accordion-icon-closed"><i class="fas fa-arrow-down"></i></span>
								<span class="elementor-accordion-icon-opened"><i class="fas fa-arrow-up"></i></span>
														</span>
												<a class="elementor-accordion-title" tabindex="0">Which countries does Connect Resources support?</a>
					</div>
					<div id="elementor-tab-content-e7f3" class="elementor-tab-content elementor-clearfix" data-tab="3" role="region" aria-labelledby="elementor-tab-title-e7f3"><p>We provide Employer of Record services across the UAE, Saudi Arabia, Qatar, Oman, Kuwait, Jordan, Egypt, Lebanon, and additional markets throughout the MENA region and beyond.</p></div>
				</div>
							<div class="elementor-accordion-item">
					<div id="elementor-tab-title-e7f4" class="elementor-tab-title" data-tab="4" role="button" aria-controls="elementor-tab-content-e7f4" aria-expanded="false">
													<span class="accordion-icon elementor-accordion-icon-right" aria-hidden="true">
															<span class="elementor-accordion-icon-closed"><i class="fas fa-arrow-down"></i></span>
								<span class="elementor-accordion-icon-opened"><i class="fas fa-arrow-up"></i></span>
														</span>
												<a class="elementor-accordion-title" tabindex="0">How quickly can I hire through an EOR?</a>
					</div>
					<div id="elementor-tab-content-e7f4" class="elementor-tab-content elementor-clearfix" data-tab="4" role="region" aria-labelledby="elementor-tab-title-e7f4"><p>Most clients can onboard employees in days rather than months, depending on the country, role, and documentation requirements. Our team guides you through each step.</p></div>
				</div>
							<div class="elementor-accordion-item">
					<div id="elementor-tab-title-e7f5" class="elementor-tab-title" data-tab="5" role="button" aria-controls="elementor-tab-content-e7f5" aria-expanded="false">
													<span class="elementor-accordion-icon elementor-accordion-icon-right" aria-hidden="true">
															<span class="elementor-accordion-icon-closed"><i class="fas fa-arrow-down"></i></span>
								<span class="elementor-accordion-icon-opened"><i class="fas fa-arrow-up"></i></span>
														</span>
												<a class="elementor-accordion-title" tabindex="0">Who manages the employee day-to-day?</a>
					</div>
					<div id="elementor-tab-content-e7f5" class="elementor-tab-content elementor-clearfix" data-tab="5" role="region" aria-labelledby="elementor-tab-title-e7f5"><p>You retain full control over work assignments, performance management, and team integration. Connect Resources manages employment contracts, payroll, benefits, and statutory compliance.</p></div>
				</div>
						</div>
						</div>
				</div>
					</div>
		</div>
					</div>
		</section>`;

const pages = JSON.parse(fs.readFileSync(PAGES_PATH, 'utf8'));
const idx = pages.findIndex((p) => p.path === '/eor-main/');
if (idx === -1) {
  console.error('eor-main page not found');
  process.exit(1);
}

let body = pages[idx].bodyHtml;

body = stripFigmaMetadata(body);

body = replaceHeadingTitle(
  body,
  '9c3abfb',
  'What is an <span class="yelorn">Employer of Record?</span>',
);
body = replaceHeadingTitle(
  body,
  '14f9726',
  'Meaning, How It <span class="yelorn">Works, Costs, Risks,</span> and When to Use It',
);

const textFixes = {
  '8b58669':
    '<p>Employer of Record solutions are widely used in regions with complex employment regulations or where companies want to test the market before committing to entity setup.</p>',
  '0d726cd':
    '<p>The <strong>Employer of Record definition</strong> refers to an organization that assumes the legal responsibility of employing workers on behalf of a client company. In an EOR arrangement:</p>',
  '5797ecd':
    '<p>The client company retains operational control over the employee\'s daily work, performance, and team integration, while the EOR handles legal employment, payroll, and compliance obligations.</p>',
  '9dfc462':
    '<p>An Employer of Record follows a clear and structured employment model.</p>',
  '464d77e':
    '<p>Organizations typically choose Employer of Record services when <strong>speed, compliance, and flexibility</strong> are critical.</p>',
  'd1d1142':
    '<p>From consultation to compliant employment in a few simple steps—without disrupting your existing HR workflows.</p>',
};

for (const [id, html] of Object.entries(textFixes)) {
  body = replaceWidgetContainer(body, id, html);
}

body = replaceInnerSection(body, '0db380c', whyCardsSection);

body = body.replace(
  /\/assets\/images\/2026\/07\/Layer_1-4\.png/g,
  `${ASSET}/Hire-full-time-employees-in-any-of-150-countries.svg`,
);
body = body.replace(
  /\/assets\/images\/2026\/08\/EOR-Img\.webp/g,
  `${ASSET}/EOR-Img.webp`,
);

for (const [legacy, modern] of Object.entries({
  'Faster-global-hiring.svg': 'Faster-global-hiring.svg',
  'Offer-competitive-locally-compliant-benefits.svg': 'Offer-competitive-locally-compliant-benefits.svg',
  'Pay-in-multiple-currencies-without-conversion-headache.svg':
    'Pay-in-multiple-currencies-without-conversion-headache.svg',
  'Stay-100-compliant-without-setting-up-local-entities.svg':
    'Stay-100-compliant-without-setting-up-local-entities.svg',
  UAE: 'UAE.svg',
  KSA: 'KSA.svg',
  Qatar: 'Qatar.svg',
  Oman: 'Oman.svg',
  Kuwait: 'Kuwait.svg',
  Jordan: 'Jordan.svg',
  Egypt: 'Egypt.svg',
  Lebanon: 'Lebanon.svg',
})) {
  body = body.replace(
    new RegExp(`/assets/images/2026/08/${legacy.replace('.', '\\.')}`, 'g'),
    `${ASSET}/${modern}`,
  );
}

const insertCta1 = ctaSection(
  'e7a0cta1',
  'e7a0h01',
  'e7a0b01',
  'Need help hiring in a new country?',
  'Speak with Our Team',
  '/contact-us/',
  'eor-cta eor-cta-1',
);
if (!body.includes('elementor-element-e7a0cta1')) {
  const anchor = '<section class="elementor-section elementor-top-section elementor-element elementor-element-022296c';
  body = body.replace(anchor, insertCta1 + anchor);
}

if (!body.includes('elementor-element-e7a1faq')) {
  body = body.replace(/\s*<\/div>\s*$/, appendedSections + '\n\t\t</div>\n\t\t');
}

pages[idx].bodyHtml = body;
pages[idx].content = body;

pages[idx].pageCss = [
  '/css/impreza-global.css',
  '/wp-content/plugins/elementor/assets/lib/eicons/css/elementor-icons.min.css',
  '/wp-content/plugins/elementor/assets/css/frontend.min.css',
  '/wp-content/plugins/elementor/assets/css/widget-heading.min.css',
  '/wp-content/plugins/elementor/assets/css/widget-image.min.css',
  '/wp-content/plugins/elementor/assets/css/widget-icon-list.min.css',
  '/wp-content/plugins/elementor/assets/css/widget-image-box.min.css',
  '/wp-content/plugins/elementor/assets/css/widget-accordion.min.css',
  '/wp-content/plugins/elementor/assets/css/widget-testimonial.min.css',
  '/wp-content/plugins/elementor/assets/css/widget-button.min.css',
  '/css/page-design/eor-main.css',
  '/wp-content/uploads/elementor/css/post-83418.css',
];

pages[idx].seo = {
  ...pages[idx].seo,
  title: 'Employer of Record (EOR) Hub | Connect Resources',
  description:
    'Learn how Employer of Record services help you hire globally without a local entity. Explore EOR meaning, process, countries, and Connect Resources expertise.',
  ogImage: `${ASSET}/EOR-Img.webp`,
};

pages[idx].title = 'Employer of Record (EOR) Hub';

fs.writeFileSync(PAGES_PATH, JSON.stringify(pages, null, 2) + '\n');
console.log('Updated /eor-main/ in pages.json');
console.log('bodyHtml length:', body.length);
console.log('figma remnants:', (body.match(/figma|figmeta|data-buffer/gi) || []).length);
