#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const TEMPLATE = join(ROOT, 'src/legacy/what-is-corporate-tax-in-uae.cleaned.html');
const OUT = join(ROOT, 'src/legacy/what-is-mohre.cleaned.html');
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

const SLUG = 'what-is-mohre';
const POST_ID = '10520';
const META_TITLE = 'MOHRE UAE Guide (2026): Services, Labour Contracts &amp; Rules';
const SUBTITLE = META_TITLE;
const META_DESC =
  'Understand MOHRE UAE in 2026. Learn how to check your labour contract, file complaints, manage work permits, and stay compliant with new Emiratisation rules.';
const H1 = 'What Is MOHRE?';
const FEATURED = '/wp-content/uploads/2026/08/what-is-mohre-featured.png';
const INFOGRAPHIC = '/wp-content/uploads/2026/08/mohre-workers-rights-infographic.png';
const CTA = '/wp-content/uploads/2026/08/mohre-inquiries-cta.png';

const TOC_SECTIONS = [
  'What Does MOHRE Stand For?',
  'What Does MOHRE Do in the UAE?',
  'MOHRE Services for Employees',
  'MOHRE Services for Employers',
  'How to Use MOHRE Enquiry Services?',
  'MOHRE Services Centres',
  'Key MOHRE Initiatives You Should Know in 2026',
  'MOHRE in 2026: What Has Changed?',
  'Final Words',
  'FAQs',
];

