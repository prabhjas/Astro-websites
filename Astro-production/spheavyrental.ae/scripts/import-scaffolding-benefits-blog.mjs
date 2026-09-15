/**
 * Import "Scaffolding Benefits..." blog from DOCX brief.
 * Usage: node scripts/import-scaffolding-benefits-blog.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const mediaDir = path.join(root, 'local/_docx-extract/word/media');
const uploadsDir = path.join(root, 'public/wp-content/uploads/2026/09');
const postsPath = path.join(root, 'src/data/posts.json');
const tagsPath = path.join(root, 'src/data/tags.json');
const categoriesPath = path.join(root, 'src/data/categories.json');
const sitemapPath = path.join(root, 'src/data/sitemap-urls.json');
const templatePath = path.join(root, 'src/data/single-post-template.html');

const SLUG = 'scaffolding-benefits';
const PATH = `/${SLUG}/`;
const POST_ID = 1808;
const DATE = '2026-09-09T10:00:00';
const MODIFIED = '2026-09-09T10:00:00';
const TITLE = "Scaffolding Benefits: Why It's Still the Backbone of Safe Construction";
const META_TITLE = 'Scaffolding Benefits Explained: Types, Costs & Rentals';
const META_DESC =
  'Discover the real benefits of scaffolding, the main types available, 2026 rental costs, and how to choose a reliable rental company.';
const FOCUS = 'scaffolding benefits';
const CATEGORY_ID = 42; // Scaffolding
const AUTHOR = { id: 1, name: 'Calvin Misquith', slug: 'calvin-misquith' };

const IMG = {
  featured: {
    file: 'scaffolding-benefits.jpg',
    src: '/wp-content/uploads/2026/09/scaffolding-benefits.jpg',
    alt: 'scaffolding benefits',
    from: path.join(mediaDir, 'image1.jpg'),
  },
  benefits: {
    file: 'benefits-of-scaffolding.jpg',
    src: '/wp-content/uploads/2026/09/benefits-of-scaffolding.jpg',
    alt: 'benefits of scaffolding',
    from: path.join(mediaDir, 'image2.jpg'),
  },
  advantages: {
    file: 'advantages-of-scaffolding.jpg',
    src: '/wp-content/uploads/2026/09/advantages-of-scaffolding.jpg',
    alt: 'advantages of scaffolding',
    from: path.join(mediaDir, 'image3.jpg'),
  },
  cta: {
    file: 'scaffolding-benefits-cta.jpg',
    src: '/wp-content/uploads/2026/09/scaffolding-benefits-cta.jpg',
    alt: 'scaffolding benefits',
    from: path.join(mediaDir, 'image4.jpg'),
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
function img(src, alt) {
  return `<p><span style="color: #ffffff;"><img decoding="async" class="aligncenter" src="${src}" alt="${alt}" loading="lazy" /></span></p>\n`;
}
function linkedImg(href, src, alt) {
  return `<p><span style="color: #ffffff;"><a href="${href}"><img decoding="async" class="aligncenter" src="${src}" alt="${alt}" loading="lazy" /></a></span></p>\n`;
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
    `One after another, construction sites are always busy with new projects going on. Deadlines are tightened, buildings grow taller, and workers face greater risks every day. Yet one piece of equipment keeps projects moving safely.`,
  );
  html += p(`It’s the scaffold!`);
  html += p(
    `The ${b('benefits of scaffolding')} go far beyond giving workers somewhere to stand. Modern scaffolding systems are introduced to improve safety standards. They also fuel productivity and shrink project delays. Contractors find them helpful in complying with workplace safety regulations.`,
  );
  html += p(
    `From constructing a skyscraper or restoring a heritage building, whatever is in your mind, the right scaffold system creates a safer and more productive workspace.`,
  );
  html += p(
    `But what does the right scaffolding look like? Tighter safety inspections and higher penalties for unsafe practices make it necessary to invest in quality scaffolding. In fact, it has become a business engine that keeps moving. Don’t just consider it a safety precaution.`,
  );
  html += p(`Let's dive in to discover why scaffolding is construction's smartest investment.`);

  html += h2('What Is Scaffolding?');
  html += p(
    `It is a temporary structure that provides safe access for workers and materials. Used to perform tasks at height. Beneficial for efficient operations. Using it reduces fall risks and supports multiple trades. Different from ladders, that gives a single climbing point. Scaffolding creates an entire working platform. Workers can move safely with it while carrying equipment.`,
  );
  html += p(
    `Scaffolding is made from steel, aluminum, or modular components. Workers and materials get support from it during any ongoing work.`,
  );
  html += p(`Best used in:`);
  html += ul([
    'Construction',
    'Maintenance',
    'Inspections',
    'Renovations',
    'Painting, and',
    'Repairs.',
  ]);
  html += linkedImg('/scaffold-rental/', IMG.benefits.src, IMG.benefits.alt);

  html += h2('Where Is It Used?');
  html += p(
    `Not only construction, but scaffolding can be used in maintenance, events, facade work, and others. The advantages of scaffolding are not limited to traditional construction.`,
  );
  html += table(
    ['Industry', 'Typical Use'],
    [
      ['Construction', 'New buildings, structural work'],
      ['Building Maintenance', 'Window cleaning, repairs'],
      ['Façade Restoration', 'Cladding, painting, waterproofing'],
      ['Industrial Plants', 'Shutdown maintenance'],
      ['Shipyards', 'Vessel maintenance'],
      ['Oil & Gas', 'Refinery access systems'],
      ['Events', 'Stages, lighting towers, grandstands'],
    ],
  );
  html += p(
    `From restoration of historic landmarks to assembling concert stages, both need scaffolding. It provides the secure access that every project demands.`,
  );

  html += h2('Top Scaffolding Benefits:');
  html += p(
    `A properly designed scaffold is not that hard to choose. It’s always the one that makes it easy for your workers to perform complex tasks with confidence. They experience downtime reduction caused by unsafe working conditions.`,
  );
  html += p(`Let's look at why contractors choose scaffolding.`);

  html += h3('Improved Worker Safety:');
  html += p(
    `Every successful project begins with one priority: everyone goes home safely. Ladders are beneficial for providing only one point of contact. Scaffolding, by contrast, offers wide working platforms, guardrails, toe boards, stable footing, and access points.`,
  );
  html += p(
    `Your workers can use it to carry tools, move freely, and complete detailed tasks. The best part? They don’t require constant balancing.`,
  );

  html += h3('Higher Productivity on Site:');
  html += p(
    `Time is money; it’s moving on from second to second. Every unnecessary climb up and down a ladder eats valuable working hours of your workers.`,
  );
  html += p(
    `With scaffolding, your teams can keep tools nearby, work continuously, cover larger work areas, and reduce repositioning time. Frees your workers from moving equipment every few minutes. They can stay focused on completing the job.`,
  );

  html += h3('Access to Hard-to-Reach Areas:');
  html += p(
    `Not every project happens at ground level. Modern buildings include glass façades, curved architecture, high ceilings, and bridge structures. To reach these places, you require safe access that ladders can’t provide.`,
  );

  html += h3('Long Duration Cost Efficiency:');
  html += p(
    `Many project managers focus only on rental costs. Maybe your company faces a similar situation. The real financial picture tells a different story. Scaffolding, if used properly, shrinks worker injuries, project delays, machine downtime, rework caused by unstable access, and insurance claims.`,
  );

  html += h3('Supports Multiple Trades Working Together:');
  html += p(
    `Construction rarely involves one contractor at a time. Electricians, painters, HVAC installers, plumbers, façade specialists, and inspectors work together. Only scaffolding can create shared working platforms. Multiple teams can safely operate together without interfering with each other's workflow.`,
  );

  html += h3('Regulatory Compliance: OSHA / Local Safety Codes');
  html += p(
    `Safety regulations are reaching new heights. OSHA requires scaffolds to meet specific design, inspection, and load capacity requirements. In any case, failure to comply can result in huge penalties. Guilty of repeated or willful violations carry higher fines.`,
  );
  html += p(
    `Avoiding penalties is another story; compliant scaffolding demonstrates a contractor's commitment to worker safety. You’re heading towards improving your client confidence and protecting your business reputation alike!`,
  );
  html += img(IMG.advantages.src, IMG.advantages.alt);

  html += h2('Scaffolding Services Types:');
  html += p(
    `There are various ${a('/types-of-scaffolding/', 'types of scaffolding')} available in the UAE.`,
  );

  html += h3('Supported Scaffolding');
  html += p(
    `Around the world, it’s the most commonly used system. It stands directly on the ground using steel frames, braces, and platforms.`,
  );
  html += p(
    `A reasonable choice for residential construction, commercial buildings, brickwork, exterior painting, and general maintenance. Popular for its unmatched strength and affordability. Its versatility in nature makes it the industry's standard solution.`,
  );

  html += h3('Suspended/Swing-Stage Scaffolding');
  html += p(
    `If your work involves working hundreds of feet above ground, building scaffolds from the ground up isn't always practical. There’s an alternative: you can use suspended scaffolding instead. Powered platforms hang from the roof using cables; using them, workers can move vertically along the building façade.`,
  );
  html += p(
    `Ideal applications are high-rise window cleaning, curtain wall installation, exterior painting, glass replacement, and façade inspections.`,
  );

  html += h3('Rolling/Mobile Scaffolding:');
  html += p(
    `A machine that walks around freely can save time. ${a('/guide-to-mobile-scaffolding/', 'Mobile scaffolds')} feature lockable caster wheels. Crews can leverage this feature to move the entire structure without dismantling it.`,
  );
  html += p(
    `It could be best used in indoor maintenance, warehouses, schools, shopping centers, and airports. Works best on smooth surfaces where frequent repositioning is required.`,
  );

  html += h3('System/Modular Scaffolding:');
  html += p(
    `Architectural projects that are complex demand flexible solutions. To meet this demand, system scaffolding uses pre-engineered modular components that assemble instantly around irregular structures.`,
  );
  html += p(
    `A popular pick for industrial facilities, stadiums, bridges, refineries, and large infrastructure projects.`,
  );
  html += p(`Contractors can use its adaptability to create safe access around:`);
  html += ul(['Curves', 'Tanks', 'Pipe racks, and', 'Difficult structural layouts.']);

  html += h2('How to Make the Right Choice for Your Project?');
  html += p(
    `Many key factors behind that make or break your selection decision. Some of which are project height, building design, worker load requirements, duration of work, ground conditions, budget, and safety regulations.`,
  );
  html += p(
    `A simple residential renovation only requires supported scaffolding. A high-rise façade restoration could demand suspended platforms with advanced fall-protection systems. The right choice decreases the chances of incidents. It also keeps your entire project moving without any disruption.`,
  );

  html += h2('Cost of Scaffolding Services');
  html += p(
    `Many factors influence the overall costs. The machine type, project height, duration, and others are some factors that drive the pricing.`,
  );

  html += h3('Cost by Scaffold Type');
  html += table(
    ['Scaffold Type', 'Average Daily Rental in Dollars'],
    [
      ['Supported Scaffolding', 'Eight to twenty-five dollars per day'],
      ['Aerial Lift', 'Thirty to eighty dollars per day'],
      ['Suspended Scaffolding', 'Twenty to sixty dollars per day'],
    ],
  );
  html += p(`The prices are just a market estimate and may slightly vary.`);

  html += h4('Basic Frame Scaffolding:');
  html += p(
    `It is a suitable choice for residential painting and repairs. Besides daily rentals, monthly rates offer better value.`,
  );

  html += h4('Full Tower Systems:');
  html += p(`These systems are designed for multi-story projects.`);

  html += h4('Suspended Scaffolding:');
  html += p(
    `Quite best for high-rise work. For weekly rentals, expect to spend twenty to sixty dollars per day. The pricing excludes installation and operator fees.`,
  );

  html += h3('What Drives the Price Up or Down');

  html += h4('Project Height & Size');
  html += p(
    `The higher the buildings, the more additional components, safety equipment, and engineering are required.`,
  );

  html += h4('Location: Urban vs. Rural');
  html += p(`Urban projects cost more due to:`);
  html += ul(['Transport', 'Permits', 'Labour demand it involves.']);

  html += h4('Rental Duration:');
  html += p(
    `Rentals for long durations reduce the daily cost compared to hires for short durations.`,
  );

  html += h4('Labour and Assembly Fees');
  html += p(
    `Professional erection, dismantling, and inspections are charged separately. However, they are essential for safety compliance.`,
  );

  html += h2('Scaffolding vs. Ladders & Aerial Lifts');
  html += p(
    `For extended work and multiple workers, your ideal pick should be scaffolding. Ladders and aerial lifts suit shorter or highly mobile tasks.`,
  );

  html += h3('When Scaffolding Is the Better Choice');
  html += p(
    `Scaffolding works well when projects last many days or weeks. It makes sense when multiple workers need access at the same time, heavy materials are required, and stable work platforms improve efficiency.`,
  );

  html += h3('When an Alternative Makes More Sense');
  html += p(
    `Ladders or aerial lifts are better for instant inspections. You can utilize them in minor maintenance jobs, low-height repairs, and tasks requiring frequent movement between locations.`,
  );

  html += h2('Top Scaffolding Rental Companies to Know');
  html += p(
    `You can rely on a provider if it offers certified equipment, trained installers, and ongoing safety support. Competitive pricing is a plus!`,
  );

  html += h3('What to Check Before You Hire');
  html += p(
    `A rental agreement could be signed later. Before signing, confirm if a provider offers insurance coverage, OSHA/local safety compliance, equipment inspection records, an installation team, and scaffold components.`,
  );

  html += h3('National & Regional Providers Worth Comparing');
  html += p(
    `Look for established rental companies with years of safety records, modern modular systems, flexible rental terms, throughout-the-day technical support, and positive customer reviews. Compare three suppliers, then decide.`,
  );
  html += linkedImg('/contact-us/', IMG.cta.src, IMG.cta.alt);

  html += h2('Final Takeaway');
  html += p(
    `Construction success isn't measured by how fast a building rises. Successful project completion is measured by how safely everyone gets the job done. The benefits of scaffolding extend beyond worker protection to improved productivity. Properly designed scaffolding lowers your project costs and maintains stronger compliance. Investing in the right scaffold system is a safety decision that assures the safety of everyone involved. You can also call it a smarter business decision that fuels your productivity to new heights.`,
  );
  html += p(
    `${a('/', 'SP Heavy Rental')} has quality scaffolding suitable for your project demands. Get in touch with their team and obtain budget-friendly quotes.`,
  );

  html += h2('FAQs');

  const faqsVisible = [
    {
      q: 'What are the main benefits of scaffolding?',
      a: 'Your worker safety has been improved a lot; you get better productivity with easier access to elevated areas. Not only this, but cost savings are guaranteed, and you better maintain compliance with workplace safety regulations.',
    },
    {
      q: 'What is scaffolding used for?',
      a: 'It supports construction, maintenance, façade restoration, industrial work, painting, inspections, and event staging. Useful in places where safe elevated access is required.',
    },
    {
      q: 'How much does scaffolding cost to rent?',
      a: 'Supported scaffolding starts around eight dollars to twenty-five dollars per day. Suspended systems can exceed twenty to sixty dollars per day. The rental prices are measured through project requirements.',
    },
    {
      q: "What's the difference between scaffolding and a ladder?",
      aHtml:
        `${b('Scaffolding:')}<br />It provides a stable working platform for multiple workers and tools.<br /><br />${b('Ladders:')}<br />They are designed for short-duration tasks involving one worker.`,
    },
    {
      q: 'How do I choose a scaffolding rental company?',
      a: 'Compare providers and check each of them for:',
      list: [
        'Certified equipment',
        'Experienced installers',
        'Insurance coverage',
        'Transparent pricing',
        'A proven safety record',
      ],
    },
  ];

  for (const faq of faqsVisible) {
    html += h3(faq.q);
    if (faq.aHtml) html += pb(faq.aHtml);
    else if (faq.a) html += p(faq.a);
    if (faq.list) html += ul(faq.list);
  }

  // FAQ schema text from DOCX (polished answers)
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What are the main benefits of scaffolding?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Scaffolding improves worker safety, increases productivity by providing easier access to elevated areas, helps reduce costs, and supports compliance with workplace safety regulations.',
        },
      },
      {
        '@type': 'Question',
        name: 'What is scaffolding used for?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Scaffolding is used for construction, maintenance, façade restoration, industrial work, painting, inspections, and event staging where safe elevated access is required.',
        },
      },
      {
        '@type': 'Question',
        name: 'How much does scaffolding cost to rent?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Supported scaffolding starts around eight dollars to twenty-five dollars per day, while suspended systems can exceed twenty to sixty dollars per day. Rental prices vary depending on the project requirements.',
        },
      },
      {
        '@type': 'Question',
        name: "What's the difference between scaffolding and a ladder?",
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Scaffolding provides a stable working platform for multiple workers and tools, while ladders are generally designed for short-duration tasks involving one worker.',
        },
      },
      {
        '@type': 'Question',
        name: 'How do I choose a scaffolding rental company?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'When choosing a scaffolding rental company, compare providers based on certified equipment, experienced installers, insurance coverage, transparent pricing, and a proven safety record.',
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
        width: '1200',
        height: '675',
        caption: FOCUS,
        inLanguage: 'en-US',
      },
      {
        '@type': 'WebPage',
        '@id': `https://spheavyrental.ae${PATH}#webpage`,
        url: `https://spheavyrental.ae${PATH}`,
        name: META_TITLE,
        datePublished: `${DATE}+04:00`,
        dateModified: `${DATE}+04:00`,
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
        dateModified: `${DATE}+04:00`,
        articleSection: 'Scaffolding',
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
    'hentry category-scaffolding tag-scaffolding-benefits tag-benefits-of-scaffolding',
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
  tpl = tpl.replace(/<time>[^<]*<\/time>/, '<time>September 9, 2026</time>');
  tpl = tpl.replace(/href="\/\d{4}\/\d{2}\/\d{2}\/"/, 'href="/2026/09/09/"');
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
  } else {
    // recount later from posts if re-run; avoid double-count on re-import
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
    name: 'scaffolding benefits',
    slug: 'scaffolding-benefits',
  });
  const tag2 = ensureTag(tags, {
    id: Math.max(...tags.map((t) => t.id), tag1.id) + 1,
    name: 'benefits of scaffolding',
    slug: 'benefits-of-scaffolding',
  });

  // Recount tag counts from posts after upsert (done below after write)
  fs.writeFileSync(tagsPath, `${JSON.stringify(tags, null, 2)}\n`);

  const categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'));
  const scaffoldCat = categories.find((c) => c.id === CATEGORY_ID);

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

  // Recount category + tag counts from published posts
  if (scaffoldCat) {
    scaffoldCat.count = posts.filter(
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
