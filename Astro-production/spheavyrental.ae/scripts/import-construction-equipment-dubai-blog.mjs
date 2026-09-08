/**
 * Import "Complete Guide to Renting Construction Equipment in Dubai..." blog from DOCX brief.
 * Usage: node scripts/import-construction-equipment-dubai-blog.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const mediaDir = path.join(__dirname, '_tmp-construction-docx-media');
const uploadsDir = path.join(root, 'public/wp-content/uploads/2026/09');
const postsPath = path.join(root, 'src/data/posts.json');
const tagsPath = path.join(root, 'src/data/tags.json');
const categoriesPath = path.join(root, 'src/data/categories.json');
const sitemapPath = path.join(root, 'src/data/sitemap-urls.json');
const templatePath = path.join(root, 'src/data/single-post-template.html');

const SLUG = 'renting-construction-equipment-in-dubai-guide';
const PATH = `/${SLUG}/`;
const POST_ID = 1807;
const DATE = '2026-09-01T10:00:00';
const MODIFIED = '2026-09-01T10:00:00';
const TITLE = 'Complete Guide to Renting Construction Equipment in Dubai, UAE (2026)';
const META_TITLE = 'Construction Equipment Rental Dubai: 2026 Rates & Guide';
const META_DESC =
  'Compare 2026 heavy equipment rental rates in Dubai. Learn how to hire excavators, cranes, and lifts, navigate legal rules, and cut site costs.';
const FOCUS = 'Construction equipment rental Dubai';

const IMG = {
  featured: {
    file: 'guide-to-renting-construction-equipment-in-dubai-uae.jpg',
    src: '/wp-content/uploads/2026/09/guide-to-renting-construction-equipment-in-dubai-uae.jpg',
    alt: 'Construction equipment rental Dubai',
    from: path.join(uploadsDir, 'guide-to-renting-construction-equipment-in-dubai-uae.jpg'),
  },
  rental: {
    file: 'image5.jpg',
    src: '/wp-content/uploads/2026/09/image5.jpg',
    alt: 'Rent construction machinery Dubai',
    from: path.join(mediaDir, 'image5.jpg'),
  },
  scaffolding: {
    file: 'image3.jpg',
    src: '/wp-content/uploads/2026/09/image3.jpg',
    alt: 'Heavy equipment rental UAE',
    from: path.join(mediaDir, 'image3.jpg'),
  },
  telematics: {
    file: 'image2.jpg',
    src: '/wp-content/uploads/2026/09/image2.jpg',
    alt: 'Construction equipment hire Dubai',
    from: path.join(mediaDir, 'image2.jpg'),
  },
};

function p(html) {
  return `<p><span style="font-weight: 400; color: #ffffff;">${html}</span></p>\n`;
}
function pb(html) {
  return `<p><span style="color: #ffffff;">${html}</span></p>\n`;
}
function h2(t) {
  return `<h2><span style="color: #ffffff;">${t}</span></h2>\n`;
}
function h3(t) {
  return `<h3><span style="color: #ffffff;">${t}</span></h3>\n`;
}
function h4(t) {
  return `<h4><span style="color: #ffffff;">${t}</span></h4>\n`;
}
function a(href, text) {
  return `<a style="color: #ffffff;" href="${href}">${text}</a>`;
}
function b(text) {
  return `<b>${text}</b>`;
}
function img(src, alt, opts = {}) {
  const w = opts.width ? ` width="${opts.width}"` : '';
  const h = opts.height ? ` height="${opts.height}"` : '';
  const loading = opts.loading || 'lazy';
  return `<p><span style="color: #ffffff;"><img decoding="async" class="aligncenter" src="${src}" alt="${alt}"${w}${h} loading="${loading}" /></span></p>\n`;
}
function linkedImg(href, src, alt) {
  return `<p><span style="color: #ffffff;"><a href="${href}"><img decoding="async" class="aligncenter" src="${src}" alt="${alt}" loading="lazy" /></a></span></p>\n`;
}
function ul(items) {
  return `<ul>\n${items.map((item) => `<li><span style="color: #ffffff;">${item}</span></li>`).join('\n')}\n</ul>\n`;
}

function buildContent() {
  let html = '';

  html += p(
    `Dubai's construction sector is reaching an all-time high. With the UAE government's budget being AED 99.5 billion, nearly 48% of it allocated to infrastructure projects, including roads, bridges, tunnels, public transport, and urban development, will be giving way to an increasing demand for heavy machinery.`,
  );
  html += p(
    `But owning every machine required for a project isn't the most practical route for most contractors, developers, and project managers. A viable solution to this conundrum involves leveraging the ${b('construction equipment rental')} services in Dubai.`,
  );
  html += p(
    `Our guide covers how you can easily ${a('/construction-equipment-rental/', 'rent construction equipment in Dubai')} and the UAE, all the different kinds of equipment that you can rent from providers, their rental costs, legal requirements, and leading suppliers. We also cover how you can choose the right rental partner in 2026 and what you should know before you rent.`,
  );

  html += h2('Why Renting Construction Equipment Is More Feasible than Buying in 2026');
  html += p(
    `A machine sitting idle between projects generates no revenue while continuing to incur costs. For many contractors, these hidden expenses quietly erode project profitability. That's why most contractors prefer renting to buying.`,
  );

  html += h3("The Real Cost of Ownership that's Not Talked About Enough");
  html += p(
    `If you own heavy machinery, that means you have to pay for storage yards, theft and damage insurance, maintenance programs, spare parts, transportation between sites, operator training, and compliance inspections. Moreover, this equipment is also quick to depreciate in value.`,
  );

  html += h3('How the 2026 Financial Year Favours Renting');
  html += p(
    `It is expensive for financing large equipment purchases, especially for contractors who simultaneously manage multiple projects.`,
  );
  html += p(
    `As the heavy equipment rental UAE market continues to expand, industry forecasts are showing the market growing from approximately USD 1.01 billion in 2025 to nearly USD 2.98 billion by 2032.`,
  );

  html += h3('Short-Term vs. Long-Term Rental: Which One Fits Your Project?');
  html += p(`Rental agreements fall into two categories.`);
  html += ul([
    'Equipment-only, where the contractor supplies operators, fuel, and day-to-day management',
    'Equipment plus a certified operator for specialized machinery such as cranes and large excavators',
  ]);
  html += p(
    `Daily and weekly rentals work best for short-duration tasks of trenching, lifting operations, or demolition.`,
  );
  html += p(
    `Six-month and annual contracts offer substantially lower daily rates and suit long-term infrastructure projects.`,
  );
  html += linkedImg('/construction-equipment-rental/', IMG.rental.src, IMG.rental.alt);

  html += h2('Types of Construction Equipment You Can Rent in Dubai');
  html += p(
    `These are the ${a('/types-of-construction-equipment-for-rent/', 'types of construction equipment')} you can rent in Dubai:`,
  );

  html += h3('Earthmoving Equipment');
  html += p(
    `Earthmoving machinery is among the largest segments of construction equipment for renting in the Dubai market. CAT, Komatsu, Volvo, Hitachi, and Kobelco are some of the popular brands of this equipment.`,
  );
  html += p(
    `Mini excavators, standard excavators, 200-ton excavators, bulldozers, backhoe loaders, wheel loaders, and motor graders are types of earthmoving equipment that contractors rent. These machines are particularly great for handling site clearing, trenching, foundation excavation, grading, demolition, and earthmoving operations.`,
  );

  html += h3('Lifting and Hoisting Equipment');
  html += p(
    `Lifting equipment options include mobile cranes, crawler cranes, tower cranes, forklifts, and telehandlers.`,
  );
  html += ul([
    'Forklifts are used for palletized material handling',
    'Telehandlers are great for when you need an extended reach',
    'For heavy lifts and high-rise construction, cranes are the best option',
  ]);
  html += p(
    `Because of ongoing tower and infrastructure developments, demand for crane rental Dubai UAE services remains particularly strong.`,
  );

  html += h3('Aerial Work Platforms');
  html += p(
    `The demand for boom lift rental Dubai services continues growing alongside Dubai's high-rise construction sector. Aerial platforms include scissor lifts, articulating boom lifts, straight boom lifts, and man lifts.`,
  );
  html += p(
    `Scissor lifts perform well indoors on flat surfaces. Whereas boom lifts provide greater reach and flexibility outdoors.`,
  );

  html += h3('Concrete and Road Construction Equipment');
  html += p(
    `Infrastructure projects require concrete mixers, concrete pumps, concrete vibrators, asphalt pavers, road rollers, and soil compactors. These machines are necessary during road construction, airport expansion, and transport infrastructure projects.`,
  );

  html += h3('Power Generation and Utilities');
  html += p(
    `For reliable power on site, common rentals include diesel generators, light towers, air compressors, and welding equipment. These units support remote desert projects and urban developments.`,
  );

  html += h3('Scaffolding and Temporary Structures');
  html += p(
    `Scaffolding systems commonly rented include frame scaffolding, ring lock scaffolding, and cuplock scaffolding. All systems have to comply with UAE safety regulations and inspection requirements before use.`,
  );
  html += img(IMG.scaffolding.src, IMG.scaffolding.alt);

  html += h2('How Much Does Construction Equipment Rental Cost in Dubai? (2026 Rates)');
  html += p(
    `The following figures represent the market ranges for estimated ${b('construction equipment rental cost in Dubai')} for the year 2026:`,
  );

  html += h3('Daily, Weekly, &amp; Monthly Rental Rates');
  html += `<div class="sp-table-wrap">
<table class="sp-data-table">
<thead>
<tr>
<th scope="col">Equipment Type</th>
<th scope="col">Daily Rate (AED)</th>
<th scope="col">Weekly Rate (AED)</th>
<th scope="col">Monthly Rate (AED)</th>
</tr>
</thead>
<tbody>
<tr>
<td>Mini Excavator</td>
<td>450 to 800</td>
<td>2,700 to 4,500</td>
<td>9,000 to 15,000</td>
</tr>
<tr>
<td>Excavator 20 Ton</td>
<td>1,200 to 2,000</td>
<td>7,000 to 12,000</td>
<td>25,000 to 45,000</td>
</tr>
<tr>
<td>Bulldozer</td>
<td>1,500 to 3,000</td>
<td>9,000 to 18,000</td>
<td>35,000 to 70,000</td>
</tr>
<tr>
<td>Boom Lift</td>
<td>500 to 1,200</td>
<td>3,000 to 7,000</td>
<td>10,000 to 25,000</td>
</tr>
<tr>
<td>Mobile Crane</td>
<td>2,500 to 8,000</td>
<td>Custom Quote</td>
<td>Custom Quote</td>
</tr>
<tr>
<td>Generator</td>
<td>200 to 1,500</td>
<td>1,200 to 8,000</td>
<td>4,000 to 25,000</td>
</tr>
</tbody>
</table>
</div>\n`;

  html += h3('Which Factors Change the Rental Price?');
  html += p(`Pricing is influenced by several factors, such as`);
  html += ul([
    'Equipment age and brand',
    'Rental duration',
    'Wet lease versus dry lease',
    'Site location',
    'Insurance requirements',
    'Seasonal demand spikes',
  ]);
  html += p(
    `Moreover, the rental rates often increase during Q1 and Q4 when project activity peaks.`,
  );

  html += h3('Hidden Costs You Should Watch Out For');
  html += p(
    `You should review contractors and watch out for these hidden costs that can later affect your final invoice:`,
  );
  html += ul([
    'Mobilization fees',
    'Demobilization charges',
    'Fuel responsibilities',
    'Overtime billing',
    'Damage liability clauses',
    'Early return penalties',
  ]);

  html += h2('Documents &amp; Legal Requirements for Renting Equipment in Dubai');
  html += p(
    `These are the legal requirements for renting heavy equipment in Dubai and the list of documents you need to rent one:`,
  );

  html += h3('Documents You Need to Provide');
  html += p(`You should have these documents for renting heavy equipment:`);
  html += ul([
    'Valid UAE trade license',
    'Emirates ID or passport copy',
    'Signed rental agreement',
    'Security deposit where applicable',
  ]);
  html += p(
    `Although, due to varying equipment value and project size, the exact requirements might vary.`,
  );

  html += h3('Operator Licensing and Safety Certifications');
  html += p(
    `Certified operators reduce safety risks and improve regulatory compliance. That's why heavy machinery operators should hold appropriate certifications, including`,
  );
  html += ul([
    'Dubai Municipality compliance',
    'HSE certifications',
    'OSHAD compliance for Abu Dhabi projects',
    'Specialized crane operation licenses',
  ]);

  html += h3("Insurance: What's Covered &amp; What's Not");
  html += p(`Before signing, clarify coverage for the following:`);
  html += ul([
    'Third-party liability',
    'Equipment damage',
    'Theft and vandalism',
    'Mechanical breakdowns',
    'Operator injury claims',
  ]);

  html += h2('Top Construction Equipment Rental Companies in Dubai (2026)');
  html += p(`These are the leading rentals for construction equipment in Dubai:`);

  html += h3('Companies with the Largest Fleets');
  html += p(
    `Among major equipment rental companies Dubai, several stand out. There is Al Marwan, which is operating more than 3,000 machinery units and has supported over 32,000 projects. There's also Johnson Arabia that maintains approximately 250 mobile cranes and 600 aerial work platforms. Other major players in this field include Byrne Equipment Rental, Al Faris Group, and Al Shola Rental.`,
  );

  html += h3('Best for Short-Term or Small Projects');
  html += p(
    `For smaller projects, contractors often consider Quality Equipment Rental LLC, Bob Cranes, and DMAG Equipment Rental.`,
  );

  html += h3('What You Should Check Before Signing with Any Company');
  html += p(
    `Here's a checklist for what you should check before you sign a rental contract for construction or heavy equipment with any company:`,
  );
  html += ul([
    'Fleet age',
    'Maintenance support',
    'Emergency response time',
    'Contract flexibility',
    'GPS tracking availability',
    'Relevant project references',
  ]);

  html += h2('How You Can Choose the Right Equipment for YOUR Project');

  html += h3('Start with Your Project Scope');
  html += p(
    `Urban Dubai sites require different machinery than open desert developments. That's why you should first assess the following:`,
  );
  html += ul([
    'Ground conditions',
    'Load requirements',
    'Site access limitations',
    'Working height requirements',
  ]);

  html += h3('Matching Equipment to Project Type');
  html += ul([
    'High-rise projects require tower cranes, concrete pumps, and man lifts',
    'Road projects depend on graders, rollers, pavers, and dump trucks',
    'Villa developments often need mini excavators and backhoes',
    'Demolition projects benefit from large excavators equipped with hydraulic breakers',
  ]);

  html += h3('When to Rent Multiple Pieces from One Supplier vs Split');
  html += p(
    `Working with one supplier simplifies logistics, invoicing, and coordination. However, splitting rentals can make sense when specialist equipment is available from niche providers at better rates or specifications.`,
  );

  html += h2('Smart Tips to Cut Rental Costs Without Cutting Corners');
  html += p(`Here's how you can save on the rental costs without compromising on the quality:`);

  html += h3('Plan Equipment Sequencing Before You Call for Quotes');
  html += p(
    `Many contractors end up unnecessarily paying for overlapping rental periods. You can prevent this by creating a Gantt-style schedule that aligns equipment arrival and departure with actual project phases.`,
  );

  html += h3('Negotiate Long-Term Rates Even on Short Projects');
  html += p(
    `A monthly rate often costs less than stacking weekly rentals. Even a three-week project may benefit from monthly pricing. So always negotiate with your rental provider.`,
  );

  html += h3('Inspect Equipment Before Signing the Delivery Receipt');
  html += p(
    `Document everything. Take photos and videos of the things from this checklist:`,
  );
  html += ul([
    'Existing damage',
    'Tire condition',
    'Track condition',
    'Fluid levels',
    'Fuel levels',
  ]);

  html += h3('Telematics and Remote Monitoring');
  html += p(
    `Modern rental fleets increasingly include telematics systems that monitor location, engine performance, hydraulic health, and utilization rates. GPS tracking protects contractors and rental companies and reduces disputes.`,
  );
  html += linkedImg('/contact-us/', IMG.telematics.src, IMG.telematics.alt);

  html += h2('Construction Equipment Rental Trends in Dubai for 2026 and Beyond');
  html += p(`These are the current trends with construction equipment rentals in Dubai for 2026:`);

  html += h3('The Shift to Electric and Hybrid Machinery');
  html += p(
    `Sustainability initiatives are encouraging rental providers to expand electric and hybrid fleets. Contractors pursuing green building certifications increasingly request low-emission machinery.`,
  );

  html += h3('IoT and Smart Equipment Are Becoming Standard');
  html += p(
    `IoT-enabled machines provide predictive maintenance alerts and real-time performance monitoring. Downtime decreases as equipment utilization improves.`,
  );

  html += h3("Rising Demand Driven by Dubai's Mega Projects");
  html += p(
    `Ongoing metro expansions, road corridor developments, logistics hubs, and District 2020-related projects continue to increase demand for rent construction machinery Dubai services.`,
  );
  html += p(
    `Rental models help contractors scale quickly without long-term ownership commitments.`,
  );

  html += h3('Online Rental Platforms and Digital Procurement');
  html += p(
    `The industry is moving from phone-based bookings to digital procurement systems. Here's a checklist for you to verify things whenever you are booking these tools and equipment online:`,
  );
  html += ul([
    'Equipment specifications',
    'Delivery timelines',
    'Insurance coverage',
    'Operator qualifications',
    'Contract terms',
  ]);

  html += h2(`Continue Your Construction Projects with ${a('https://spheavyrental.ae/', 'SP Heavy Rental')}`);
  html += pb(
    `If you are looking to rent reliable ${a('/construction-equipment-rental/', 'construction equipment in Dubai')}, contact our team at ${a('https://spheavyrental.ae/', 'SP Heavy Rental')}. We specialize in providing the best tools and certified operators for your on-site construction projects.`,
  );

  html += h2('Frequently Asked Questions (FAQs)');

  const faqs = [
    {
      q: 'What is the minimum rental period for construction equipment in Dubai?',
      a: 'Most suppliers offer daily rentals. For certain heavy machines, the minimum rental period might be at least a week.',
    },
    {
      q: 'Can a foreign company rent construction equipment in Dubai without a local trade license?',
      a: 'A foreign company renting construction equipment in Dubai will need a local legal presence or project authorization.',
    },
    {
      q: 'Is the equipment rental price inclusive of an operator in Dubai?',
      a: 'The equipment rental price is not always inclusive of an operator in Dubai. There are leases that exclude operators, while other leases include certified operators.',
    },
    {
      q: 'Who is responsible if rented equipment breaks down on site?',
      a: "If rented equipment breaks down on-site, that mechanical failure is most often the rental company's responsibility. Unless misuse or negligence caused that damage for the equipment to break down on the site.",
    },
    {
      q: 'How far in advance should I book construction equipment in Dubai?',
      a: 'If you are booking construction equipment in Dubai, you should book at least 2 to 4 weeks in advance during peak construction periods.',
    },
    {
      q: 'What happens if I return the equipment early?',
      a: 'It depends on the type of contract you have signed. Where some contracts will allow you to return the equipment early without incurring any penalty, others might have minimum billing clauses in their contracts.',
    },
    {
      q: 'Are there eco-friendly or electric construction equipment options available for rent in Dubai?',
      a: 'There are eco-friendly and electric construction equipment options available for rent in Dubai. This includes electric lifts, hybrid generators, and low-emission equipment.',
    },
    {
      q: "What should I do if the equipment delivered doesn't match what was agreed?",
      a: "If the delivered equipment doesn't match what has been agreed upon, you should immediately document that document discrepancy, refuse accepting the delivery, and notify the supplier right away before you sign the delivery receipt.",
    },
  ];

  for (const faq of faqs) {
    html += h3(faq.q);
    html += p(faq.a);
  }

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.a,
      },
    })),
  };

  html += `<p><span style="color: #ffffff;"><script type="application/ld+json">\n${JSON.stringify(faqSchema, null, 2)}\n</script></span></p>\n`;

  return html;
}

function buildArticleSchema() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['Person', 'Organization'],
        '@id': 'https://spheavyrental.ae/#person',
        name: 'S&amp;P Heavy Machinery Rental',
      },
      {
        '@type': 'WebSite',
        '@id': 'https://spheavyrental.ae/#website',
        url: 'https://spheavyrental.ae',
        name: 'S&amp;P Heavy Machinery Rental',
        publisher: { '@id': 'https://spheavyrental.ae/#person' },
        inLanguage: 'en-US',
      },
      {
        '@type': 'ImageObject',
        '@id': `https://spheavyrental.ae${IMG.featured.src}`,
        url: `https://spheavyrental.ae${IMG.featured.src}`,
        width: '1200',
        height: '675',
        caption: IMG.featured.alt,
        inLanguage: 'en-US',
      },
      {
        '@type': 'WebPage',
        '@id': `https://spheavyrental.ae${PATH}#webpage`,
        url: `https://spheavyrental.ae${PATH}`,
        name: META_TITLE,
        datePublished: `${DATE}+04:00`,
        dateModified: `${MODIFIED}+04:00`,
        isPartOf: { '@id': 'https://spheavyrental.ae/#website' },
        primaryImageOfPage: { '@id': `https://spheavyrental.ae${IMG.featured.src}` },
        inLanguage: 'en-US',
      },
      {
        '@type': 'Person',
        '@id': 'https://spheavyrental.ae/author/faieez/',
        name: 'faieez',
        url: 'https://spheavyrental.ae/author/faieez/',
        image: {
          '@type': 'ImageObject',
          '@id':
            'https://secure.gravatar.com/avatar/94322704e0b8d201aa0745467502f695886be687ce424df63950783fa1dc4545?s=96&amp;d=mm&amp;r=g',
          url: 'https://secure.gravatar.com/avatar/94322704e0b8d201aa0745467502f695886be687ce424df63950783fa1dc4545?s=96&amp;d=mm&amp;r=g',
          caption: 'faieez',
          inLanguage: 'en-US',
        },
      },
      {
        '@type': 'BlogPosting',
        headline: META_TITLE,
        keywords: FOCUS,
        datePublished: `${DATE}+04:00`,
        dateModified: `${MODIFIED}+04:00`,
        articleSection: 'Construction Equipment',
        author: {
          '@id': 'https://spheavyrental.ae/author/faieez/',
          name: 'faieez',
        },
        publisher: { '@id': 'https://spheavyrental.ae/#person' },
        description: META_DESC,
        name: META_TITLE,
        '@id': `https://spheavyrental.ae${PATH}#richSnippet`,
        isPartOf: { '@id': `https://spheavyrental.ae${PATH}#webpage` },
        image: { '@id': `https://spheavyrental.ae${IMG.featured.src}` },
        inLanguage: 'en-US',
        mainEntityOfPage: { '@id': `https://spheavyrental.ae${PATH}#webpage` },
      },
    ],
  };
}

function wrapBodyHtml(contentHtml) {
  let tpl = fs.readFileSync(templatePath, 'utf8');
  tpl = tpl.replace(/^[\s\S]*?(<div data-elementor-type="single-page")/i, '$1');
  tpl = tpl.replace(/<\/body>\s*<\/html>\s*$/i, '');
  tpl = tpl.replace(/post-\d+/g, `post-${POST_ID}`);
  tpl = tpl.replace(
    /hentry[^"]*/g,
    'hentry category-construction-equipment tag-construction-equipment-rental-dubai tag-renting-construction-equipment-in-dubai-guide',
  );

  const featuredBeforeH1 = `<div class="elementor-element elementor-element-sp-featured elementor-widget elementor-widget-image" data-id="sp-featured" data-element_type="widget" data-widget_type="image.default">
				<div class="elementor-widget-container">
					<img fetchpriority="high" decoding="async" class="attachment-large size-large aligncenter" src="${IMG.featured.src}" alt="${IMG.featured.alt}" loading="eager" />
				</div>
				</div>
`;
  tpl = tpl.replace(
    /(<div class="elementor-element elementor-element-0826c62 elementor-widget elementor-widget-theme-post-title)/,
    `${featuredBeforeH1}$1`,
  );

  tpl = tpl.replace(
    /(<div class="elementor-element elementor-element-0826c62[\s\S]*?<h1 class="elementor-heading-title elementor-size-default">)<!--POST_TITLE-->(<\/h1>)/,
    `$1${TITLE}$2`,
  );
  tpl = tpl.replaceAll('<!--POST_TITLE-->', '');
  tpl = tpl.replace('<!--POST_CONTENT-->', contentHtml);
  tpl = tpl.replaceAll('<!--POST_FEATURED_SRC-->', IMG.featured.src);
  tpl = tpl.replaceAll('<!--POST_TITLE_TEXT-->', IMG.featured.alt);
  tpl = tpl.replace(/https:\/\/(?:www\.)?spheavyrental\.ae(\/[^"'>\s]*)/gi, '$1');
  tpl = tpl.replace(
    /<time>[^<]*<\/time>/,
    '<time>September 1, 2026</time>',
  );
  tpl = tpl.replace(
    /href="\/\d{4}\/\d{2}\/\d{2}\/"/,
    'href="/2026/09/01/"',
  );
  return tpl.trim();
}

function main() {
  fs.mkdirSync(uploadsDir, { recursive: true });

  for (const key of Object.keys(IMG)) {
    const item = IMG[key];
    if (!fs.existsSync(item.from)) {
      throw new Error(`Missing source image: ${item.from}`);
    }
    const dest = path.join(uploadsDir, item.file);
    fs.copyFileSync(item.from, dest);
    console.log('Copied', item.file);
  }

  const content = buildContent();
  const bodyHtml = wrapBodyHtml(content);
  const excerpt = `<p>${content
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 220)} [&hellip;]</p>\n`;

  const tags = JSON.parse(fs.readFileSync(tagsPath, 'utf8'));
  let tag1 = tags.find((t) => t.slug === 'construction-equipment-rental-dubai');
  if (!tag1) {
    tag1 = {
      id: 74,
      name: 'construction equipment rental dubai',
      slug: 'construction-equipment-rental-dubai',
      path: '/tag/construction-equipment-rental-dubai/',
      description: '',
      count: 1,
    };
    tags.push(tag1);
  } else {
    tag1.count = (tag1.count || 0) + 1;
  }
  let tag2 = tags.find((t) => t.slug === 'renting-construction-equipment-in-dubai-guide');
  if (!tag2) {
    tag2 = {
      id: 75,
      name: 'renting construction equipment in dubai guide',
      slug: 'renting-construction-equipment-in-dubai-guide',
      path: '/tag/renting-construction-equipment-in-dubai-guide/',
      description: '',
      count: 1,
    };
    tags.push(tag2);
  } else {
    tag2.count = (tag2.count || 0) + 1;
  }
  fs.writeFileSync(tagsPath, `${JSON.stringify(tags, null, 2)}\n`);

  const categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'));
  const constructionCat = categories.find((c) => c.id === 11);
  if (constructionCat) constructionCat.count = (constructionCat.count || 0) + 1;
  fs.writeFileSync(categoriesPath, `${JSON.stringify(categories, null, 2)}\n`);

  const post = {
    id: POST_ID,
    type: 'post',
    slug: SLUG,
    path: PATH,
    link: `https://spheavyrental.ae${PATH}`,
    title: TITLE,
    content,
    excerpt,
    date: DATE,
    modified: MODIFIED,
    categories: [11],
    tags: [tag1.id, tag2.id],
    author: 6,
    authorName: 'faieez',
    authorSlug: 'faieez',
    featuredImage: IMG.featured.src,
    seo: {
      title: META_TITLE,
      description: META_DESC,
      canonical: PATH,
      ogImage: IMG.featured.src,
      robots: { index: 'index', follow: 'follow' },
      schema: null,
      schemas: [buildArticleSchema()],
    },
    elementorCss: '/wp-content/uploads/elementor/css/post-652.css',
    pageCss: [
      '/wp-content/uploads/elementor/css/post-652.css',
      '/wp-content/plugins/elementor/assets/css/widget-heading.min.css',
      '/wp-content/plugins/elementor/assets/css/widget-image.min.css',
      '/wp-content/plugins/elementor/assets/css/widget-divider.min.css',
      '/wp-content/plugins/elementor/assets/css/widget-spacer.min.css',
      '/wp-content/plugins/elementor/assets/css/widget-icon-list.min.css',
      '/wp-content/plugins/elementor-pro/assets/css/widget-author-box.min.css',
      '/wp-content/plugins/elementor-pro/assets/css/widget-post-info.min.css',
      '/wp-content/plugins/ele-custom-skin/assets/css/ecs-style.css',
      '/wp-content/plugins/elementor/assets/css/widget-social-icons.min.css',
      '/wp-content/plugins/elementor/assets/lib/animations/styles/e-animation-grow.min.css',
      '/wp-content/uploads/elementor/css/post-540.css',
      '/wp-content/plugins/elementor/assets/css/widget-icon-box.min.css',
      '/wp-content/plugins/elementor/assets/css/widget-button.min.css',
    ],
    bodyHtml,
    status: 'published',
  };

  const posts = JSON.parse(fs.readFileSync(postsPath, 'utf8'));
  const existing = posts.findIndex((p) => p.slug === SLUG);
  if (existing >= 0) posts.splice(existing, 1);
  posts.unshift(post);
  fs.writeFileSync(postsPath, `${JSON.stringify(posts, null, 2)}\n`);

  if (fs.existsSync(sitemapPath)) {
    const sm = JSON.parse(fs.readFileSync(sitemapPath, 'utf8'));
    if (Array.isArray(sm.posts)) {
      sm.posts = sm.posts.filter((x) => x.path !== PATH);
      sm.posts.unshift({ path: PATH, type: 'post', lastmod: `${DATE}.000Z` });
      fs.writeFileSync(sitemapPath, `${JSON.stringify(sm, null, 2)}\n`);
    }
  }

  console.log(`Published ${PATH} (id ${POST_ID})`);
}

main();
