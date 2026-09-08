/**
 * Import AC Maintenance Dubai blog content from DOCX brief.
 * Usage: node scripts/import-ac-maintenance-dubai-blog.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { processContentHeadings } from '../src/lib/blog.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const mediaDir = path.join(__dirname, '_tmp-ac-docx/word/media');
const uploadsDir = path.join(root, 'public/wp-content/uploads/2026/09');
const distUploadsDir = path.join(root, 'dist/client/wp-content/uploads/2026/09');
const postPath = path.join(root, 'src/content/blog/ac-maintenance-dubai.json');
const legacyPath = path.join(root, 'src/legacy/ac-maintenance-dubai.cleaned.html');

const SLUG = 'ac-maintenance-dubai';
const TITLE = 'AC Maintenance in Dubai: Costs, Checklist & Warning Signs';
const META_TITLE = 'AC Maintenance in Dubai: Costs, Checklist & Warning Signs';
const META_DESC =
  'Keep your home cool and lower DEWA bills. Learn typical AC maintenance costs in Dubai, essential seasonal checklists, warning signs, and AMC options.';
const MODIFIED = new Date().toISOString();

const IMG = {
  featured: {
    file: 'ac-maintenance-dubai-featured.jpg',
    src: '/wp-content/uploads/2026/09/ac-maintenance-dubai-featured.jpg',
    alt: 'AC Maintenance in Dubai',
    from: path.join(mediaDir, 'image3.jpg'),
  },
  afterChecklist: {
    file: 'ac-maintenance-dubai-after-checklist.jpg',
    src: '/wp-content/uploads/2026/09/ac-maintenance-dubai-after-checklist.jpg',
    alt: 'AC Maintenance in Dubai',
    from: path.join(mediaDir, 'image2.jpg'),
  },
  contact: {
    file: 'ac-maintenance-dubai-contact.jpg',
    src: '/wp-content/uploads/2026/09/ac-maintenance-dubai-contact.jpg',
    alt: 'AC Maintenance Dubai',
    from: path.join(mediaDir, 'image1.jpg'),
  },
};

function p(html) {
  return `<p><span style="font-weight: 400;">${html}</span></p>\n`;
}
function pb(html) {
  return `<p><span style="font-weight: 400;">${html}</span></p>\n`;
}
function h2(t) {
  return `<h2><b>${t}</b></h2>\n`;
}
function h3(t) {
  return `<h3><b>${t}</b></h3>\n`;
}
function h4(t) {
  return `<h4><b>${t}</b></h4>\n`;
}
function a(href, text) {
  return `<a href="${href}">${text}</a>`;
}
function b(text) {
  return `<b>${text}</b>`;
}
function img(src, alt) {
  return `<p><img decoding="async" class="aligncenter" src="${src}" alt="${alt}" loading="lazy" /></p>\n`;
}
function linkedImg(href, src, alt) {
  return `<p><a href="${href}"><img decoding="async" class="aligncenter" src="${src}" alt="${alt}" loading="lazy" /></a></p>\n`;
}
function ul(items) {
  return `<ul>\n${items.map((item) => `<li style="font-weight: 400;" aria-level="1"><span style="font-weight: 400;">${item}</span></li>`).join('\n')}\n</ul>\n`;
}

function buildContent() {
  let html = '';

  html += p(
    'Your AC works harder in Dubai than almost anywhere else. As a result, most homes should schedule professional servicing at least twice a year, with additional filter cleaning during peak summer. Regular maintenance keeps your home cool and lowers DEWA bills. You experience improved indoor air quality and are prevented from expensive breakdowns when temperatures soar.',
  );
  html += p(
    'Think about the hottest day in July. Your AC suddenly stops cooling, and within minutes your home feels uncomfortable. Unfortunately, many homeowners only think about maintenance after the system fails. A little preventive care today can save thousands of dirhams in repairs tomorrow.',
  );

  html += h2('Why AC Maintenance Should Never Be Overlooked in Dubai\'s Climate');
  html += p(
    'Dubai\'s climate pushes air conditioning systems to their limits. Long summers, frequent dust storms, and high humidity mean your AC rarely gets a break.',
  );

  html += h3('How Heat &amp; Dust Affect AC Performance');
  html += p(
    'Dust settles on filters and outdoor units. As airflow becomes restricted, your AC works longer to cool the same space. That extra effort increases your AC\'s electricity consumption. It places more strain on components and shortens the system\'s lifespan.',
  );
  html += p('The International Energy Agency estimates that:');
  html += p('"Space cooling accounts for nearly twenty percent of electricity used in buildings worldwide."');
  html += p(
    `Therefore, ${a('/ac-maintenance/', 'AC maintenance')} should be taken as a priority to spend peaceful days and nights in Dubai's hot climate.`,
  );

  html += h3('What Happens If You Skip Maintenance');
  html += p(
    'Most homeowners think that delaying maintenance saves some money. But ignoring routine servicing rarely saves you money. Sometimes, those small issues turn quickly into expensive repairs when you, by choice, miss them.',
  );
  html += p(
    'The consequences? Your AC starts reducing its cooling performance, exposing you to higher DEWA bills, and likely facing poor indoor air quality, water leaks, and frozen evaporator coils. In the worst case, the compressor fails.',
  );
  html += p('Preventive servicing identifies these issues before they interrupt your comfort.');

  html += h2('AC Maintenance Checklist for Dubai Homes:');
  html += p(
    'A simple maintenance routine keeps your cooling system running without stopping for a minute throughout the year.',
  );

  html += h3('Monthly Tasks:');
  html += p(
    `Between professional visits, homeowners can handle a few basic maintenance tasks. Start with regularly cleaning or replacing air filters. Pulling out dust around indoor vents makes your system work perfectly. Keep your outdoor condenser units free from debris. Also, check for unusual noises or water leaks. Make sure the furniture beside your system doesn't block airflow.`,
  );
  html += p(
    'These small habits improve your AC\'s cooling efficiency. You can reduce unnecessary strain on the system.',
  );

  html += h3('Seasonal Servicing:');
  html += p('Dubai\'s weather makes seasonal servicing essential, not optional.');
  html += p(`${b('Pre-summer:')} Inspect the system before temperatures rise. Make sure to clean its coils and test refrigerant levels. Ensure all components work perfectly.`);
  html += p(`${b('Mid-summer:')} Perform an instant inspection to catch airflow issues. Check if your system has clogged filters or drainage problems caused by heavy usage.`);
  html += p(`${b('Post-summer:')} Remove accumulated dust and inspect wear and tear. Prepare your system for lighter seasonal use.`);

  html += h3('Annual Professional Checklist Items:');
  html += p(
    'Professional servicing isn\'t limited to basic cleaning, but it goes beyond. Licensed technicians inspect your AC\'s every major component to enhance its performance and diminish breakdown risks.',
  );

  html += h4('Filter &amp; Coil Inspection:');
  html += p(
    'A system\'s dirty filters reduce its cooling capacity. Experienced cleaning services are hired to restore performance. They make fixes to boost indoor air quality.',
  );

  html += h4('Refrigerant &amp; Drainage Check:');
  html += p(
    'Technicians closely inspect refrigerant pressure. They identify leaks and clean drain lines. As a result, water damage has been prevented. You feel your system\'s cooling has been maintained.',
  );

  html += h4('Electrical &amp; Thermostat Check:');
  html += p(
    'Electrical connections, capacitors, wiring, and thermostat calibration are tested. The process is carried out to make operation safe and consistent temperature control.',
  );
  html += img(IMG.afterChecklist.src, IMG.afterChecklist.alt);

  html += h2('DIY AC Care vs. Professional Servicing:');
  html += p(
    'Not every maintenance task requires professional help. But not every repair should become a weekend project either.',
  );

  html += h3('What You Can Safely Do Yourself');
  html += p(
    'Being a homeowner, you can safely do plenty of tasks without any professional support. You can easily replace or clean your system\'s filters. Keeping vents unobstructed and removing dust around the outdoor unit doesn\'t require anyone\'s help. You can regularly monitor thermostat settings and fix it as per your room\'s needs. Watch for unusual sounds or leaks and quickly involve professionals if you find them abnormal.',
  );
  html += p('These are the simple checks that maintain airflow between scheduled servicing.');

  html += h3('What Requires a Licensed Technician');
  html += p(
    'Don\'t take everything on your head and leave technical work to qualified professionals only. They can better take care of refrigerant handling. Best for electrical repairs, compressor servicing, and condenser cleaning. Any doubt of leakage? Call them instantly. They can easily detect a refrigerant leak and replace your capacitor. These tasks require certified expertise. So call them immediately without trying it yourself.',
  );

  html += h3('DIY Reliance Risk:');
  html += p(
    'Never fix difficult AC problems without training. Doing so only creates bigger issues. Incorrect refrigerant handling and damaged electrical components by an inexperienced person won\'t restore your system\'s efficiency. Resulting in voided manufacturer warranties and increased repair costs. Expert servicing protects your investment and your safety.',
  );

  html += h2('AC Repair Warning Signs You Shouldn\'t Ignore:');
  html += p(
    'Every AC gives warning signs before it stops working. Now, what to do? You should act early. It can save you from an expensive repair later.',
  );

  html += h3('Warm Airflow:');
  html += p(
    'Clogged filters may be the cause if your AC never reaches the set temperature. Don\'t ignore it! Reduced cooling signals a problem. It\'s getting worse with each passing minute.',
  );

  html += h3('Unusual Noise or Water Leakage:');
  html += p(
    'Grinding sounds can indicate failing components. Musty odors may point to mold in the system. Similarly, water leaks result from blocked drain lines or frozen coils. These issues should be inspected promptly to prevent your system from further damage.',
  );

  html += h3('Rising DEWA Bills Without Usage Change:');
  html += p(
    'Does your electricity bill keep climbing, and have your cooling habits not changed? That shows something is cooking behind. Might be that your AC could be losing its productivity. A neglected system works harder. It also consumes more energy while running.',
  );

  html += h2('AC Maintenance Costs in Dubai:');
  html += p(
    'The maintenance prices fluctuate and are not the same. Doing regular maintenance is far more affordable. You have to spend much less than a full failed compressor replacement.',
  );

  html += h3('Maintenance Price in Dubai:');
  html += p('From basic ac service to deep cleaning, maintaining an AC costs you this much.');
  html += `<table>
<tbody>
<tr>
<td><b>Service</b></td>
<td><b>Cost in Dirhams</b></td>
</tr>
<tr>
<td><span style="font-weight: 400;">Basic AC Service</span></td>
<td><span style="font-weight: 400;">One hundred fifty to three hundred</span></td>
</tr>
<tr>
<td><span style="font-weight: 400;">Deep Cleaning Service</span></td>
<td><span style="font-weight: 400;">Three hundred to six hundred</span></td>
</tr>
<tr>
<td><span style="font-weight: 400;">Full HVAC Maintenance</span></td>
<td><span style="font-weight: 400;">Five hundred to twelve hundred</span></td>
</tr>
<tr>
<td><span style="font-weight: 400;">AC Maintenance Annually</span></td>
<td><span style="font-weight: 400;">Twelve hundred to thirty five hundred</span></td>
</tr>
</tbody>
</table>\n`;

  html += h3('Air Conditioner Repair Price:');
  html += p('Repairing your system involves the below cost:');
  html += `<table>
<tbody>
<tr>
<td><b>Property Type</b></td>
<td><b>Annual Cost in Dirhams</b></td>
</tr>
<tr>
<td><span style="font-weight: 400;">Compressor Repair</span></td>
<td><span style="font-weight: 400;">Over eight hundred</span></td>
</tr>
<tr>
<td><span style="font-weight: 400;">Refrigerant refill</span></td>
<td><span style="font-weight: 400;">One hundred fifty to four hundred</span></td>
</tr>
</tbody>
</table>\n`;

  html += h3('What Affects the Price?');
  html += p('Many factors behind that directly influence your maintenance cost.');
  html += p('Some of which are');
  html += ul([
    'Number of AC units',
    'Property size',
    'Split or ducted system',
    'Service frequency',
    'System age and condition',
    'Whether repairs or spare parts are required',
  ]);

  html += h2('AC Maintenance Contract vs. One-Time Service:');
  html += p(
    'Thinking about which one is better? Both options have their advantages. But the right choice depends on how you use your property.',
  );

  html += h3('Cost Comparison Over One Year:');
  html += `<table>
<tbody>
<tr>
<td><b>One-Time Service</b></td>
<td><b>Annual Maintenance Contract</b></td>
</tr>
<tr>
<td><span style="font-weight: 400;">Pay per visit</span></td>
<td><span style="font-weight: 400;">Fixed yearly cost</span></td>
</tr>
<tr>
<td><span style="font-weight: 400;">Good for occasional servicing</span></td>
<td><span style="font-weight: 400;">Scheduled preventive maintenance</span></td>
</tr>
<tr>
<td><span style="font-weight: 400;">Repairs charged individually</span></td>
<td><span style="font-weight: 400;">Includes priority support &amp; discounted repairs</span></td>
</tr>
<tr>
<td><span style="font-weight: 400;">Costs change throughout the year</span></td>
<td><span style="font-weight: 400;">Easier to budget</span></td>
</tr>
</tbody>
</table>\n`;

  html += h3('Best Fit for Landlords vs Tenants vs Homeowners:');
  html += p(`${b('Landlords:')}`);
  html += p('AMCs protect rental properties and minimize sudden repair costs.');
  html += p(`${b('Tenants:')}`);
  html += p('One-time servicing may be enough. Usually for shorter leases unless maintenance is included in the tenancy agreement.');
  html += p(`${b('Homeowners:')}`);
  html += p('Annual contracts provide consistent servicing. Every homeowner achieves a greater peace of mind.');
  html += linkedImg('/contact-us/', IMG.contact.src, IMG.contact.alt);

  html += h2('How to Pick The Correct AC Maintenance Company in Dubai?');
  html += p(
    `The affordable company isn't always the best. You're trusting them with an essential part. So choose wisely; don't rush!`,
  );

  html += h3('Certification to Check:');
  html += p(
    `Hiring a contractor? They must hold a valid UAE trade license. Make sure they employ only qualified ${a('/hvac-system/', 'HVAC')} technicians. Check out whether they carry appropriate insurance. Using genuine replacement parts makes them reliable to trust. Ask if they offer clear service reports after each visit.`,
  );

  html += h3('Questions to Ask Before a Contract:');
  html += p(
    'Before your final move, ask what services are included in a contract. Inquire about how many maintenance visits are provided each year. Check out whether emergency call-outs are covered. Ask if spare parts are included or billed separately. Clear your doubts about whether they provide written inspection reports.',
  );

  html += h2('Conclusion');
  html += p(
    'Many homeowners consider their AC just another appliance. But you shouldn\'t make this mistake! Because it\'s an essential home component. A compulsory and most useful addition for comfortable living in Dubai. Its regular maintenance keeps your home cooler. Experience lowers electricity costs and enhances air quality. Also, it prevents you from costly breakdowns during the year\'s hottest months.',
  );
  html += p(
    'Choose either a one-time service or an AMC; act early. Because acting before problems appear is always the smarter investment.',
  );
  html += p(
    `Book a professional AC maintenance service with ${a('/', 'REDO')}. Let's keep your cooling system running all year round perfectly.`,
  );

  html += h2('FAQs');

  html += h3('How often should I service my AC in Dubai?');
  html += p('It is advised to schedule AC servicing twice a year with regular filter cleaning.');

  html += h3('What does AC maintenance cost in Dubai?');
  html += p(
    'Basic AC service costs you between one hundred fifty and three hundred dirhams per unit. Deep cleaning will cost you around three hundred to six hundred dirhams per unit. Annual maintenance contracts range from twelve hundred to thirty-five hundred dirhams annually based on your property and system.',
  );

  html += h3('Is an air conditioner maintenance contract worth it?');
  html += p(
    'AMCs are worth taking if your AC runs on a daily basis. These contracts eliminate emergency breakdowns and enhance your system\'s efficiency. It comes with priority support.',
  );

  html += h3('What are the signs of an AC that needs maintenance?');
  html += p('Call a professional if you see these issues:');
  html += ul(['Warm airflow', 'Unusual noises', 'Water leakage', 'Weak airflow', 'Rising DEWA bills']);
  html += p('They are all red flags that indicate your system needs attention.');

  html += h3('Can I clean my AC filters myself? Or do I need a professional?');
  html += p(
    'You can safely clean or replace filters. But some tasks should always be handled by licensed technicians:',
  );
  html += ul(['Coil cleaning', 'Refrigerant work', 'Electrical servicing']);

  html += h3("What's included in an AC maintenance visit?");
  html += p('A standard visit includes services such as');
  html += ul([
    'Filter servicing',
    'Coil cleaning',
    'Refrigerant level checks',
    'Drainage inspection',
    'Electrical and thermostat testing.',
  ]);

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How often should I service my AC in Dubai?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'It is advised to schedule AC servicing twice a year with regular filter cleaning.',
        },
      },
      {
        '@type': 'Question',
        name: 'What does AC maintenance cost in Dubai?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Basic AC service costs between AED 150 and AED 300 per unit. Deep cleaning costs around AED 300 to AED 600 per unit. Annual maintenance contracts range from AED 1,200 to AED 3,500 annually, based on your property and system.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is an air conditioner maintenance contract worth it?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: "AMCs are worth taking if your AC runs on a daily basis. These contracts help reduce emergency breakdowns, enhance your system's efficiency, and provide priority support.",
        },
      },
      {
        '@type': 'Question',
        name: 'What are the signs of an AC that needs maintenance?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Common signs that your AC needs maintenance include warm airflow, unusual noises, water leakage, weak airflow, and rising DEWA bills. These are red flags that indicate your system needs professional attention.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can I clean my AC filters myself? Or do I need a professional?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'You can safely clean or replace AC filters yourself. However, tasks such as coil cleaning, refrigerant work, and electrical servicing should always be handled by licensed technicians.',
        },
      },
      {
        '@type': 'Question',
        name: "What's included in an AC maintenance visit?",
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'A standard AC maintenance visit typically includes filter servicing, coil cleaning, refrigerant level checks, drainage inspection, and electrical and thermostat testing.',
        },
      },
    ],
  };

  html += `<p><script type="application/ld+json">\n${JSON.stringify(faqSchema, null, 2)}\n</script></p>\n`;

  return html;
}

function legacyIndent(html) {
  return html
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => `\t\t\t\t\t${line}`)
    .join('\n');
}

function patchLegacyMirror(bodyHtml) {
  if (!fs.existsSync(legacyPath)) {
    console.warn('Legacy mirror missing — skipped');
    return;
  }

  let html = fs.readFileSync(legacyPath, 'utf8');
  const oldTitle = 'AC Maintenance Dubai - Your Hassle-Free Solutions';
  const oldTitleEntity = 'AC Maintenance Dubai &#8211; Your Hassle-Free Solutions';
  const newTitleEntity = TITLE.replace(/&/g, '&amp;');

  html = html.replaceAll(oldTitle, META_TITLE);
  html = html.replaceAll(oldTitleEntity, newTitleEntity);
  html = html.replace(
    /Ensure your comfort in Dubai&#039;s scorching heat with our comprehensive AC maintenance Dubai\. Trust us to keep you cool and comfortable\./g,
    META_DESC.replace(/'/g, '&#039;'),
  );

  const contentBlock = legacyIndent(bodyHtml);
  html = html.replace(
    /(<div class="elementor-element elementor-element-f60231b elementor-widget elementor-widget-theme-post-content"[\s\S]*?<div class="elementor-widget-container">\n)[\s\S]*?(\n\t\t\t\t<\/div>\n\t\t\t\t<\/div>\n\t\t\t\t<div class="elementor-element elementor-element-a1c2ab4)/,
    `$1${contentBlock}$2`,
  );

  const modifiedDisplay = MODIFIED.slice(0, 19).replace('T', 'T') + '+04:00';
  html = html.replace(
    /<meta property="og:updated_time" content="[^"]+" \/>/,
    `<meta property="og:updated_time" content="${modifiedDisplay}" />`,
  );
  html = html.replace(
    /<meta property="article:modified_time" content="[^"]+" \/>/,
    `<meta property="article:modified_time" content="${modifiedDisplay}" />`,
  );

  fs.writeFileSync(legacyPath, html);
  console.log('Patched legacy mirror');
}

function patchLegacyFeaturedImage() {
  if (!fs.existsSync(legacyPath)) return;
  let html = fs.readFileSync(legacyPath, 'utf8');
  const featured = IMG.featured;
  html = html.replace(
    /(<div class="elementor-element elementor-element-776a86a[\s\S]*?<img[^>]*src=")[^"]+("[^>]*alt=")[^"]+(")/,
    `$1${featured.src}$2${featured.alt}$3`,
  );
  html = html.replaceAll('/wp-content/uploads/2024/06/ACMaintenanceDubai.webp', featured.src);
  html = html.replaceAll('/wp-content/uploads/2024/06/ACMaintenanceDubai-813x1024.webp', featured.src);
  html = html.replaceAll('/wp-content/uploads/2024/06/ACMaintenanceDubai-238x300.webp', featured.src);
  html = html.replaceAll('/wp-content/uploads/2024/06/ACMaintenanceDubai-768x968.webp', featured.src);
  // Keep noscript srcset pointed at the same featured asset (legacy mirror had stale webp sizes).
  html = html.replace(
    /srcset="\/wp-content\/uploads\/2026\/09\/ac-maintenance-dubai-featured\.jpg 813w, [^"]+"/g,
    `srcset="${featured.src} 1070w"`,
  );
  fs.writeFileSync(legacyPath, html);
  console.log('Patched legacy featured image');
}

function syncImagesToDist() {
  fs.mkdirSync(distUploadsDir, { recursive: true });
  for (const key of ['featured', 'afterChecklist', 'contact']) {
    const item = IMG[key];
    const from = path.join(uploadsDir, item.file);
    const to = path.join(distUploadsDir, item.file);
    if (!fs.existsSync(from)) {
      throw new Error(`Missing public upload: ${from}`);
    }
    fs.copyFileSync(from, to);
  }
  console.log('Synced images to dist/client');
}

function main() {
  fs.mkdirSync(uploadsDir, { recursive: true });

  for (const key of ['featured', 'afterChecklist', 'contact']) {
    const item = IMG[key];
    if (!fs.existsSync(item.from)) {
      throw new Error(`Missing source image: ${item.from}`);
    }
    fs.copyFileSync(item.from, path.join(uploadsDir, item.file));
    console.log('Copied', item.file);
  }

  const body = buildContent();
  const contentHtml = `\n\t\t\t\t\t${body}\t\t\t\t`;
  const processed = processContentHeadings(contentHtml);

  const post = JSON.parse(fs.readFileSync(postPath, 'utf8'));
  post.title = TITLE;
  post.description = META_DESC;
  post.modifiedAt = MODIFIED;
  post.contentHtml = processed.html;
  post.toc = processed.toc;
  post.headings = processed.headings;
  post.breadcrumb = post.breadcrumb.map((item, i, arr) =>
    i === arr.length - 1 ? { name: TITLE } : item,
  );
  post.featuredImage = {
    src: IMG.featured.src,
    alt: IMG.featured.alt,
    originalUrl: IMG.featured.src,
  };
  post.og = {
    title: META_TITLE,
    description: META_DESC,
    image: IMG.featured.src,
    type: 'article',
  };
  post.twitter = {
    card: 'summary_large_image',
    title: META_TITLE,
    description: META_DESC,
    image: IMG.featured.src,
  };

  const images = [
    { src: IMG.featured.src, alt: IMG.featured.alt, originalUrl: IMG.featured.src },
    { src: IMG.afterChecklist.src, alt: IMG.afterChecklist.alt, originalUrl: IMG.afterChecklist.src },
    { src: IMG.contact.src, alt: IMG.contact.alt, originalUrl: IMG.contact.src },
  ];
  post.images = images;

  fs.writeFileSync(postPath, `${JSON.stringify(post, null, 2)}\n`);
  patchLegacyMirror(processed.html.replace(/^\n\t\t\t\t\t|\t\t\t\t$/g, '').trim());
  patchLegacyFeaturedImage();
  syncImagesToDist();
  console.log(`Updated ${SLUG} — ${processed.toc.length} TOC entries`);
}

main();
