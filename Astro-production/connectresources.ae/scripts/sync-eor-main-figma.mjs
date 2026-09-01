#!/usr/bin/env node
/**
 * Full Figma alignment pass for /eor-main/ — HTML copy, structure, and image paths.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PAGES_PATH = path.join(ROOT, 'src/data/pages.json');

const testimonialCards = [
  {
    title: 'Amazing Company in Providing Onboarding Process',
    quote:
      'Mary-Jane was fantastic during my onboarding process. She was available, supportive, very informative and genuine.',
    name: 'Carlos Smith',
    role: 'CEO',
    avatar: '/assets/images/2026/eor-main/Avatar01.webp',
  },
  {
    title: 'The team was very supportive and kept me motivated',
    quote:
      'Connect Resources impressed me with their professionalism and excellent work! The team has Best Process and excellent communication.',
    name: 'Alain Kassis',
    role: 'Marketer',
    avatar: '/assets/images/2026/eor-main/Avatar02.webp',
  },
  {
    title: 'An overall wonderful and rewarding experience',
    quote:
      'Jane has been excellent all the way in assisting me with any question that I might have, regardless of how small or insignificant it might be.',
    name: 'Jaypee Cañete',
    role: 'Manager',
    avatar: '/assets/images/2026/eor-main/Avatar03.webp',
  },
];

function testimonialStarsHtml() {
  const star =
    '<img src="/assets/images/2026/eor-main/Star-Filled.svg" width="24" height="24" alt="" loading="lazy" decoding="async" />';
  return `<div class="eor-testimonial-stars" aria-hidden="true">${Array(5).fill(star).join('')}</div>`;
}

function testimonialWidget(id, colId, { title, quote, name, role, avatar }, isFirst) {
  const activeClass = isFirst ? ' eor-testimonial-slide is-active' : ' eor-testimonial-slide';
  return `<div class="elementor-column elementor-col-33 elementor-inner-column elementor-element elementor-element-${colId}${activeClass}" data-id="${colId}" data-element_type="column" data-e-type="column">
\t\t\t<div class="elementor-widget-wrap elementor-element-populated eor-testimonial-card">
\t\t\t\t\t\t<div class="elementor-element elementor-element-${id} elementor-widget elementor-widget-html" data-id="${id}" data-element_type="widget" data-e-type="widget" data-widget_type="html.default">
\t\t\t<div class="elementor-widget-container">
\t\t\t<div class="eor-testimonial-inner">
\t\t\t${testimonialStarsHtml()}
\t\t\t<h3 class="eor-testimonial-heading">${title}</h3>
\t\t\t<p class="eor-testimonial-quote">“${quote}”</p>
\t\t\t<div class="eor-testimonial-user">
\t\t\t<img decoding="async" src="${avatar}" alt="${name}" width="60" height="60" />
\t\t\t<div class="eor-testimonial-user-text"><strong>${name}</strong><span>${role}</span></div>
\t\t\t</div>
\t\t\t</div>
\t\t\t</div>
\t\t\t</div>
\t\t\t\t\t</div>
\t\t\t</div>`;
}

const hireCtaSection = `<section class="elementor-section elementor-top-section elementor-element elementor-element-e7a1cta3 elementor-section-boxed elementor-section-height-default elementor-section-height-default eor-cta eor-cta-3" data-id="e7a1cta3" data-element_type="section" data-e-type="section" data-settings="{&quot;background_background&quot;:&quot;classic&quot;}">
\t\t\t\t\t\t<div class="elementor-container elementor-column-gap-default">
\t\t\t\t\t<div class="elementor-column elementor-col-100 elementor-top-column elementor-element elementor-element-e7a1cta3a" data-id="e7a1cta3a" data-element_type="column" data-e-type="column">
\t\t\t<div class="elementor-widget-wrap elementor-element-populated">
\t\t\t\t\t<div class="eor-cta3-inner">
\t\t\t\t\t\t<div class="elementor-element elementor-element-e7a1cta3h elementor-widget elementor-widget-heading" data-id="e7a1cta3h" data-element_type="widget" data-e-type="widget" data-widget_type="heading.default">
\t\t\t<div class="elementor-widget-container"><h2 class="elementor-heading-title elementor-size-default eor-cta3-title">Need to Hire Quickly?</h2></div>
\t\t\t</div>
\t\t\t\t\t\t<div class="elementor-element elementor-element-e7a1cta3sub elementor-widget elementor-widget-text-editor" data-id="e7a1cta3sub" data-element_type="widget" data-e-type="widget" data-widget_type="text-editor.default">
\t\t\t<div class="elementor-widget-container"><p class="eor-cta3-subtitle">See how fast you can onboard employees across different countries.</p></div>
\t\t\t</div>
\t\t\t\t\t\t<div class="elementor-element elementor-element-e7a1b04 elementor-align-center elementor-widget elementor-widget-button" data-id="e7a1b04" data-element_type="widget" data-e-type="widget" data-widget_type="button.default">
\t\t\t<div class="elementor-widget-container"><div class="elementor-button-wrapper"><a class="elementor-button elementor-button-link elementor-size-sm" href="/contact-us/"><span class="elementor-button-content-wrapper"><span class="elementor-button-text">View Hiring Timeline</span></span></a></div></div>
\t\t\t</div>
\t\t\t\t\t</div>
\t\t\t\t\t</div></div></div></section>`;

const faqSection = `<section class="elementor-section elementor-top-section elementor-element elementor-element-e7a1faq elementor-section-boxed elementor-section-height-default elementor-section-height-default eor-faq-section" data-id="e7a1faq" data-element_type="section" data-e-type="section">
\t\t\t\t\t\t<div class="elementor-container elementor-column-gap-default">
\t\t\t\t\t<div class="elementor-column elementor-col-38 elementor-top-column elementor-element elementor-element-e7a1faql" data-id="e7a1faql" data-element_type="column" data-e-type="column">
\t\t\t<div class="elementor-widget-wrap elementor-element-populated">
\t\t\t\t\t\t<div class="elementor-element elementor-element-e7a1faqh elementor-widget elementor-widget-heading" data-id="e7a1faqh" data-element_type="widget" data-e-type="widget" data-widget_type="heading.default"><div class="elementor-widget-container"><h2 class="elementor-heading-title elementor-size-default">FAQs</h2></div></div>
\t\t\t\t\t\t<div class="elementor-element elementor-element-e7a1faqb elementor-widget elementor-widget-button eor-btn-outline" data-id="e7a1faqb" data-element_type="widget" data-e-type="widget" data-widget_type="button.default"><div class="elementor-widget-container"><div class="elementor-button-wrapper"><a class="elementor-button elementor-button-link elementor-size-sm" href="/contact-us/"><span class="elementor-button-content-wrapper"><span class="elementor-button-text">Contact Us</span></span></a></div></div></div>
\t\t\t\t\t</div></div>
\t\t\t\t\t<div class="elementor-column elementor-col-62 elementor-top-column elementor-element elementor-element-e7a1faqr" data-id="e7a1faqr" data-element_type="column" data-e-type="column">
\t\t\t<div class="elementor-widget-wrap elementor-element-populated">
\t\t\t\t\t\t<div class="elementor-element elementor-element-e7a1faqw elementor-widget elementor-widget-accordion" data-id="e7a1faqw" data-element_type="widget" data-e-type="widget" data-widget_type="accordion.default">
\t\t\t<div class="elementor-widget-container">
\t\t\t\t\t<div class="elementor-accordion">
\t\t\t\t\t\t<div class="elementor-accordion-item"><div id="elementor-tab-title-1" class="elementor-tab-title" data-tab="1" role="button" aria-controls="elementor-tab-content-1" aria-expanded="false"><span class="elementor-accordion-icon elementor-accordion-icon-right" aria-hidden="true"><span class="elementor-accordion-icon-closed"><i class="fas fa-arrow-down"></i></span><span class="elementor-accordion-icon-opened"><i class="fas fa-arrow-up"></i></span></span><a class="elementor-accordion-title" tabindex="0">What is an Employer of Record (EOR)?</a></div><div id="elementor-tab-content-1" class="elementor-tab-content elementor-clearfix" data-tab="1" role="region" aria-labelledby="elementor-tab-title-1"><p>An Employer of Record (EOR) is a third-party organization that legally employs workers on behalf of another company, handling payroll, taxes, benefits, and compliance while the client manages day-to-day work.</p></div></div>
\t\t\t\t\t\t<div class="elementor-accordion-item"><div id="elementor-tab-title-2" class="elementor-tab-title" data-tab="2" role="button" aria-controls="elementor-tab-content-2" aria-expanded="false"><span class="elementor-accordion-icon elementor-accordion-icon-right" aria-hidden="true"><span class="elementor-accordion-icon-closed"><i class="fas fa-arrow-down"></i></span><span class="elementor-accordion-icon-opened"><i class="fas fa-arrow-up"></i></span></span><a class="elementor-accordion-title" tabindex="0">Is Employer of Record the same as outsourcing?</a></div><div id="elementor-tab-content-2" class="elementor-tab-content elementor-clearfix" data-tab="2" role="region" aria-labelledby="elementor-tab-title-2"><p>No. Outsourcing typically transfers work or functions to a vendor. An EOR assumes legal employment responsibilities while your company retains operational control over the employee.</p></div></div>
\t\t\t\t\t\t<div class="elementor-accordion-item"><div id="elementor-tab-title-3" class="elementor-tab-title" data-tab="3" role="button" aria-controls="elementor-tab-content-3" aria-expanded="false"><span class="elementor-accordion-icon elementor-accordion-icon-right" aria-hidden="true"><span class="elementor-accordion-icon-closed"><i class="fas fa-arrow-down"></i></span><span class="elementor-accordion-icon-opened"><i class="fas fa-arrow-up"></i></span></span><a class="elementor-accordion-title" tabindex="0">Can an Employer of Record hire just one employee?</a></div><div id="elementor-tab-content-3" class="elementor-tab-content elementor-clearfix" data-tab="3" role="region" aria-labelledby="elementor-tab-title-3"><p>Yes. EOR services work for hiring a single employee or scaling teams across multiple countries without setting up local entities.</p></div></div>
\t\t\t\t\t\t<div class="elementor-accordion-item"><div id="elementor-tab-title-4" class="elementor-tab-title" data-tab="4" role="button" aria-controls="elementor-tab-content-4" aria-expanded="false"><span class="elementor-accordion-icon elementor-accordion-icon-right" aria-hidden="true"><span class="elementor-accordion-icon-closed"><i class="fas fa-arrow-down"></i></span><span class="elementor-accordion-icon-opened"><i class="fas fa-arrow-up"></i></span></span><a class="elementor-accordion-title" tabindex="0">Is EOR only for international hiring?</a></div><div id="elementor-tab-content-4" class="elementor-tab-content elementor-clearfix" data-tab="4" role="region" aria-labelledby="elementor-tab-title-4"><p>While EOR is commonly used for cross-border hiring, it can also support domestic employment where companies need compliant local employment without establishing their own entity.</p></div></div>
\t\t\t\t\t</div></div></div>
\t\t\t\t\t</div></div></div></section>`;

function replaceSection(html, sectionId, newSectionHtml) {
  const re = new RegExp(
    `<section class="elementor-section elementor-top-section elementor-element elementor-element-${sectionId}[\\s\\S]*?</section>\\s*`,
    'g',
  );
  if (!re.test(html)) {
    console.warn(`Section ${sectionId} not found`);
    return html;
  }
  return html.replace(re, newSectionHtml + '\n');
}

function replaceInnerSection(html, sectionId, innerHtml) {
  const re = new RegExp(
    `<section class="elementor-section elementor-inner-section elementor-element elementor-element-${sectionId}[\\s\\S]*?</section>`,
    'g',
  );
  return html.replace(re, innerHtml);
}

const pages = JSON.parse(fs.readFileSync(PAGES_PATH, 'utf8'));
const idx = pages.findIndex((p) => p.slug === 'eor-main');
if (idx === -1) throw new Error('eor-main not found');

let html = pages[idx].bodyHtml || pages[idx].content;

// Fix broken country flag paths
html = html.replace(/\.svg\.svg/g, '.svg');

// Why companies subtitle — semibold emphasis per Figma
html = html.replace(
  /Organizations typically choose Employer of Record services when[\s\S]*?are critical\./,
  'Organizations typically choose Employer of Record services when <strong>speed, compliance, and flexibility</strong> are critical.',
);

// Costs section copy fixes
html = html.replace(
  'Local statutory benefits and employer contributions',
  'Local statutory benefits and social contributions',
);
html = html.replace(
  'Visa or work permit support requirements',
  'Visa or work permit support (if applicable)',
);
html = html.replace('In-country HR and payroll teams', 'HR and compliance overhead');

// Pricing CTA — combine subtitle into heading block per Figma
html = html.replace(
  /<div class="elementor-element elementor-element-e7a2priceh[\s\S]*?<\/div>\s*<div class="elementor-element elementor-element-e7a2pricesub[\s\S]*?<\/div>/,
  `<div class="elementor-element elementor-element-e7a2priceh elementor-widget elementor-widget-heading" data-id="e7a2priceh" data-element_type="widget" data-e-type="widget" data-widget_type="heading.default"><div class="elementor-widget-container"><h2 class="elementor-heading-title elementor-size-default">Get Your EOR Pricing in Under 2 Minutes<br>Receive a customised pricing estimate based on your hiring plans.</h2></div></div>`,
);

// Hire CTA — replace broken section
html = replaceSection(html, 'e7a1cta3', hireCtaSection);

// FAQ — replace with Figma questions
html = replaceSection(html, 'e7a1faq', faqSection);

// Legal strip lives in the global footer (copyright_end), not in page body.
html = html.replace(
  /<section class="elementor-section elementor-top-section elementor-element elementor-element-e7a1legal[\s\S]*?<\/section>\s*/g,
  '',
);

