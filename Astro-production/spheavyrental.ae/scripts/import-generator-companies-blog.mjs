/**
 * Import "Best Generator Rental Companies in UAE..." blog from DOCX brief.
 * Usage: node scripts/import-generator-companies-blog.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const uploadsDir = path.join(root, 'public/wp-content/uploads/2026/08');
const postsPath = path.join(root, 'src/data/posts.json');
const tagsPath = path.join(root, 'src/data/tags.json');
const categoriesPath = path.join(root, 'src/data/categories.json');
const sitemapPath = path.join(root, 'src/data/sitemap-urls.json');
const templatePath = path.join(root, 'src/data/single-post-template.html');

const SLUG = 'best-generator-rental-companies-in-uae';
const PATH = `/${SLUG}/`;
const POST_ID = 1806;
const DATE = '2026-08-26T10:00:00';
const MODIFIED = '2026-08-26T10:00:00';
const TITLE = 'Best Generator Rental Companies in UAE and Dubai (2026 Complete Guide)';
const META_TITLE = 'Top Generator Rental Companies in UAE & Dubai';
const META_DESC =
  'Looking for trusted generator rental companies in UAE or Dubai? Compare top diesel generator rental companies, types, pricing, and tips to choose the right power solution in 2026.';
const FOCUS = 'generator rental companies';

const IMG = {
  featured: {
    file: 'BestGeneratorRentalCompaniesinUAE.webp',
    src: '/wp-content/uploads/2026/08/BestGeneratorRentalCompaniesinUAE.webp',
    alt: 'generator rental companies',
    from: 'C:/Users/Tabish/Downloads/BestGeneratorRentalCompaniesinUAE.webp',
  },
  cta: {
    file: 'Best-Generator-Rental-Companies-in-UAE-CTA.webp',
    src: '/wp-content/uploads/2026/08/Best-Generator-Rental-Companies-in-UAE-CTA.webp',
    alt: 'generator rental companies in dubai',
    from: 'C:/Users/Tabish/Downloads/Best Generator Rental Companies in UAE CTA.webp',
  },
  company: {
    file: 'Best-Generator-Rental-Company-in-UAE.webp',
    src: '/wp-content/uploads/2026/08/Best-Generator-Rental-Company-in-UAE.webp',
    alt: 'best generator rental companies in uae',
    from: 'C:/Users/Tabish/Downloads/Best Generator Rental Company in UAE.webp',
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

function buildContent() {
  let html = '';

  html += p(
    `Power cuts on a construction site wait for no one. Why should your work be stalled and your project thrown off the schedule planned for months in advance? With the right kind of backup, you can make sure your business continues operating uninterrupted. Your money, deadlines, and patience are relying on you working with one of the reliable ${b('generator rental companies')} in UAE.`,
  );
  html += p(
    `These companies are currently seeing record demand in 2026. Because these temporary power solutions are what promises a business their operational insurance. Be it large-scale infrastructure projects, hotels, hospitals, film shoots, or industrial operations, they are needed almost everywhere. Moreover, renting is more financially efficient for many companies than investing millions of dirhams into equipment that would be left unused for half the year.`,
  );
  html += p(
    `We have written this guide for companies comparing ${b('generator rental companies in UAE')}. This guide covers which providers stand out from the crowd and why, what rental rates are in 2026, and how you can save yourself from signing a contract that quietly drains your budget later.`,
  );

  html += h2('Why Generator Rental Demand Is Rising in the UAE in 2026');
  html += pb(
    `${a('/generator-rental/', 'Generator rental UAE')} services are seeing a hike in demand across every major emirate. The reasons are simple: tourism expansion, logistics growth, smart city projects, and industrial development all contribute to this.`,
  );
  html += p(
    `Dubai alone has become one of the leading temporary power solutions UAE providers because construction schedules rarely pause here. Combine this with the large exhibitions, luxury events, and growing data center infrastructure. It becomes clear why backup power is so important for business continuity.`,
  );
  html += p(
    `Companies are preferring to rent heavy equipment over buying them, especially if they are working on one-off projects or don’t have many construction projects already lined up. Moreover, buying industrial generators means you have to handle everything including maintenance, storage, transport, servicing, fuel management, and depreciation. The cost and all the work that goes into it add up pretty fast.`,
  );
  html += p(
    `Clients now ask for cleaner power systems, especially in the hospitality and public events sectors.`,
  );
  html += linkedImg('/contact-us/', IMG.cta.src, IMG.cta.alt);

  html += h2('What to Look for in Generator Rental Companies in UAE');
  html += p(`You should look for these factors when you are looking for a generator rental company in UAE:`);

  html += h3('Fleet Size and Generator Capacity Range');
  html += p(
    `You want a serious rental provider to offer generators starting around 20 kVA and scaling up to 2,000 kVA or more.`,
  );
  html += p(
    `The bigger the inventory, the faster the deployment. This proves to be more important when you are suddenly faced with shutdowns or emergency outages on the site, or there are last-minute construction delays.`,
  );

  html += h3('Brand Quality and Certifications');
  html += p(
    `The strongest diesel generator rental companies in UAE usually stock globally recognized brands, including Cummins, Caterpillar, Perkins, Volvo Penta, and FG Wilson.`,
  );
  html += p(`Brand quality affects fuel efficiency, noise levels, reliability, and servicing intervals.`);
  html += p(
    `You should also confirm UAE emissions approvals and regulatory compliance before signing a generator rental contract.`,
  );

  html += h3('Delivery, Setup, and On-Site Support');
  html += p(
    `Fast delivery separates dependable generator rental companies in Dubai from the ones that vanish after invoice payment. Ask them if the installation, cabling, commissioning, and technician support are included.`,
  );

  html += h3('Rental Contract Flexibility');
  html += p(
    `Good suppliers offer daily, weekly, monthly, and long-term rental structures. You need the ones that are adaptable to your project needs. Also watch out for the hidden transport charges, fuel policies, and damage deposits that can quietly inflate the costs later.`,
  );

  html += h2('Top Generator Rental Companies in UAE and Dubai (2026)');
  html += p(
    `These are the generator rental companies in UAE and Dubai that are ranked and recognized as some of the best:`,
  );

  html += h3('Aggreko UAE');
  html += p(
    `Aggreko remains one of the biggest global players in temporary power. The company supports oil and gas projects, mega events, construction sites, and industrial facilities across the UAE.`,
  );
  html += p(
    `Operating from Jebel Ali Free Zone, Aggreko also offers hybrid systems and temperature-controlled power solutions, which are increasingly relevant for data centers and specialized industrial operations.`,
  );

  html += h3('ACE Power (Acepower Equipment Rental LLC)');
  html += p(
    `ACE Power has built a strong reputation over two decades in the UAE market. Their fleet ranges from 15 kVA to 1,250 kVA, covering both SME requirements and industrial-scale operations.`,
  );
  html += p(
    `One standout feature is their power-on-demand automation capability, useful for sites requiring stable load management.`,
  );

  html += h3('Al Shola Group');
  html += p(
    `Al Shola Group operates from Al Quoz and focuses heavily on rapid deployment projects. Their megawatt-class solutions suit large infrastructure and industrial applications where downtime is expensive enough to trigger executive panic.`,
  );

  html += h3('Byrne Equipment Rental');
  html += p(
    `Turnkey rental solutions are what Byrne Equipment Rental is most widely recognized for. Their company maintains a strong presence in Dubai Industrial City. They handle short-term as well as long-term duration contracts.`,
  );

  html += h3('Reyami Rental');
  html += p(
    `Reyami Rental offers generator systems from Perkins, Lister Petter, and Daishin Japan. Their fleet ranges between 20 kVA and 2,000 kVA. They offer project-based customization options.`,
  );

  html += h3('Top Notch Equipment Rental LLC');
  html += p(
    `Top Notch Equipment Rental LLC serves Dubai, Abu Dhabi, Sharjah, and Ajman. They offer daily, weekly, and monthly rental structures.`,
  );

  html += h3('Geo Group Global (Geo Rental Solutions)');
  html += p(
    `Geo Group Global focuses on fast emergency response and flexible fleet availability across the UAE. Their 24/7 support model is great for those who are faced with industrial shutdowns and urgent temporary power needs.`,
  );

  html += `<table>
<tbody>
<tr>
<td><span style="color: #ffffff;"><b>Company</b></span></td>
<td><span style="color: #ffffff;"><b>Location</b></span></td>
<td><span style="color: #ffffff;"><b>Capacity Range</b></span></td>
<td><span style="color: #ffffff;"><b>Rental Periods</b></span></td>
<td><span style="color: #ffffff;"><b>Brands Offered</b></span></td>
</tr>
<tr>
<td><span style="font-weight: 400; color: #ffffff;">Aggreko UAE</span></td>
<td><span style="font-weight: 400; color: #ffffff;">Jebel Ali</span></td>
<td><span style="font-weight: 400; color: #ffffff;">Up to industrial scale</span></td>
<td><span style="font-weight: 400; color: #ffffff;">Short and long-term</span></td>
<td><span style="font-weight: 400; color: #ffffff;">Hybrid, industrial systems</span></td>
</tr>
<tr>
<td><span style="font-weight: 400; color: #ffffff;">ACE Power</span></td>
<td><span style="font-weight: 400; color: #ffffff;">Dubai</span></td>
<td><span style="font-weight: 400; color: #ffffff;">15 kVA to 1,250 kVA</span></td>
<td><span style="font-weight: 400; color: #ffffff;">Flexible</span></td>
<td><span style="font-weight: 400; color: #ffffff;">Cummins, Perkins</span></td>
</tr>
<tr>
<td><span style="font-weight: 400; color: #ffffff;">Al Shola Group</span></td>
<td><span style="font-weight: 400; color: #ffffff;">Al Quoz</span></td>
<td><span style="font-weight: 400; color: #ffffff;">Megawatt class</span></td>
<td><span style="font-weight: 400; color: #ffffff;">Project-based</span></td>
<td><span style="font-weight: 400; color: #ffffff;">Industrial fleets</span></td>
</tr>
<tr>
<td><span style="font-weight: 400; color: #ffffff;">Byrne Equipment Rental</span></td>
<td><span style="font-weight: 400; color: #ffffff;">Dubai Industrial City</span></td>
<td><span style="font-weight: 400; color: #ffffff;">Wide industrial range</span></td>
<td><span style="font-weight: 400; color: #ffffff;">Short and long-term</span></td>
<td><span style="font-weight: 400; color: #ffffff;">CAT, FG Wilson</span></td>
</tr>
<tr>
<td><span style="font-weight: 400; color: #ffffff;">Reyami Rental</span></td>
<td><span style="font-weight: 400; color: #ffffff;">UAE wide</span></td>
<td><span style="font-weight: 400; color: #ffffff;">20 kVA to 2,000 kVA</span></td>
<td><span style="font-weight: 400; color: #ffffff;">Flexible</span></td>
<td><span style="font-weight: 400; color: #ffffff;">Perkins, Daishin</span></td>
</tr>
<tr>
<td><span style="font-weight: 400; color: #ffffff;">Top Notch Equipment Rental</span></td>
<td><span style="font-weight: 400; color: #ffffff;">UAE wide</span></td>
<td><span style="font-weight: 400; color: #ffffff;">Small to industrial</span></td>
<td><span style="font-weight: 400; color: #ffffff;">Daily to monthly</span></td>
<td><span style="font-weight: 400; color: #ffffff;">Multiple brands</span></td>
</tr>
<tr>
<td><span style="font-weight: 400; color: #ffffff;">Geo Group Global</span></td>
<td><span style="font-weight: 400; color: #ffffff;">UAE wide</span></td>
<td><span style="font-weight: 400; color: #ffffff;">Portable to industrial</span></td>
<td><span style="font-weight: 400; color: #ffffff;">Flexible</span></td>
<td><span style="font-weight: 400; color: #ffffff;">Mixed fleet</span></td>
</tr>
</tbody>
</table>\n`;

  html += img(IMG.company.src, IMG.company.alt);

  html += h2('Different Types of Generators Available for Rent');
  html += pb(
    `There are ${a('/types-of-generators/', 'different types of generators available for rent')}. The actual purpose of the usage can help determine which generator suits your needs.`,
  );

  html += h3('Diesel Generators');
  html += p(
    `For industrial and commercial operations, diesel generator rental UAE is the most in demand. These units range between 20 kVA and 2,500 kVA. They work best for construction sites, factories, warehouses, and long-duration usage.`,
  );

  html += h3('Silent (Sound Attenuated) Generators');
  html += p(
    `Noise restrictions are stricter around hotels, residential communities, and public events. That’s where you’d see silent generator rental Dubai being more in demand, as these generators include acoustic canopies that reduce operational noise. They cost slightly more than the rest.`,
  );

  html += h3('Portable and Mobile Generators');
  html += p(
    `Remote locations, outdoor events, and film productions greatly benefit from hiring portable generator services in UAE. Moreover, these compact units range from 10 kVA to 100 kVA and are easy to transport.`,
  );

  html += h3('Three-Phase Generators');
  html += p(
    `For industrial machinery and large commercial operations requiring balanced electric loads, 3 phase generator rental UAE solutions are the perfect answer.`,
  );

  html += h3('Hybrid and Gas Generators');
  html += p(
    `As emission reduction and fuel efficiency get more priority, gas generator rentals and hybrid systems that combine diesel and battery technology are becoming more common in 2026.`,
  );

  html += h4('Which Generator Type Should You Rent?');
  html += p(
    `The right choice comes down to load requirements, operating hours, location restrictions, and budget. Your usage, purpose, and function impact which generator will suit you best.`,
  );
  html += p(
    `If you are powering heavy machinery or a long-term industrial site, diesel generators offer the strongest balance between reliability and output.`,
  );
  html += p(
    `If your project sits near residential or hospitality areas, silent generators are the safer choice.`,
  );
  html += p(
    `Portable generators work best for smaller events, mobile setups, and temporary outdoor operations.`,
  );
  html += p(
    `Three-phase systems suit manufacturing plants and industrial facilities running high-load equipment.`,
  );
  html += p(
    `Hybrid or gas-powered generators make sense when fuel efficiency, sustainability targets, or emissions regulations carry extra weight in your operation.`,
  );

  html += h2('The Cost of Renting a Generator in UAE (2026 Pricing Breakdown)');
  html += pb(
    `We share the estimate ${a('/generator-rental-cost/', 'cost for renting generators')} of different sizes on a daily basis:`,
  );

  html += `<p><span style="color: #ffffff;"><b>Generator Rental Rates by Size (kVA)</b></span></p>\n`;
  html += `<table>
<tbody>
<tr>
<td><span style="color: #ffffff;"><b>Generator Size</b></span></td>
<td><span style="color: #ffffff;"><b>Approx. Daily Rate (AED)</b></span></td>
<td><span style="color: #ffffff;"><b>Best For</b></span></td>
</tr>
<tr>
<td><span style="font-weight: 400; color: #ffffff;">20 to 50 kVA</span></td>
<td><span style="font-weight: 400; color: #ffffff;">250 to 500</span></td>
<td><span style="font-weight: 400; color: #ffffff;">Small events, retail</span></td>
</tr>
<tr>
<td><span style="font-weight: 400; color: #ffffff;">60 to 150 kVA</span></td>
<td><span style="font-weight: 400; color: #ffffff;">600 to 1,200</span></td>
<td><span style="font-weight: 400; color: #ffffff;">Construction sites</span></td>
</tr>
<tr>
<td><span style="font-weight: 400; color: #ffffff;">200 to 500 kVA</span></td>
<td><span style="font-weight: 400; color: #ffffff;">1,500 to 3,500</span></td>
<td><span style="font-weight: 400; color: #ffffff;">Industrial operations</span></td>
</tr>
<tr>
<td><span style="font-weight: 400; color: #ffffff;">1,000+ kVA</span></td>
<td><span style="font-weight: 400; color: #ffffff;">Custom pricing</span></td>
<td><span style="font-weight: 400; color: #ffffff;">Large infrastructure</span></td>
</tr>
</tbody>
</table>\n`;

  html += h3('What Affects Generator Rental Pricing?');
  html += p(`Generator rental rates UAE provider quotes depend on several factors:`);
  html += `<ul>
<li><span style="color: #ffffff;">Premium brands such as CAT and Cummins usually cost more.</span></li>
<li><span style="color: #ffffff;">Silent units also are priced higher compared to open-frame models.</span></li>
<li><span style="color: #ffffff;">Delivery distance, fuel charges, transformers, cabling, AMF panels, and distribution boards also affect the pricing.</span></li>
</ul>\n`;

  html += h3('Monthly vs. Daily Rental, Which is Better?');
  html += p(
    `Daily rentals work well for events or emergency outages. Average short-term rates start around AED 250 per day.`,
  );
  html += p(
    `Long term rentals reduce the effective daily rate considerably. Some 50 kVA Cummins units start around AED 2,500 monthly under extended agreements.`,
  );

  html += h4('Hidden Costs to Watch Out For');
  html += p(
    `Fuel refill charges catch many renters off guard. Return transport fees and insurance liabilities also deserve attention before contract approval.`,
  );

  html += h2('Industries Relying on Generator Rental Companies in Dubai &amp; UAE');
  html += p(
    `Construction firms remain the largest users of construction generator rental Dubai services, but the client base is much broader today. These industries also heavily rely on generator usage:`,
  );
  html += `<ul>
<li><span style="color: #ffffff;">Construction and real estate development</span></li>
<li><span style="color: #ffffff;">Oil and gas (offshore and onshore)</span></li>
<li><span style="color: #ffffff;">Events, weddings, and exhibitions</span></li>
<li><span style="color: #ffffff;">Healthcare and hospitals (critical backup power)</span></li>
<li><span style="color: #ffffff;">Marine and ports</span></li>
<li><span style="color: #ffffff;">Hotels and hospitality</span></li>
<li><span style="color: #ffffff;">Film and media production</span></li>
</ul>\n`;
  html += p(
    `Oil and gas companies require temporary power for their offshore and onshore operations. Events and exhibitions depend heavily on event generator rental UAE providers. Hospitals and healthcare facilities use emergency generator rental UAE services for backup power. Hotels, ports, film production crews, and industrial facilities all rely on temporary power systems to keep operations running without interruption.`,
  );

  html += h2('How to Choose the Right Generator Rental Company in UAE (Step by Step)');
  html += p(`This is how you can choose the right company for your project in UAE:`);
  html += `<ul>
<li><span style="color: #ffffff;">Calculate your actual power load requirements in kVA or kW.</span></li>
<li><span style="color: #ffffff;">Define your rental duration.</span></li>
<li><span style="color: #ffffff;">If you are working on short-term projects, you need flexibility.</span></li>
<li><span style="color: #ffffff;">If you are working on long-term industrial operations, you’d benefit more from structured monthly agreements.</span></li>
<li><span style="color: #ffffff;">Shortlist suppliers offering the correct capacity range and trusted generator brands that you need for your operations.</span></li>
<li><span style="color: #ffffff;">Compare maintenance support, response times, and service level agreements carefully.</span></li>
<li><span style="color: #ffffff;">Request itemized quotations instead of relying on their headline pricing alone.</span></li>
<li><span style="color: #ffffff;">And finally, confirm UAE compliance approvals and if they offer 24/7 technical support availability before you sign anything.</span></li>
</ul>\n`;

  html += h2('Generator Rental Companies in UAE, City by City Availability:');
  html += h3('Generator Rental Companies in Dubai');
  html += p(
    `Al Quoz, Jebel Ali, Dubai Industrial City are the main hubs in Dubai. The generator rental companies in Dubai are ACE Power, Al Shola, Byrne, Geo Group, and Top Notch.`,
  );
  html += h3('Generator Rental Companies in Abu Dhabi');
  html += p(
    `Amirah Construction Equipment Rental and Al Masaood Group are two of the prominent names in Abu Dhabi.`,
  );
  html += p(
    `Abu Dhabi suppliers, including Al Masaood Group, focus on higher capacity industrial systems reaching above 3,000 kVA.`,
  );
  html += h3('Generator Rental Companies in Sharjah');
  html += p(
    `Prime Power Equipment Rental and Liberty Building Systems are among the generator rental companies operating in Sharjah. Overall, Sharjah-based providers are even more cost-competitive than Dubai-based providers.`,
  );

  html += h2('Frequently asked questions about generator rental in UAE');

  const faqs = [
    {
      q: 'What is the cost of renting a generator in UAE?',
      a: 'Smaller units start around AED 250 daily. The cost for renting out industrial generators varies depending on their size, duration, and support requirements.',
    },
    {
      q: 'Which are the most trusted diesel generator rental companies in UAE?',
      a: 'Aggreko UAE, ACE Power, Byrne Equipment Rental, Reyami Rental, and Al Shola Group are among the most recognized names.',
    },
    {
      q: 'Can I rent a generator for a single day in Dubai?',
      a: 'You can rent a generator for a single day in Dubai. There are many generator rental companies in Dubai that offer their daily rental plans for events, emergencies, and short projects.',
    },
    {
      q: 'What size generator do I need for a construction site?',
      a: 'That depends on your equipment load. Small sites may need 50 to 100 kVA, whereas industrial projects often require 500 kVA or more.',
    },
    {
      q: 'Do generator rental companies in UAE include fuel and maintenance?',
      a: 'Some generator rental companies in UAE include fuel and maintenance. You should always confirm the fuel policy and maintenance terms before finalizing the contract with any company.',
    },
    {
      q: 'Are silent generators available for rent in Dubai?',
      a: 'Silent generators are widely available for rent in Dubai.',
    },
    {
      q: 'How far in advance should I book a generator rental in UAE?',
      a: 'If you are booking a generator rental in advance, you should book 1 to 2 weeks ahead for planned projects. If it’s already peak construction or event season, booking earlier gives you better pricing and more options with fleet availability.',
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
        articleSection: 'Generator',
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
  // Strip outer html/body if present so we inject a fragment
  tpl = tpl.replace(/^[\s\S]*?(<div data-elementor-type="single-page")/i, '$1');
  tpl = tpl.replace(/<\/body>\s*<\/html>\s*$/i, '');
  tpl = tpl.replace(/post-\d+/g, `post-${POST_ID}`);
  tpl = tpl.replace(
    /hentry[^"]*/g,
    'hentry category-generator tag-generator-rental-companies tag-generator-rental-companies-in-uae',
  );

  // DOCX order: featured image, then H1
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
  // Related cards may still contain leftover placeholders — leave real related titles alone.
  tpl = tpl.replaceAll('<!--POST_TITLE-->', '');
  tpl = tpl.replace('<!--POST_CONTENT-->', contentHtml);
  tpl = tpl.replaceAll('<!--POST_FEATURED_SRC-->', IMG.featured.src);
  tpl = tpl.replaceAll('<!--POST_TITLE_TEXT-->', IMG.featured.alt);
  // Always serve relative links locally (never absolute live domain in Read More).
  tpl = tpl.replace(/https:\/\/(?:www\.)?spheavyrental\.ae(\/[^"'>\s]*)/gi, '$1');
  tpl = tpl.replace(
    /<time>[^<]*<\/time>/,
    '<time>August 26, 2026</time>',
  );
  tpl = tpl.replace(
    /href="\/\d{4}\/\d{2}\/\d{2}\/"/,
    'href="/2026/08/26/"',
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

  // Tags
  const tags = JSON.parse(fs.readFileSync(tagsPath, 'utf8'));
  let tag1 = tags.find((t) => t.slug === 'generator-rental-companies');
  if (!tag1) {
    tag1 = {
      id: 72,
      name: 'generator rental companies',
      slug: 'generator-rental-companies',
      path: '/tag/generator-rental-companies/',
      description: '',
      count: 1,
    };
    tags.push(tag1);
  } else {
    tag1.count = (tag1.count || 0) + 1;
  }
  let tag2 = tags.find((t) => t.slug === 'generator-rental-companies-in-uae');
  if (!tag2) {
    tag2 = {
      id: 73,
      name: 'generator rental companies in UAE',
      slug: 'generator-rental-companies-in-uae',
      path: '/tag/generator-rental-companies-in-uae/',
      description: '',
      count: 1,
    };
    tags.push(tag2);
  } else {
    tag2.count = (tag2.count || 0) + 1;
  }
  fs.writeFileSync(tagsPath, `${JSON.stringify(tags, null, 2)}\n`);

  // Category count
  const categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'));
  const genCat = categories.find((c) => c.id === 44);
  if (genCat) genCat.count = (genCat.count || 0) + 1;
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
    categories: [44],
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

  // Sitemap
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
