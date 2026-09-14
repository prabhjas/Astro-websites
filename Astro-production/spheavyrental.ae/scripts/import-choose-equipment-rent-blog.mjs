/**
 * Import "How to Choose the Right Construction Equipment for Rent" blog from DOCX brief.
 * Usage: node scripts/import-choose-equipment-rent-blog.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const mediaDir = path.join(root, 'local/_docx-extract-equipment-rent/word/media');
const uploadsDir = path.join(root, 'public/wp-content/uploads/2026/09');
const postsPath = path.join(root, 'src/data/posts.json');
const tagsPath = path.join(root, 'src/data/tags.json');
const categoriesPath = path.join(root, 'src/data/categories.json');
const sitemapPath = path.join(root, 'src/data/sitemap-urls.json');
const templatePath = path.join(root, 'src/data/single-post-template.html');

const SLUG = 'how-to-choose-the-right-construction-equipment-for-rent';
const PATH = `/${SLUG}/`;
const POST_ID = 1809;
const DATE = '2026-09-14T10:00:00';
const MODIFIED = '2026-09-14T10:00:00';
const TITLE = 'How to Choose the Right Construction Equipment for Rent';
const META_TITLE = 'How to Choose the Right Construction Equipment for Rent';
const META_DESC =
  'Compare types of construction equipment for rent in UAE and Dubai. Learn rental vs. purchase costs, benefits, and how to pick the right machine for your project.';
const FOCUS = 'heavy construction equipment for rent';
const CATEGORY_ID = 11; // Construction Equipment
const AUTHOR = { id: 1, name: 'Calvin Misquith', slug: 'calvin-misquith' };

const IMG = {
  featured: {
    file: 'heavy-construction-equipment-for-rent.jpg',
    src: '/wp-content/uploads/2026/09/heavy-construction-equipment-for-rent.jpg',
    alt: 'heavy construction equipment for rent',
    width: 1500,
    height: 844,
    from: path.join(mediaDir, 'image1.jpg'),
  },
  midLinked: {
    file: 'heavy-construction-equipment-for-rent-site.jpg',
    src: '/wp-content/uploads/2026/09/heavy-construction-equipment-for-rent-site.jpg',
    alt: 'heavy construction equipment for rent',
    width: 1500,
    height: 563,
    from: path.join(mediaDir, 'image2.jpg'),
  },
  midBenefits: {
    file: 'construction-equipment-for-rent.jpg',
    src: '/wp-content/uploads/2026/09/construction-equipment-for-rent.jpg',
    alt: 'construction equipment for rent',
    width: 838,
    height: 433,
    from: path.join(mediaDir, 'image3.jpg'),
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
  return `<a style="color: #FFDD04;" href="${href}">${text}</a>`;
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
function linkedImg(href, src, alt, opts = {}) {
  const w = opts.width ? ` width="${opts.width}"` : '';
  const h = opts.height ? ` height="${opts.height}"` : '';
  return `<p><span style="color: #ffffff;"><a href="${href}"><img decoding="async" class="aligncenter" src="${src}" alt="${alt}"${w}${h} loading="lazy" /></a></span></p>\n`;
}
function ul(items) {
  return `<ul>\n${items.map((item) => `<li><span style="color: #ffffff;">${item}</span></li>`).join('\n')}\n</ul>\n`;
}
function table(headers, rows) {
  const th = headers
    .map((h) => `<td><span style="color: #ffffff;"><b>${h}</b></span></td>`)
    .join('\n');
  const body = rows
    .map(
      (row) =>
        `<tr>\n${row
          .map((cell) => `<td><span style="font-weight: 400; color: #ffffff;">${cell}</span></td>`)
          .join('\n')}\n</tr>`,
    )
    .join('\n');
  return `<table>\n<tbody>\n<tr>\n${th}\n</tr>\n${body}\n</tbody>\n</table>\n`;
}

function buildContent() {
  let html = '';

  html += p(
    `One wrong machine selected can throw an entire construction schedule off course. An excavator that is too small slows excavation. A crane with the wrong capacity creates safety concerns. And equipment sitting idle can burn through the project budget faster than expected.`,
  );
  html += p(
    `Because of this, choosing ${a('/construction-equipment-rental/', 'heavy construction equipment for rent')} isn’t limited to chasing the lowest rate. But the right choice also comes down to capacity, site conditions, rental duration, and supplier support. Simply put, the most affordable rate claimed is not always the one that delivers the best value.`,
  );
  html += p(`The blog clarifies how you can choose the right construction equipment for rent.`);

  html += h2('Why Renting Construction Equipment Makes Sense:');
  html += p(
    `Renting makes sense when you need machinery but are not in a position to commit large amounts of capital to own it. Rental options give you flexibility to use machinery without making a purchase. Best for short-term and multi-site projects.`,
  );

  html += h3('Rising Equipment Costs & UAE Construction Demand:');
  html += p(
    `Across the UAE, construction activity is creating demand for flexible access to machinery. There’s no need to tie up your own capital and invest in equipment that may sit unused after a project. Instead, you can rent machines according to current workload, making construction equipment for rent in the UAE a practical option for contractors managing changing project demands.`,
  );

  html += h3('Flexibility for Short-Term & Multi-Site Projects:');
  html += p(`Rental allows contractors to scale their fleet up or down as work changes.`);
  html += p(
    `For example, a contractor may need an excavator for six weeks, a telehandler for three months, and a generator for a temporary site. Renting allows each machine to match the project timeline instead of becoming a long-term ownership commitment.`,
  );
  html += linkedImg(
    '/construction-equipment-rental/',
    IMG.midLinked.src,
    IMG.midLinked.alt,
    { width: IMG.midLinked.width, height: IMG.midLinked.height },
  );

  html += h2('Types of Construction Equipment for Rent');
  html += p(
    `Construction equipment rental covers various ${a('/types-of-construction-equipment-for-rent/', 'types of machinery for rent')} like earthmoving, lifting, compaction, roadwork, and site support.`,
  );

  html += h3('Earthmoving Equipment');
  html += p(
    `Earthmoving machinery handles excavation, trenching, grading, loading, and site preparation.`,
  );
  html += ul([
    `${a('/rent-excavator/', 'Excavators')}: Digging, demolition, trenching, and earthworks.`,
    `${a('/bulldozer-for-rent/', 'Bulldozers')}: Clearing, pushing material, and grading.`,
    `${a('/what-is-a-backhoe-loader/', 'Backhoe loaders')}: Combined digging and loading for versatile site work.`,
  ]);

  html += h3('Lifting and Material Handling Equipment');
  html += p(`Lifting equipment helps move materials safely and efficiently around the site.`);
  html += ul([
    `Mobile cranes: Heavy and specialised lifting.`,
    `${a('/heavy-machinery-rental/forklift-rental/', 'Forklifts')}: Pallet and material movement.`,
    `Telehandlers: High lifting with extended forward reach.`,
  ]);

  html += h3('Compaction and Road Construction Equipment');
  html += p(`Compaction equipment creates stable surfaces for foundations and roads.`);
  html += h4('Rollers, Compactors, Asphalt Pavers');
  html += p(
    `Rollers and compactors compress soil, aggregate, and asphalt. Asphalt pavers place and level asphalt during road construction.`,
  );

  html += h3('Power and Support Equipment');
  html += p(`Support equipment keeps the site running when permanent infrastructure is unavailable.`);
  html += h4('Generators, Air Compressors, Lighting Towers');
  html += p(`These machines provide temporary power, compressed air, and lighting.`);

  html += h2('Benefits of Renting Construction Equipment:');
  html += p(
    `Out of so many, the main ones ${a('/benefits-of-renting-construction-equipment/', 'benefits of renting construction equipment')} are discussed. Its lower upfront costs, less maintenance responsibility, access to suitable machinery, and easier project scalability attract every contractor to rely on it, better than purchasing.`,
  );

  html += h3('Lower Upfront Capital Cost:');
  html += p(
    `Buying heavy machinery requires a big amount of capital at the start. In this case, renting is better. You can preserve and use this cash for labour, materials, mobilisation, and other project expenses.`,
  );

  html += h3('No Maintenance or Depreciation Burden:');
  html += p(
    `Rental agreements often give you a huge peace of mind, as they include maintenance support. The other best part? You also avoid carrying depreciation and resale risks. It’s best to always confirm exactly what the supplier covers. The devil is in the details.`,
  );

  html += h3('Access to Better-Maintained Machinery:');
  html += p(
    `Rental companies can provide you with easy access to equipment that may not make financial sense to purchase for a single project. However, it’s compulsory to check the machine’s condition, service history, safety features, and any required inspection records before accepting it.`,
  );

  html += h3('Scalability Across Project Size:');
  html += p(
    `Under the rental option, you can easily add equipment when workloads increase and reduce fleet size when projects finish. This flexibility helps you to pay extra for machines that are gathering dust.`,
  );
  html += img(IMG.midBenefits.src, IMG.midBenefits.alt, {
    width: IMG.midBenefits.width,
    height: IMG.midBenefits.height,
  });

  html += h2('Construction Equipment Rental vs. Purchase:');
  html += p(
    `Getting machines on rental works best if you have short-term project needs. Purchasing a machine makes more sense when the same machine will operate consistently for years.`,
  );

  html += h3('Cost Comparison Over Project Lifecycle:');
  html += table(
    ['Factor', 'Renting', 'Purchasing'],
    [
      ['Upfront investment', 'Low', 'High'],
      ['Maintenance', 'Supplier-supported', 'Owner responsibility'],
      ['Depreciation', 'No direct burden', 'The owner carries the risk'],
      ['Flexibility', 'High', 'Lower'],
      ['Long-term use', 'Can become costly', 'Can offer better value'],
      ['Replacement', 'Easier', 'Requires new investment'],
    ],
  );

  html += h3('When Purchase Makes More Sense');
  html += p(`Buying may be worthwhile when:`);
  html += ul([
    'Equipment has consistently high utilisation.',
    'The project pipeline is long-term.',
    'You have maintenance and storage capacity.',
    'The expected ownership cost is lower than repeated rental costs.',
  ]);

  html += h3('Break-Even Factors to Calculate Before Deciding');
  html += p(`Compare the full cost, not just the headline rate.`);
  html += ul([
    `${b('Rental:')} Rental charges + delivery + operator + fuel + insurance + attachments.`,
    `${b('Purchase:')} Purchase price + finance + maintenance + insurance + storage + depreciation – resale value.`,
  ]);
  html += p(`That comparison gives you a clearer picture of which option makes financial sense.`);

  html += h2('How to Choose the Right Construction Equipment for Rent');
  html += p(
    `Choosing the right equipment requires matching the machine to the job, site, rental period, and support requirements.`,
  );

  html += h3('Match Equipment to Site Conditions and Load Requirements');
  html += p(`Use this checklist:`);
  html += ul([
    'Define the exact task.',
    'Calculate load capacity, lift height, reach, or digging depth.',
    'Assess soil, slopes, access, and ground conditions.',
    'Check machine dimensions and maneuvering space.',
    'Confirm required attachments before booking.',
  ]);
  html += p(
    `An oversized machine can waste money. An undersized one can become a bottleneck.`,
  );

  html += h3('Check Rental Duration Flexibility');
  html += p(`Choose daily, weekly, or monthly rental terms based on the project schedule.`);
  html += p(
    `Longer contracts may reduce the effective daily rate, but check minimum periods, extension charges, and early-return terms before signing.`,
  );

  html += h3('Verify Maintenance, Delivery, and Operator Support Included');
  html += p(`Get the following details in writing:`);
  html += ul([
    'Maintenance responsibility.',
    'Breakdown response time.',
    'Replacement equipment availability.',
    'Delivery and collection charges.',
    'Operator availability.',
    'Fuel arrangements.',
    'Attachment costs.',
  ]);
  html += p(`A low rental rate can lose its shine once hidden costs enter the picture.`);

  html += h3('Confirm Licensing and Insurance Requirements');
  html += p(
    `Operator requirements depend on the equipment and location. In Dubai, the RTA has licensing categories for tractors and light or heavy equipment, while construction sites may also impose competency, safety, and insurance requirements.`,
  );
  html += p(
    `Always verify the requirements for your specific machine and project before mobilisation.`,
  );

  html += h3('Compare Rental Rates Across at Least Three Providers:');
  html += p(
    `Compare at least three like-for-like quotes. It means gathering the data of three providers and analyzing which one matches your project needs. Make sure each quote covers the same machine capacity, rental period, delivery, maintenance, operator arrangements, insurance, and attachments. Start by comparing the total project cost.`,
  );

  html += h2("Construction Equipment Rental in UAE and Dubai: What's Different?");
  html += p(
    `The market for construction equipment for rent in the UAE is broad. Its availability, delivery timelines, and equipment options can vary between emirates and suppliers.`,
  );

  html += h3('Regional Coverage & Delivery Timelines:');
  html += p(
    `Provide suppliers with the exact site location, access details, machine specification, and required delivery date when you are obtaining construction equipment for rent in Dubai. Mostly, used equipment may be available instantly. To get specialised ones, you may require advance planning.`,
  );

  html += h3('Peak Season Availability: Book Attachments Early:');
  html += p(
    `Don’t focus only on the machine that your project needs. Book it early if you require hydraulic breakers, augers, special buckets, lifting attachments, long-reach equipment, and specific crane capacities.`,
  );

  html += h2('Make the Right Rental Decision!');
  html += p(
    `Keep in mind one simple rule when choosing heavy construction equipment for rent: match the machine to the job. Before booking, it’s important to assess the required capacity and check out the site conditions. Closely look into rental period, operator requirements, and total cost.`,
  );
  html += p(
    `The right rental decision you make keeps your work moving. If the decision you made is wrong, it affects your work and, in fact, stops it completely. That’s why measure twice to rent once.`,
  );
  html += p(
    `A way that doesn’t require pouring all your efforts. Want to know what it is? Obtaining machinery from a reliable name like ${a('/', 'SP Heavy Rental')} is the risk-free path. They not only advise you on what machinery works best for your project, but you can also hire their certified operators. Hire today to keep your project moving!`,
  );

  html += h2('FAQs');

  const faqsVisible = [
    {
      q: 'What’s the average cost of renting heavy construction equipment in the UAE?',
      a: 'Rental costs change based on the equipment type, size, rental duration, operator requirements, delivery location, and attachments. The best approach is to request current quotes from many suppliers. Don’t rely on a fixed market figure.',
    },
    {
      q: "What's the minimum rental period for construction equipment in Dubai?",
      a: 'Minimum rental periods vary from one supplier to another. You can obtain some machines for daily use. Specialised equipment may require weekly or monthly commitments.',
    },
    {
      q: 'Is a special license needed to operate rented heavy equipment in the UAE?',
      a: 'Requirements depend on the equipment you need and the location you’re operating from. Dubai has RTA licensing categories for tractors and light or heavy equipment.',
    },
    {
      q: 'Is it cheaper to rent or buy construction equipment for a lengthy project?',
      a: 'Buying is economically the better decision when equipment operates consistently over a long period. However, renting offers better flexibility for shorter projects.',
    },
    {
      q: "What's usually included in a construction equipment rental agreement?",
      a: 'What’s included and what’s not varies by supplier. Beforehand, you must confirm it includes maintenance, breakdown support, delivery, and other areas before signing.',
    },
    {
      q: 'How fast can rented equipment be delivered to a site in Dubai or Abu Dhabi?',
      a: 'Delivery depends on many factors, including:',
      list: [
        'Equipment availability',
        'Fleet location',
        'Transport arrangements',
        'Site access.',
      ],
    },
    {
      q: 'What happens if rented equipment breaks down mid-project?',
      a: 'Clarify these terms before accepting the machine:',
      list: [
        'Who handles repairs',
        'What’s the expected response time',
        'Replacement equipment, and whether',
        'Rental charges continue during downtime.',
      ],
    },
  ];

  for (const faq of faqsVisible) {
    html += h3(faq.q);
    if (faq.a) html += p(faq.a);
    if (faq.list) html += ul(faq.list);
  }

  // FAQ schema text from DOCX (including polished answers for delivery / breakdown)
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What’s the average cost of renting heavy construction equipment in the UAE?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Rental costs change based on the equipment type, size, rental duration, operator requirements, delivery location, and attachments. The best approach is to request current quotes from many suppliers. Don’t rely on a fixed market figure.',
        },
      },
      {
        '@type': 'Question',
        name: "What's the minimum rental period for construction equipment in Dubai?",
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Minimum rental periods vary from one supplier to another. You can obtain some machines for daily use. Specialised equipment may require weekly or monthly commitments.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is a special license needed to operate rented heavy equipment in the UAE?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Requirements depend on the equipment you need and the location you’re operating from. Dubai has RTA licensing categories for tractors and light or heavy equipment.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is it cheaper to rent or buy construction equipment for a lengthy project?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Buying is economically the better decision when equipment operates consistently over a long period. However, renting offers better flexibility for shorter projects.',
        },
      },
      {
        '@type': 'Question',
        name: "What's usually included in a construction equipment rental agreement?",
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'What’s included and what’s not varies by supplier. Beforehand, you must confirm it includes maintenance, breakdown support, delivery, and other areas before signing.',
        },
      },
      {
        '@type': 'Question',
        name: 'How fast can rented equipment be delivered to a site in Dubai or Abu Dhabi?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Delivery depends on many factors, including equipment availability, fleet location, transport arrangements, and site access.',
        },
      },
      {
        '@type': 'Question',
        name: 'What happens if rented equipment breaks down mid-project?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Clarify these terms before accepting the machine: who handles repairs, the expected response time, whether replacement equipment is provided, and whether rental charges continue during downtime.',
        },
      },
    ],
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
        width: String(IMG.featured.width),
        height: String(IMG.featured.height),
        caption: FOCUS,
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
        '@id': `https://spheavyrental.ae/author/${AUTHOR.slug}/`,
        name: AUTHOR.name,
        url: `https://spheavyrental.ae/author/${AUTHOR.slug}/`,
        image: {
          '@type': 'ImageObject',
          '@id': 'https://spheavyrental.ae/wp-content/uploads/authors/calvin-misquith.webp',
          url: 'https://spheavyrental.ae/wp-content/uploads/authors/calvin-misquith.webp',
          caption: AUTHOR.name,
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
          '@id': `https://spheavyrental.ae/author/${AUTHOR.slug}/`,
          name: AUTHOR.name,
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
    'hentry category-construction-equipment tag-heavy-construction-equipment-for-rent tag-construction-equipment-for-rent',
  );

  const featuredBeforeH1 = `<div class="elementor-element elementor-element-sp-featured elementor-widget elementor-widget-image" data-id="sp-featured" data-element_type="widget" data-widget_type="image.default">
				<div class="elementor-widget-container">
					<img fetchpriority="high" decoding="async" class="attachment-large size-large aligncenter" width="${IMG.featured.width}" height="${IMG.featured.height}" src="${IMG.featured.src}" alt="${IMG.featured.alt}" loading="eager" />
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
  tpl = tpl.replace(/<time>[^<]*<\/time>/, '<time>September 14, 2026</time>');
  tpl = tpl.replace(/href="\/\d{4}\/\d{2}\/\d{2}\/"/, 'href="/2026/09/14/"');
  return tpl.trim();
}

function ensureTag(tags, { id, name, slug }) {
  let tag = tags.find((t) => t.slug === slug);
  if (!tag) {
    tag = {
      id,
      name,
      slug,
      path: `/tag/${slug}/`,
      description: '',
      count: 1,
    };
    tags.push(tag);
  }
  return tag;
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
  const maxTagId = Math.max(...tags.map((t) => t.id), 0);
  const tag1 = ensureTag(tags, {
    id: maxTagId + 1,
    name: 'heavy construction equipment for rent',
    slug: 'heavy-construction-equipment-for-rent',
  });
  const tag2 = ensureTag(tags, {
    id: Math.max(...tags.map((t) => t.id), tag1.id) + 1,
    name: 'construction equipment for rent',
    slug: 'construction-equipment-for-rent',
  });
  fs.writeFileSync(tagsPath, `${JSON.stringify(tags, null, 2)}\n`);

  const categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'));
  const constructionCat = categories.find((c) => c.id === CATEGORY_ID);

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
    categories: [CATEGORY_ID],
    tags: [tag1.id, tag2.id],
    author: AUTHOR.id,
    authorName: AUTHOR.name,
    authorSlug: AUTHOR.slug,
    featuredImage: IMG.featured.src,
    featuredImageAlt: IMG.featured.alt,
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
  const existing = posts.findIndex((row) => row.slug === SLUG || row.id === POST_ID);
  if (existing >= 0) posts.splice(existing, 1);
  posts.unshift(post);
  fs.writeFileSync(postsPath, `${JSON.stringify(posts, null, 2)}\n`);

  if (constructionCat) {
    constructionCat.count = posts.filter(
      (row) =>
        row.status !== 'draft' &&
        row.status !== 'trash' &&
        Array.isArray(row.categories) &&
        row.categories.includes(CATEGORY_ID),
    ).length;
  }
  fs.writeFileSync(categoriesPath, `${JSON.stringify(categories, null, 2)}\n`);

  for (const tag of [tag1, tag2]) {
    tag.count = posts.filter(
      (row) =>
        row.status !== 'draft' &&
        row.status !== 'trash' &&
        Array.isArray(row.tags) &&
        row.tags.includes(tag.id),
    ).length;
  }
  fs.writeFileSync(tagsPath, `${JSON.stringify(tags, null, 2)}\n`);

  if (fs.existsSync(sitemapPath)) {
    const sm = JSON.parse(fs.readFileSync(sitemapPath, 'utf8'));
    if (Array.isArray(sm.posts)) {
      sm.posts = sm.posts.filter((x) => x.path !== PATH);
      sm.posts.unshift({ path: PATH, type: 'post', lastmod: `${DATE}.000Z` });
      fs.writeFileSync(sitemapPath, `${JSON.stringify(sm, null, 2)}\n`);
    }
  }

  console.log(`Published ${PATH} (id ${POST_ID}) author=${AUTHOR.slug}`);
}

main();