// Testimonials — rebuild inner row (Figma order: stars → title → quote → avatar)
html = html.replace(
  /<div class="elementor-element elementor-element-e7a1testdots[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g,
  '',
);
const testimonialPagination = `<div class="elementor-element elementor-element-e7a1testdots elementor-widget elementor-widget-html eor-testimonial-dots" data-id="e7a1testdots" data-element_type="widget" data-e-type="widget" data-widget_type="html.default">
\t\t\t<div class="elementor-widget-container"><div class="eor-testimonial-pagination" role="tablist" aria-label="Customer testimonials"><button type="button" class="eor-testimonial-nav eor-testimonial-prev" aria-label="Previous testimonial">‹</button><button type="button" class="eor-testimonial-dot is-active" role="tab" aria-label="Testimonial 1" aria-selected="true" data-index="0"></button><button type="button" class="eor-testimonial-dot" role="tab" aria-label="Testimonial 2" aria-selected="false" data-index="1"></button><button type="button" class="eor-testimonial-dot" role="tab" aria-label="Testimonial 3" aria-selected="false" data-index="2"></button><button type="button" class="eor-testimonial-nav eor-testimonial-next" aria-label="Next testimonial">›</button></div></div></div>`;
const testimonialInner = `<section class="elementor-section elementor-inner-section elementor-element elementor-element-e7a1testr elementor-section-boxed elementor-section-height-default elementor-section-height-default eor-testimonial-row" data-id="e7a1testr" data-element_type="section" data-e-type="section">
\t\t\t\t\t\t<div class="elementor-container elementor-column-gap-default eor-testimonial-carousel">
\t\t\t\t\t<div class="eor-testimonial-viewport">
\t\t\t\t\t<div class="eor-testimonial-track">
\t\t\t\t\t${testimonialWidget('e7a1t01', 'e7a1tc1', testimonialCards[0], true)}
\t\t\t\t\t${testimonialWidget('e7a1t02', 'e7a1tc2', testimonialCards[1], false)}
\t\t\t\t\t${testimonialWidget('e7a1t03', 'e7a1tc3', testimonialCards[2], false)}
\t\t\t\t\t</div></div>
\t\t\t\t\t${testimonialPagination}
\t\t\t\t\t</div></section>`;
html = replaceInnerSection(html, 'e7a1testr', testimonialInner);

// Countries disclaimer — mark widget for centered styling
html = html.replace(
  'elementor-element-d8acd7f elementor-widget__width-initial elementor-widget elementor-widget-text-editor',
  'elementor-element-d8acd7f elementor-widget__width-initial elementor-widget elementor-widget-text-editor eor-countries-disclaimer',
);

// EOR hero image — drop stale srcset pointing at 2026/08 variants
html = html.replace(
  /srcset="\/assets\/images\/2026\/eor-main\/EOR-Img\.webp[^"]*"/g,
  '',
);

// How EOR works heading — trim extra space before gradient span
html = html.replace(
  /How does an <span class="yelorn"> Employer of Record \(EOR\)<\/span>/,
  'How does an <span class="yelorn">Employer of Record (EOR)</span>',
);

html = html.replace(/fa-chevron-down/g, 'fa-arrow-down');
html = html.replace(/fa-chevron-up/g, 'fa-arrow-up');

// Submit button label per Figma
html = html.replace(/value="Submit"/g, 'value="Submit Message"');

pages[idx].bodyHtml = html;
pages[idx].content = html;
fs.writeFileSync(PAGES_PATH, JSON.stringify(pages, null, 2) + '\n');
console.log('sync-eor-main-figma: pages.json updated');