const RELATED = [
  {
    postId: '9262',
    slug: 'mohre-inquiry-services',
    category: 'category-pro-services',
    image: '/wp-content/uploads/2025/06/MOHRE-Inquiry-Services-in-UAE-Everything-you-Need-to-Know.webp',
    imageAlt: 'mohre inquiry services',
    title: 'MOHRE Inquiry Services in UAE: Everything you Need to Know',
    excerpt:
      'Do you want to learn more about UAE labor laws, agreements, authorizations, or the responsibilities of the workplace? Here, we are to provide you',
    authorSlug: 'sanjyam-dhingra',
    authorName: 'Sanjyam Dhingra',
    avatar: 'cropped-Group-39930-96x96.png',
  },
  {
    postId: '1674',
    slug: 'work-permit-in-uae',
    category: 'category-visa-services',
    image: '/wp-content/uploads/2023/03/work-permit-uae-1-1536x864-1.webp',
    imageAlt: 'Work permit UAE',
    title: 'The Process Involved In Work Permit In UAE 2026: Complete Guide',
    excerpt:
      'All people who wish to stay in the UAE to work need a work permit in UAE. This is a legal document that allows individuals to work legally.',
    authorSlug: 'shak-malik',
    authorName: 'Shak Malik',
    avatar: 'cropped-Group-39933-96x96.png',
  },
  {
    postId: '1925',
    slug: 'mohre-labour-card',
    category: 'category-pro-services',
    image: '/wp-content/uploads/2023/04/mohre-labor-card-1536x864-1.webp',
    imageAlt: 'Mohre labour Card',
    title: 'New MOHRE Labour Classification System 2026',
    excerpt:
      'If you are establishing a company in the region and want to obtain your MOHRE labour card, you should be familiar with the Ministry',
    authorSlug: 'riju-karappurath',
    authorName: 'Riju Karappurath',
    avatar: 'cropped-Group-39932-96x96.png',
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
const h2 = (text) => `<h2><b>${text}</b></h2>`;
const h3 = (text) => `<h3><b>${text}</b></h3>`;
const h4 = (text) => `<h4><b>${text}</b></h4>`;
const ul = (items) =>
  `<ul>${items.map((i) => `<li style="font-weight: 400;" aria-level="1"><span style="font-weight: 400;">${i}</span></li>`).join('')}</ul>`;
const ol = (items) =>
  `<ol>${items.map((i) => `<li style="font-weight: 400;" aria-level="1"><span style="font-weight: 400;">${i}</span></li>`).join('')}</ol>`;

const contentHtml = `
${p('The moment Ahmed arrived in the UAE for his dream job, he discovered that his employment contract didn\'t match what he signed. He spent his money, time, and effort, and in the blink of an eye, all his dreams were shattered into pieces. It happened when systems were not accessible and digital.')}
${p('The current scenario tells an entirely different story. Thousands of employees and employers turn to MOHRE UAE today. It\'s a government authority that is responsible for protecting workers\' rights and regulating employment in the private sector.')}
${p('What MOHRE is becomes essential to understand for both parties. The employee can check their <a href="/labor-contract-modification/">labour contract</a>, and an employer can apply for <a href="/work-permit-in-uae/">work permits</a> using it. Even an entrepreneur starting a business should know too what and how it works.')}
${p('We have a complete guide on MOHRE UAE. It covers:')}
${ul([
  'What MOHRE is and its role in UAE employment',
  'MOHRE services for employees and employers',
  'How to use MOHRE enquiry services online',
  'Key MOHRE initiatives and 2026 rule changes',
  'How KPM PRO assists with MOHRE compliance',
])}
${buildToc(TOC_SECTIONS)}

${h2('What Does MOHRE Stand For?')}
${h3('MOHRE Full Form &amp; Official Name')}
${p('MOHRE stands for the Ministry of Human Resources and Emiratisation. The ministry regulates workers\' employment matters and protects their rights. Overseeing employer compliance and supporting the workforce development strategy are also its major functions.')}
${h3('Brief History: From Ministry of Labour to MOHRE')}
${p('Previously known as the <a href="/mol-uae/">Ministry of Labour (MOL)</a>, it was renamed MOHRE in 2016. Over time, its role has been expanded in promoting emiratisation, modernising labour regulations, and improving employment services.')}
${h3('Role of MOHRE in the UAE\'s Federal Government')}
${p('They act as the primary regulator for private-sector employment in the UAE. Among many, their prime obligations include')}
${ul([
  'Work permit issuance',
  'Labour law compliance monitoring',
  'Employment contract management',
  'Labour dispute resolution',
  '<a href="/wage-protection-system/">Wage Protection System</a> supervision and',
  'Emiratisation programs support',
])}
${p('Millions of workers and hundreds of thousands of private business owners rely on MOHRE\'s digital services.')}

${h2('What Does MOHRE Do in the UAE?')}
${p('From employment sector regulation to work permit issuance, MOHRE has many functions that benefit both employees and employers alike.')}
${h3('Regulating Private Sector Employment')}
${p('MOHRE develops employment policies covering recruitment, contracts, working hours, employee rights, leave, workplace safety, and termination procedures.')}
${h3('Issuing &amp; Managing Work Permits')}
${p('Every employee working in the private sector must obtain an approved work permit. Workers are required to obtain it before starting their employment tenure. Employers can apply for:')}
${ul(['Renew', 'Modify', 'Cancel permits'])}
${p('All can be easily done through MOHRE\'s digital portal.')}
${h3('Enforcing the UAE Labour Law')}
${p('Employers make compliance a priority by following UAE Labour Law closely. For this, you should conduct timely inspections, investigate complaints properly, and impose penalties where necessary as per the Federal Decree-Law.')}
${h3('Wage Protection System Oversight')}
${p('Through WPS, salaries are electronically monitored. UAE workers receive timely payments under a WPS. Employers who fail to comply may face fines, permit restrictions, or suspension of services.')}
${h3('Managing Labour Disputes &amp; Complaints')}
${p('Employees can submit complaints related to any matter, including salary delays, unfair dismissal, contract violations, workplace disputes, and labour bans. Many disputes are resolved through mediation before reaching UAE courts.')}

<p><img decoding="async" class="aligncenter size-large wp-image-mohre-infographic" src="${INFOGRAPHIC}" alt="Protecting Workers Rights in the UAE - MOHRE UAE infographic" width="1024" height="576" /></p>

${h2('MOHRE Services for Employees')}
${p('<a href="/mohre-inquiry-services/">MOHRE enquiry services</a> provide convenient online tools. These tools eliminate unnecessary office visits, which save workers\' time.')}
${h3('Labour Contract Enquiry &amp; Verification')}
${p('By using online channels, employees can verify their contract details, job title, salary, employer information, and contract validity.')}
${h3('Work Permit Status Check')}
${p('These tools allow workers to monitor their application progress, approvals, renewals, and cancellations online. You can also use the <a href="/uae-work-permit-status/">UAE work permit status</a> guide for step-by-step checks.')}
${h3('Filing a Salary or Labour Complaint')}
${p('Making salary complaints has become much easier than before. Complaints may be submitted through the MOHRE website or mobile app using UAE Pass authentication.')}
${h3('Labour Ban Inquiry')}
${p('Employees can verify whether any labour restrictions or employment bans exist before changing their jobs.')}
${h3('Gratuity Calculations')}
${p('MOHRE offers guidance on gratuity calculations. These are based on contract type (limited contract/unlimited contract) and years of service under UAE Labour Law.')}
${h4('How to Check Your Labour Contract Online?')}
${p('This is how you can check your labour contract online step-by-step.')}
${ol([
  'Visit the MOHRE website.',
  'Log in using UAE Pass.',
  'Open Employment Services.',
  'Select Labour Contract Enquiry.',
  'Enter your work permit or Emirates ID details.',
  'Download or print your contract.',
])}
${h4('Documents Required for MOHRE Complaint Submission')}
${p('Prepare documents such as')}
${ul([
  'Emirates ID',
  'Passport copy',
  'Labour contract',
  'Salary evidence, if applicable',
  'Employer details',
  'Supporting documents',
])}

${h2('MOHRE Services for Employers')}
${p('Not only for employees, but employers can also benefit from MOHRE services that simplify workforce management for UAE business operations.')}
${h3('Applying for New Work Permits')}
${p('Employers can submit applications digitally with required employee documentation. Most permits are processed within one business day. However, requirements must be completed to get processed.')}
${h3('Quota Management &amp; Establishment Card')}
${p('Business owners can monitor their employee quotas, update establishment information, and request additional workforce allocations.')}
${h3('Absconding Report Process')}
${p('Employers may report absconding domestic workers through the MOHRE system. They can do so by submitting supporting documentation.')}
${h3('Emiratisation Compliance &amp; Reporting')}
${p('Private companies must monitor Emiratisation quotas. They should submit workforce data. This way, they remain compliant with government regulations.')}
${h3('Penalties for Non-Compliance')}
${p('Emiratisation targets are a must to meet for private companies. Failure to meet required targets may face financial penalties. Firms are exposed to administrative restrictions and limitations on new work permit approvals.')}
${h3('How to Submit WPS Salary Files Correctly?')}
${p('File submission correctly saves employers from many consequences. For this, employers should process payroll through approved WPS channels. They must submit salary files before deadlines and make sure their employee records match MOHRE data. Correcting rejected files immediately can also save them from severe penalties.')}

<p><a href="/contact-us/"><img decoding="async" class="aligncenter size-large wp-image-mohre-cta" src="${CTA}" alt="MOHRE Inquiries? We are Here to Help - KPM PRO" width="1024" height="512" /></a></p>

${h2('How to Use MOHRE Enquiry Services?')}
${p('Viewing it from a 2026 perspective, MOHRE enquiry services are now largely AI-enabled. This is a huge achievement itself that makes employment-related processes faster and more efficient.')}
${h3('MOHRE Online Portal — Step-by-Step Access')}
${p('Users can access mohre.gov.ae to check their labour contracts, work permits, complaint tracking, employer services, WPS information, and establishment records.')}
${h3('MOHRE Mobile App — iOS &amp; Android')}
${p('The official mobile application allows both workers and their employers to manage services from anywhere. They can even manage complaint submission and application tracking.')}
${h3('UAE Pass Integration for MOHRE Login')}
${p('Secure login through UAE Pass enables paperless access to government employment services. This way, users\' personal information is also protected.')}
${h3('MOHRE Hotline &amp; WhatsApp Support')}
${p('Get additional assistance? Users can contact MOHRE through its customer service hotline. You can also access their website support channels and approved digital communication services.')}
${h3('Information You Need')}
${p('Before starting an inquiry, keep these details ready:')}
${ul([
  'Emirates ID',
  'Labour card or permit number',
  'Passport information',
  'UAE Pass credentials',
  'Employer details',
])}
${h3('Common Errors')}
${p('Many individuals face similar errors when using the MOHRE enquiry system. These issues include:')}
${ul([
  'Incorrect permit numbers',
  'Outdated Emirates ID information',
  'Inactive UAE Pass accounts',
  'Incomplete employer records',
])}
${p('Updating your personal information before submitting requests resolves these problems.')}

${h2('MOHRE Services Centres')}
${p('Most MOHRE enquiry services are available online. Physical service centers assist employees and employers who need in-person support across the UAE locations.')}
${h3('Service Centers in Dubai')}
${p('Dubai has an extensive network of MOHRE-authorized centers, including')}
${ul(['Tasheel', 'Tawjeeh', 'Twafouq', 'Tadbeer'])}
${p('Branches are available in Barsha, Al Qusais, Oud Metha, Al Quoz, Jebel Ali, Al Nahda, Deira, and Al Mankhool, which are popular locations.')}
${h3('Service Centers in Abu Dhabi')}
${p('Businesses and employees can access MOHRE services through Tasheel centers and customer happiness centers. These centers are located in Abu Dhabi and Al Ain.')}
${h3('Service Centers in Other Emirates')}
${p('Service centers are also present in Sharjah, Ajman, Ras Al Khaimah, Fujairah, and Umm Al Quwain. Every emirate offers authorized service centers that handle:')}
${ul([
  'Work permits',
  'Labour contracts',
  'Employer services',
  'Employment-related inquiries',
])}
${h3('What Services Are Available at MOHRE Walk-In Centers?')}
${p('Most MOHRE Service Centres provide work permit applications and renewals, labour contract verification, salary complaint assistance, employer registration, WPS support, quota requests, labour dispute guidance, and document verification.')}
${h4('How to Book an Appointment at a MOHRE Service Centre?')}
${p('Appointments can be scheduled via many channels. You can access them through:')}
${ul(['Official MOHRE website', 'Mobile app', 'Participating service centers.'])}
${p('Booking in advance reduces waiting times.')}
${h4('Tasheel Centers')}
${p('You might be wondering what they do and how they differ from MOHRE offices, as many people confuse Tasheel with MOHRE. In reality, Tasheel centers are government-authorized service providers. These providers process employment transactions on MOHRE\'s behalf. MOHRE sets the regulations, while Tasheel facilitates applications and document processing.')}

${h2('Key MOHRE Initiatives You Should Know in 2026')}
${p('The UAE is heavily investing in workforce modernization through numerous flagship MOHRE initiatives. We are going to talk about each of them in detail.')}
${h3('Emiratisation, Nafis Programme: 2026 Targets &amp; Deadlines')}
${p('The Nafis program encourages private companies to employ more Emirati professionals. If your business meets specific workforce thresholds, you must achieve semi-annual Emiratisation targets or else you\'ll face financial contributions.')}
${h3('Zero Government Bureaucracy Program')}
${p('This nationwide initiative reduces paperwork by introducing:')}
${ul(['AI-powered approvals', 'Simplified procedures', 'Integrated government platforms.'])}
${h3('Emirati Work Bundle')}
${p('The Emirati Work Bundle combines hiring, onboarding, pensions, employment contracts, and related services into one streamlined digital experience. This hugely reduces processing times.')}
${h3('Tadbeer')}
${p('Tadbeer centres directly serve domestic worker regulation. It regulates domestic worker recruitment. Protecting the rights of both employers and workers. Protection can be done through standardized employment procedures.')}
${h3('Tawjeeh')}
${p('Tawjeeh has been introduced for labour orientation and contract guidance. The centres educate employees and employers about:')}
${ul(['Labour laws of UAE', 'Workplace rights', 'Contractual obligations', 'Compliance requirements'])}
${h3('Twafouq')}
${p('Twafouq is the platform known for fast-track labour dispute resolution. The platform provides mediation services. It is designed to resolve labour disputes fast before legal proceedings become necessary.')}

${h2('MOHRE in 2026: What Has Changed?')}
${p('Intelligent digital government is the most prominent transformation noticed in MOHRE UAE.')}
${h3('AI Integration in MOHRE Services')}
${p('Artificial intelligence now supports many services. AI supports document verification, enquiry routing, application processing, and customer assistance. The use of AI hugely reduces waiting times. It also improves service accuracy.')}
${h3('Minimum Wage for Emiratis: Updated January 2026')}
${p('The UAE is working hard to strengthen Emiratisation policies. The government supports compensation packages for the private sector\'s Emirati employees. They introduced it through the Nafis program and related initiatives.')}
${h3('Semi-Annual Emiratisation Deadline: June 30, 2026')}
${p('Eligible companies must meet Emiratisation targets by the government\'s announced reporting deadlines. Doing this on time will save them from financial penalties.')}
${h3('Resolution No. 702 of 2025: Data Privacy Penalties for Business Centers')}
${p('The resolution empowers data protection obligations for authorized service centers handling employment records and personal information. With it, greater confidentiality has been achieved for employers and employees.')}

${h2('Final Words')}
${p('Understanding what MOHRE is not a choice for anyone working or operating a business in the UAE. The ministry plays a central role in the country\'s labour ecosystem. Starting from issuing work permits and protecting employee rights to managing MOHRE enquiry services, supervising WPS, and implementing national employment strategies.')}
${p('MOHRE UAE is still leading in 2026. Having a prime role in the region\'s digital government transformation, with AI-powered services, streamlined approvals, stronger Emiratisation policies, and enhanced worker protections.')}
${p('With expert guidance from <a href="/">KPM PRO</a>, official MOHRE Services Centres, and digital platforms, both employees and employers are fully supported. Employees can check their labour contract, while employers can manage workforce compliance. These services make the employment process secure, compliant, and efficient.')}

${h2('FAQs')}
${h3('What\'s MOHRE in the UAE?')}
${p('The Ministry of Human Resources and Emiratisation is known as MOHRE. They are responsible for regulating private-sector employment. Issuing work permits, enforcing labour laws, and protecting employee rights are also their major functions.')}
${h3('What Is the MOHRE Contact Number?')}
${p('MOHRE\'s customer service number is 600 590000. Their support is also available through the:')}
${ul(['Official website', 'Mobile application', 'Customer service channels'])}
${h3('What services does MOHRE provide?')}
${p('MOHRE offers work permits, labour contract verification, complaint management, WPS oversight, and employer services. Under MOHRE, Emiratisation support and various online enquiry services are also provided.')}
${h3('How do I contact MOHRE in the UAE?')}
${p('You can contact MOHRE through its official website. Accessing them is also possible via mobile app, customer service hotline, authorized service centers, or UAE Pass-enabled digital services.')}
${h3('How do I check my labour contract on MOHRE?')}
${p('Checking your labour contract on MOHRE is simple. Start by:')}
${ul([
  'Logging into the MOHRE portal using UAE Pass',
  'Access Labour Contract Enquiry',
  'Enter your permit or Emirates ID details',
  'Lastly, download your contract.',
])}
${h3('Where are MOHRE service centers located?')}
${p('Authorized centers operate throughout:')}
${ul(['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Al Ain', 'Umm Al Quwain'])}
${h3('What\'s the MOHRE enquiry service?')}
${p('It is an online platform and permits employees and employers to check:')}
${ul([
  'Work permits',
  'Labour contracts',
  'Complaints',
  'Application status',
  'Employer records',
])}
${h3('What\'s Emiratisation? And how does MOHRE enforce it?')}
${p('It is the UAE government\'s program, which is introduced to increase private-sector employment opportunities for Emirati citizens. MOHRE monitors company compliance and applies penalties where required.')}
${h3('Has MOHRE changed anything in 2026?')}
${p('MOHRE has numerous key updates announced in the year 2026, including:')}
${ul([
  'Expanded AI-powered services',
  'Enhanced digital government integration',
  'Stricter Emiratisation monitoring',
  'Improved data privacy regulations',
  'Continued simplification of employment services',
])}
<p><script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "What's MOHRE in the UAE?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "The Ministry of Human Resources and Emiratisation is known as MOHRE. It is responsible for regulating private-sector employment, issuing work permits, enforcing labour laws, and protecting employee rights."
    }
  },{
    "@type": "Question",
    "name": "What Is the MOHRE Contact Number?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "MOHRE's customer service number is 600 590000. Support is also available through the official website, mobile application, and customer service channels."
    }
  },{
    "@type": "Question",
    "name": "What services does MOHRE provide?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "MOHRE offers work permits, labour contract verification, complaint management, WPS oversight, and employer services. It also provides Emiratisation support and various online enquiry services."
    }
  },{
    "@type": "Question",
    "name": "How do I contact MOHRE in the UAE?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "You can contact MOHRE through its official website, mobile app, customer service hotline, authorized service centers, or UAE Pass-enabled digital services."
    }
  },{
    "@type": "Question",
    "name": "How do I check my labour contract on MOHRE?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "To check your labour contract on MOHRE, log into the MOHRE portal using UAE Pass, access Labour Contract Enquiry, enter your permit or Emirates ID details, and download your contract."
    }
  },{
    "@type": "Question",
    "name": "Where are MOHRE service centers located?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "Authorized MOHRE service centers operate throughout Dubai, Abu Dhabi, Sharjah, Ajman, Ras Al Khaimah, Fujairah, Al Ain, and Umm Al Quwain."
    }
  },{
    "@type": "Question",
    "name": "What's the MOHRE enquiry service?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "The MOHRE enquiry service is an online platform that allows employees and employers to check work permits, labour contracts, complaints, application status, and employer records."
    }
  },{
    "@type": "Question",
    "name": "What's Emiratisation? And how does MOHRE enforce it?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "Emiratisation is the UAE government's program introduced to increase private-sector employment opportunities for Emirati citizens. MOHRE monitors company compliance and applies penalties where required."
    }
  },{
    "@type": "Question",
    "name": "Has MOHRE changed anything in 2026?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "MOHRE has introduced several key updates in 2026, including expanded AI-powered services, enhanced digital government integration, stricter Emiratisation monitoring, improved data privacy regulations, and continued simplification of employment services."
    }
  }]
}
</script><!-- Simple Share Buttons Adder (8.5.6) simplesharebuttons.com --></p>
${buildShareBlock(SLUG, 'MOHRE UAE Guide (2026): Services, Labour Contracts & Rules')}
`.trim();

let html = templateHtml;

// Global slug / SEO replacements
html = html.replaceAll('what-is-corporate-tax-in-uae', SLUG);
html = html.replaceAll('What Is Corporate Tax in UAE? Rates, Filing &amp; 2026 Rules', META_TITLE);
html = html.replaceAll(
  'What is corporate tax in UAE? 9% on profits above AED 375,000. Learn who must pay, how to file on EmaraTax, 2026 penalty changes.',
  META_DESC,
);
html = html.replaceAll('What is Corporate Tax in UAE? A Complete Guide for 2026', SUBTITLE);
html = html.replace(
  /<link rel="preload" data-rocket-preload as="image"[^>]+>/,
  `<link rel="preload" data-rocket-preload as="image" href="${FEATURED}" fetchpriority="high">`,
);
html = html.replaceAll('/wp-content/uploads/2026/06/What-is-Corporate-Tax-in-UAE.webp', FEATURED);
html = html.replace(
  /<img fetchpriority="high"\s+width="1024" height="683" src="[^"]+" class="attachment-large size-large wp-image-10309" alt="[^"]+"[^/]*\/>/,
  `<img fetchpriority="high" width="1024" height="683" src="${FEATURED}" class="attachment-large size-large wp-image-mohre-featured" alt="MOHRE UAE Ministry of Human Resources and Emiratisation building" />`,
);

// Main post identity (template used corporate tax post 10306)
html = html.replace(/postid-10306/, `postid-${POST_ID}`);
html = html.replace(
  /(elementor-location-single post-)10306( post type-post)/,
  `$1${POST_ID}$2`,
);
html = html.replaceAll('tag-corporate-tax-in-uae tag-corporate-tax-uae', 'tag-mohre-uae tag-mohre');
html = html.replaceAll('wpcf7-f4114-p10306', `wpcf7-f4114-p${POST_ID}`);
html = html.replaceAll('value="10306"', `value="${POST_ID}"`);
html = html.replaceAll('/wp-json/wp/v2/posts/10306', `/wp-json/wp/v2/posts/${POST_ID}`);
html = html.replaceAll('?p=10306', `?p=${POST_ID}`);
html = html.replaceAll('/wp-content/uploads/2026/06/What-is-Corporate-Tax-in-UAE', FEATURED.replace('.png', ''));
html = html.replaceAll('What-is-Corporate-Tax-in-UAE', 'what-is-mohre-featured');

// Strip bogus responsive webp srcset if template paths were rewritten
html = html.replace(
  /<img fetchpriority="high"\s+width="1024" height="683"[\s\S]*?\/>/,
  `<img fetchpriority="high" width="1024" height="683" src="${FEATURED}" class="attachment-large size-large wp-image-mohre-featured" alt="MOHRE UAE Ministry of Human Resources and Emiratisation building" />`,
);

// H1 matches corporate tax posts: full guide title in page title widget
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

// Related articles: replace loop cards without truncating the page tail (footer/scripts)
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

// Uniform related-article thumbnails
html = html.replace(
  /<style id="loop-5894">([\s\S]*?)<\/style>/,
  (match, css) =>
    `<style id="loop-5894">${css}.elementor-5894 .elementor-element.elementor-element-5ee249c img{width:100%;height:220px;object-fit:cover;display:block;}</style>`,
);

html = html.replaceAll('2026-06-08T04:56:12+00:00', '2026-08-20T06:00:00+00:00');
html = html.replaceAll('2026-07-20T06:19:05+00:00', '2026-08-20T06:00:00+00:00');
html = html.replace(
  /Prepared for Astro Phase 1[^<]+/,
  `Prepared for Astro Phase 1 · ${SLUG} · ${new Date().toISOString()}`,
);

// Remove duplicate bottom "Contact us" inquiry block (sidebar form is enough)
html = html.replace(
  /\s*<section class="elementor-section elementor-top-section elementor-element elementor-element-ad81016[\s\S]*?<\/section>\s*(?=<\/div>\s*<\/main)/,
  '\n',
);

writeFileSync(OUT, html);
console.log('Wrote', OUT);

// Keep new post first on Insights (/blog/) and homepage Latest Blog.
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
