/**
 * Create Connect FM blog post from DOCX + local images.
 * Does not commit/push.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const UPLOAD_DIR = path.join(ROOT, "public/wp-content/uploads/2026/08");
const POSTS_PATH = path.join(ROOT, "src/data/posts.json");
const TAGS_PATH = path.join(ROOT, "src/data/tags.json");

const NEW_ID = 6228;
const SLUG = "smart-home-automation-in-dubai-guide";
const PATH = `/${SLUG}/`;
const TITLE =
  "Simple Guide for Smart Home Automation in Dubai: Setup Costs and Systems in 2026";
const META_TITLE = "Smart Home Automation in Dubai: 2026 Cost & Setup Guide";
const META_DESC =
  "Compare smart home automation costs, systems, and top providers in Dubai. Real AED pricing, protocol comparison, and a setup guide for 2026.";
const FEATURED_ALT = "smart home automation in Dubai";
const CENTER_ALT = "smart home automation Dubai";
const AUTHOR_ID = 10;
const AUTHOR_NAME = "Francisco";
const AUTHOR_SLUG = "francisco";
const CATEGORY_ID = 26; // Security & Smart Systems
const NOW = "2026-08-25T11:00:00";

const SRC = {
  featured: "C:/Users/DELL/Downloads/smart home automation in Dubai.jpeg",
  center: "C:/Users/DELL/Downloads/mib blog imag.jpeg",
  cta: "C:/Users/DELL/Downloads/bottom-cta.jpeg",
};

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

async function writeResponsive(srcPath, baseName, altHint) {
  const img = sharp(srcPath);
  const meta = await img.metadata();
  const w = meta.width || 1500;
  const h = meta.height || 1000;
  const fullName = `${baseName}.webp`;
  const fullPath = path.join(UPLOAD_DIR, fullName);
  await sharp(srcPath).webp({ quality: 82 }).toFile(fullPath);

  const widths = [300, 768, 1024].filter((x) => x < w);
  const srcsetParts = [];
  for (const tw of widths) {
    const th = Math.round((h * tw) / w);
    const name = `${baseName}-${tw}x${th}.webp`;
    await sharp(srcPath)
      .resize(tw, th, { fit: "cover" })
      .webp({ quality: 80 })
      .toFile(path.join(UPLOAD_DIR, name));
    srcsetParts.push(`/wp-content/uploads/2026/08/${name} ${tw}w`);
  }
  srcsetParts.push(`/wp-content/uploads/2026/08/${fullName} ${w}w`);

  return {
    url: `/wp-content/uploads/2026/08/${fullName}`,
    width: w,
    height: h,
    srcset: srcsetParts.join(", "),
    sizesDefault: `(max-width: ${Math.min(w, 800)}px) 100vw, ${Math.min(w, 800)}px`,
  };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cleanHeading(text) {
  return text.replace(/^H[123]\s*:\s*/i, "").trim();
}

function normalizeHref(href) {
  if (!href) return href;
  return href
    .replace(/^https?:\/\/connectfm\.ae/i, "")
    .replace(/\/$/, (m, offset, str) => (str.includes("?") ? m : "/"));
}

function buildArticleContent(featured, center, cta) {
  // Content from DOCX — preserve wording; strip H1/H2/H3 labels and SEO/meta preamble.
  const blocks = [];

  const p = (html, bold = false) => {
    if (bold) blocks.push(`<p><strong>${html}</strong></p>`);
    else blocks.push(`<p>${html}</p>`);
  };
  const h2 = (t) => blocks.push(`<h2>${escapeHtml(cleanHeading(t))}</h2>`);
  const h3 = (t) => blocks.push(`<h3>${escapeHtml(cleanHeading(t))}</h3>`);

  p(
    "Picture yourself strolling into a cool, properly lit mansion without lifting a finger. Your home knows your every need before you ask for it. Nowadays, it is the real magic of smart home automation in Dubai.",
    true
  );
  p(
    "Property owners in the Emirates are moving away from basic electronics. They want maximum comfort, greater security, and genuine energy savings. With so many choices on the market, it may be hard to decide which arrangement is perfect for you.",
    true
  );
  p(
    "This full guide has all you need to know. We let you easily move to the latest equipment, realistic pricing, and setup options for your luxury residential contemporary property."
  );

  h2("How Do You Define Smart Home Automation?");
  p(
    `The <a href="/security/smart-homes/">smart home automation system</a> is the network of linked devices that you may use to manage lighting, temperature, and security remotely. It brings your home appliances together in one convenient platform. You can easily control your whole home space from your phone.`,
    true
  );

  h3("Working Mechanism of a Smart Home Automation System");
  p(
    "A central hub is used to interface with sensors and smart devices utilizing Wi-Fi or Bluetooth. Real-time data is sent to your mobile app. You input a command or touch the screen. The technology does exactly what you want, immediately."
  );

  h3("Main Differences between Smart Home and Standard Home Setup");
  p(
    "Traditional dwellings employ manual switches and actual keys. Smart systems use automatic triggers and remote access. Traditional spaces are static and reactive. Smart homes learn your daily patterns, saving energy and protecting your family in advance."
  );

  h2("Why Dubai is Getting a Surge in Smart Home Automation");
  p(
    "Smart home automation in Dubai is seeing rapid growth owing to the Dubai Urban Master Plan and DEWA’s smart infrastructure ambition of the government. These schemes promote sustainable urban sprawl, energy efficiency, and high-tech living environments above residential buildings.",
    true
  );

  h3("Privileges of Smart Home Automation");
  p(
    "Homeowners have amazing daily perks like cheaper electricity expenses and better security. Automated temperature control reduces cooling waste during hot desert summers. Enjoy absolute peace of mind with remote monitoring, immediate mobile notifications, and easy-to-use voice-activated lifestyle management each day."
  );

  h3("Dubai Property Value with Smart Home Automation");
  p(
    "Integrating current technologies greatly increases the attractiveness of your real estate asset. In the Emirates, residences with tech equipment attract a ten to fifteen percent premium. Buyers and smart investors are looking for future-ready properties that provide good rental returns and speedier resale."
  );

  h2("Various Categories of Smart Home Automation Systems in Dubai");
  p(
    "Your choice of smart home automation Dubai relies on your house architecture and lifestyle. It's a critical piece of electronic infrastructure for the modern home. Let's check over the main system categories for luxury real estate and contemporary houses in the UAE nowadays.",
    true
  );

  h3("Cabled Home Automation Systems");
  p(
    "Wired home automation systems give the best possible stability and security. They are all linked with a physical network of cables. This configuration removes wireless interference entirely. This solid infrastructure in large luxury villas is of enormous advantage for large property renovations or hefty building projects."
  );

  h3("Wireless Home Automation Systems in Dubai");
  p(
    "Wireless technologies, such as Zigbee, Z-Wave, and Wi-Fi, provide you with amazing freedom. They don't need untidy wires or intrusive wall drilling. They may be installed rapidly in completed rooms. They connect seamlessly with your smartphone for easy remote control and daily convenience."
  );

  h3("Hybrid Smart Automation Systems in Dubai");
  p(
    "Hybrid arrangements provide the best of both traditional and automated systems. They have reliable wired backbones for the most essential security zones. Then they install flexible Wi-Fi nodes for simple room extension. This smart combination will provide you with optimal performance without breaking your whole project budget."
  );

  h3("Which home automation system is best? Villas or Apartments");
  p(
    "Expansive villas often need complete wired or hybrid systems throughout building stages. Agile wireless systems that need minimal structural alterations are a hit with compact residences. If you’re looking for the best, most reliable, and affordable solution for your automation network, consider what kind of space you have."
  );

  h2("Budget for Smart Home Automation Systems in Dubai");
  p(
    "The cost of smart home automation in Dubai typically varies from 5000 Dirhams for basic packages to over 250,000 Dirhams for luxury homes. The overall expenditure varies greatly depending on property size, system complexity, and chosen brands. Plan your budget wisely for long-term enjoyment.",
    true
  );

  blocks.push(`<figure class="wp-block-table"><table>
<thead><tr><th>Type of Setup</th><th>Costs</th></tr></thead>
<tbody>
<tr><td>Basic Price Package</td><td>5,000 - 15,000 AED</td></tr>
<tr><td>Mid-Range Setup Cost</td><td>15,000 - 45,000 AED</td></tr>
<tr><td>Luxury Integration Cost</td><td>45,000 - 250,000 AED plus</td></tr>
</tbody>
</table></figure>`);

  h3("Home Automation System Cost Based on Property Types");
  p(
    "Apartments have the benefit of having smaller expenditures since they utilize wireless kits. Villas need intricate wiring and multi-zone temperature control, with increasing prices. Commercial offices have a reasonable cost and investment for company owners that balances security with energy-saving features."
  );

  h3("Home Automation System Cost Based on System Level");
  p(
    "The base levels include smart lighting and remote security applications. Mid-range choices include motorized curtains and temperature controls. Full integration ecosystems provide full voice-controlled home management, personalized multi-room entertainment, and ultimate luxury comfort for today’s occupants."
  );

  // CENTER IMAGE — middle of article (after budget, before major elements)
  blocks.push(
    `<p><img loading="lazy" decoding="async" class="aligncenter size-large wp-image-${NEW_ID}1" src="${center.url}" alt="${escapeHtml(CENTER_ALT)}" width="${Math.min(center.width, 800)}" height="${Math.round((center.height * Math.min(center.width, 800)) / center.width)}" srcset="${center.srcset}" sizes="${center.sizesDefault}" /></p>`
  );

  h2("Major Elements of a Smart Home Automation Solution in Dubai");
  p(
    "A top-grade smart home automation solution in Dubai incorporates several technological elements to make your everyday chores easy. Learning about these elements can assist you in creating a pleasant, safe, and highly efficient living area that suits your lifestyle.",
    true
  );

  h3("Automation Systems for Lighting and Weather Control");
  p(
    "Automated HVAC and smart lighting solutions to enhance your home environment. You may preset cooling settings to counteract desert heat and save utility expenditures. Create custom dynamic lighting scenarios that fit your precise mood or time of day with no fuss."
  );

  h3("Automation Systems for Protection and Access Control");
  p(
    "You need superior monitoring and smart locks to protect your family. Full visibility with high-definition cameras, motion sensors, and biometric entry points. You may monitor the property boundary zones remotely and provide guests safe entry from afar."
  );

  h3("Automation Systems for Sound, Visuals, Entertainment, and Smart Curtains");
  p(
    "Automated curtains help to protect interior spaces from extreme sunlight and to save energy on cooling. Home theaters and multi-room audio systems create immersive media experiences. Control blinds and entertainment hubs smoothly with easy automation instructions or preset schedules."
  );

  h3("Automation Systems Integration with Voice and Mobile App Control");
  p(
    "Centralized software brings your whole property network together under one interface. Temperature, security, and lighting at your fingertips with elegant wall panels or smartphone apps. Voice assistants help you operate things hands-free, so managing a contemporary home is entirely active and responsive."
  );

  h2("Selecting the Best Smart Home Automation Company in Dubai");
  p(
    "Choosing the proper partner for smart home automation in Dubai guarantees long-term credibility. You need a staff with demonstrated local experience and high technical abilities. They will assist you throughout the major elements to choose the appropriate expert contractor.",
    true
  );

  h3("Check Their Certifications");
  p(
    "Before signing any contract, get valid industry qualifications. Certified partners provide exceptional system integration for platforms like KNX or Control4. These certifications display that the team has intensive technical training to securely work with complicated contemporary home design."
  );

  h3("Questions to Know Before You Get One");
  p(
    "Always question prospective contractors about previous projects and warranty conditions. Ask whether they provide local assistance and maintenance after installation. Their reaction time to technological issues may provide you with full peace of mind throughout your smart home journey."
  );

  // BOTTOM CTA — linked to Contact Us (above Installation Procedure section)
  blocks.push(
    `<p style="text-align:center;"><a href="/contact/"><img loading="lazy" decoding="async" class="aligncenter size-large wp-image-${NEW_ID}2" src="${cta.url}" alt="${escapeHtml(FEATURED_ALT)}" width="${Math.min(cta.width, 800)}" height="${Math.round((cta.height * Math.min(cta.width, 800)) / cta.width)}" srcset="${cta.srcset}" sizes="${cta.sizesDefault}" /></a></p>`
  );

  h2("Installation Procedure for Dubai Smart Home Automation System");
  p(
    "Automating your property is an easy process when dealing with professionals. Each phase is carefully controlled for your lifestyle and house layout. They take care of the technical procedures so you can have a flawless luxury experience without any concern."
  );

  h3("Evaluating the Area and Planning");
  p(
    "It all starts with a detailed survey of your house, done on-site. Technicians check your existing electrical wiring, Wi-Fi coverage, and structural architecture. This thorough review enables us to develop an individualized automation plan, tailored to suit your daily home demands."
  );

  h3("Timeframe for Automation System Installation");
  p(
    "Installation times may vary based on the size of your property and the equipment you choose. Wireless installs in compact flats often take two to four days. For full smart villas, programming, wiring, testing, and final handover take five to ten days."
  );

  h3("Warranty & Professional Support");
  p(
    "The good suppliers will continue to provide you with technical assistance and offer full hardware warranties after they have set up your system. Teams provide regular system upgrades, rapid troubleshooting help, and training on applications. You have peace of mind knowing that qualified aid is always there when you need it."
  );

  h2("Wrapping Up: Smart Home Automation Really Worth It in Dubai 2026");
  p(
    "Today’s competitive real estate market makes it well worth it for contemporary property owners to invest in smart home automation in Dubai. The regional market has fully transitioned from a premium novelty to a must-have industry staple.",
    true
  );
  p(
    "It gives you unrivaled energy savings, increased security on a daily basis, and far greater resale prices for the property. Let our dedicated professional team help you plan and develop your perfect future-ready smart living place now."
  );

  h2("FAQs");
  h3("What is the estimated price of smart home automation in Dubai?");
  p(
    "The cost of smart home automation will vary depending on your property type and the system’s features. Basic configurations start from five thousand dirhams. Full bespoke installations for high-end luxury villas might easily go beyond 250,000 dirhams."
  );
  h3("Which is the finest smart home automation system for a property in Dubai?");
  p(
    "Hardwired systems or high-end wireless platforms are the best fit for villas. They're good for extended features, multi-zone cooling, high-end security, and huge layouts, with perfect stability and speed."
  );
  h3("Is a smart home automation system in Dubai really worth it?");
  p(
    "Yes, that is a really worthy investment. Automation systems reduce the hefty expenses for cooling in the hot months. They also add value to the house resale and provide unrivaled daily comfort for the contemporary UAE homeowner."
  );
  h3("Should I install a smart home automation system in a pre-built apartment in Dubai?");
  p(
    "Wireless systems employ Wi-Fi and Bluetooth connections already in place. No destructive wall drilling or rewiring needed. You may enhance your completed apartment rapidly with little effort and total convenience."
  );
  h3("How much time is required to have smart home automation installed in Dubai?");
  p(
    "Wireless installs for small residences are simple and take two to three days. Larger luxury villas, which might need a lot of wiring and bespoke programming, often take five to ten days for the entire installation."
  );
  h3("Differentiate between a smart home and a smart home automation system?");
  p(
    "A smart house is one in which individual items are linked, for example, smart locks or automated lamps. A smart home automation system connects all these gadgets into a single centralized network that works together automatically and seamlessly."
  );

  return `<div id="bsf_rt_marker"></div>\n${blocks.join("\n")}\n`;
}

function faqSchema() {
  const faqs = [
    {
      q: "What is the estimated price of smart home automation in Dubai?",
      a: "The cost of smart home automation will vary depending on your property type and the system’s features. Basic configurations start from five thousand dirhams. Full bespoke installations for high-end luxury villas might easily go beyond 250,000 dirhams.",
    },
    {
      q: "Which is the finest smart home automation system for a property in Dubai?",
      a: "Hardwired systems or high-end wireless platforms are the best fit for villas. They're good for extended features, multi-zone cooling, high-end security, and huge layouts, with perfect stability and speed.",
    },
    {
      q: "Is a smart home automation system in Dubai really worth it?",
      a: "Yes, that is a really worthy investment. Automation systems reduce the hefty expenses for cooling in the hot months. They also add value to the house resale and provide unrivaled daily comfort for the contemporary UAE homeowner.",
    },
    {
      q: "Should I install a smart home automation system in a pre-built apartment in Dubai?",
      a: "Wireless systems employ Wi-Fi and Bluetooth connections already in place. No destructive wall drilling or rewiring needed. You may enhance your completed apartment rapidly with little effort and total convenience.",
    },
    {
      q: "How much time is required to have smart home automation installed in Dubai?",
      a: "Wireless installs for small residences are simple and take two to three days. Larger luxury villas, which might need a lot of wiring and bespoke programming, often take five to ten days for the entire installation.",
    },
    {
      q: "Differentiate between a smart home and a smart home automation system?",
      a: "A smart house is one in which individual items are linked, for example, smart locks or automated lamps. A smart home automation system connects all these gadgets into a single centralized network that works together automatically and seamlessly.",
    },
  ];
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

function replaceWidgetContent(html, widgetType, newInner) {
  const marker = `data-widget_type="${widgetType}">`;
  const markerIdx = html.indexOf(marker);
  if (markerIdx < 0) throw new Error("widget not found: " + widgetType);
  const openIdx = html.lastIndexOf("<div", markerIdx);
  let i = openIdx;
  let depth = 0;
  let contentStart = -1;
  let contentEnd = -1;
  while (i < html.length) {
    const nextOpen = html.indexOf("<div", i);
    const nextClose = html.indexOf("</div>", i);
    if (nextClose < 0) break;
    if (nextOpen >= 0 && nextOpen < nextClose) {
      if (depth === 0) {
        contentStart = html.indexOf(">", nextOpen) + 1;
      }
      depth++;
      i = nextOpen + 4;
    } else {
      depth--;
      if (depth === 0) {
        contentEnd = nextClose;
        break;
      }
      i = nextClose + 6;
    }
  }
  if (contentStart < 0 || contentEnd < 0) throw new Error("bounds fail for " + widgetType);
  return html.slice(0, contentStart) + newInner + html.slice(contentEnd);
}

function ensureTags(tagDefs) {
  const tags = JSON.parse(fs.readFileSync(TAGS_PATH, "utf8"));
  const maxId = Math.max(0, ...tags.map((t) => t.id));
  let next = maxId + 1;
  const ids = [];
  for (const def of tagDefs) {
    let hit = tags.find((t) => t.slug === def.slug);
    if (!hit) {
      hit = {
        id: next++,
        name: def.name,
        slug: def.slug,
        path: `/tag/${def.slug}/`,
        description: "",
        count: 1,
      };
      tags.push(hit);
    }
    ids.push(hit.id);
  }
  fs.writeFileSync(TAGS_PATH, JSON.stringify(tags, null, 2) + "\n");
  return ids;
}

async function main() {
  console.log("Optimizing images...");
  const featured = await writeResponsive(
    SRC.featured,
    "Smart-Home-Automation-in-Dubai",
    FEATURED_ALT
  );
  const center = await writeResponsive(SRC.center, "smart-home-automation-Dubai-mid", CENTER_ALT);
  const cta = await writeResponsive(SRC.cta, "smart-home-automation-Dubai-cta", FEATURED_ALT);
  console.log({ featured: featured.url, center: center.url, cta: cta.url });

  const articleHtml = buildArticleContent(featured, center, cta);

  const posts = JSON.parse(fs.readFileSync(POSTS_PATH, "utf8"));
  if (posts.some((p) => p.slug === SLUG || p.id === NEW_ID)) {
    throw new Error(`Post already exists for slug ${SLUG} or id ${NEW_ID}`);
  }

  const template = posts.find((p) => p.id === 6128);
  if (!template) throw new Error("template post 6128 missing");

  let bodyHtml = template.bodyHtml;

  // Update post wrapper classes / id
  bodyHtml = bodyHtml
    .replace(/post-6128/g, `post-${NEW_ID}`)
    .replace(
      /category-security-smart-systems[\s\S]*?hentry/g,
      (m) => m
    );

  // Category/tag class list on wrapper
  bodyHtml = bodyHtml.replace(
    /class="elementor elementor-2619 elementor-location-single post-\d+ post type-post status-publish format-standard has-post-thumbnail hentry[^"]*"/,
    `class="elementor elementor-2619 elementor-location-single post-${NEW_ID} post type-post status-publish format-standard has-post-thumbnail hentry category-security-smart-systems tag-smart-home-automation-in-dubai tag-smart-home-automation-dubai"`
  );

  // Featured image
  const featInner = `
															<img loading="eager" width="${featured.width}" height="${featured.height}" src="${featured.url}" class="attachment-full size-full wp-image-${NEW_ID}" alt="${escapeHtml(FEATURED_ALT)}" srcset="${featured.srcset}" sizes="(max-width: ${featured.width}px) 100vw, ${featured.width}px" />															`;
  bodyHtml = replaceWidgetContent(bodyHtml, "theme-post-featured-image.default", featInner);

  // Title
  bodyHtml = replaceWidgetContent(
    bodyHtml,
    "theme-post-title.default",
    `\n\t\t\t\t\t<h1 class="elementor-heading-title elementor-size-default">${escapeHtml(TITLE)}</h1>\t\t\t\t`
  );
  // There may be multiple theme-post-title widgets (related cards). Only first was replaced.
  // Replace remaining main H1 if any leftover old title appears as primary H1 once.
  bodyHtml = bodyHtml.replace(
    /<h1 class="elementor-heading-title elementor-size-default">[\s\S]*?<\/h1>/,
    `<h1 class="elementor-heading-title elementor-size-default">${escapeHtml(TITLE)}</h1>`
  );

  // Post content
  bodyHtml = replaceWidgetContent(bodyHtml, "theme-post-content.default", `\n\t\t\t\t\t${articleHtml}\n\t\t\t\t`);

  // Breadcrumb current item only (do not rewrite related-post cards)
  bodyHtml = bodyHtml.replace(
    /breadcrumb_blog[\s\S]{0,2500}?Guide to Security Guard Services in Dubai/,
    (m) => m.replace("Guide to Security Guard Services in Dubai", TITLE)
  );
  bodyHtml = bodyHtml.replace(
    /(breadcrumb_blog[\s\S]{0,2500}?)\/guide-to-security-guard-services-in-dubai\//,
    `$1${PATH}`
  );

  // Copy elementor css file
  const cssSrc = path.join(ROOT, "public/wp-content/uploads/elementor/css/post-6128.css");
  const cssDest = path.join(ROOT, `public/wp-content/uploads/elementor/css/post-${NEW_ID}.css`);
  if (fs.existsSync(cssSrc)) {
    let css = fs.readFileSync(cssSrc, "utf8");
    css = css.replaceAll("6128", String(NEW_ID));
    fs.writeFileSync(cssDest, css);
  }

  const tagIds = ensureTags([
    {
      name: "smart home automation in Dubai",
      slug: "smart-home-automation-in-dubai",
    },
    {
      name: "smart home automation Dubai",
      slug: "smart-home-automation-dubai",
    },
  ]);

  const pageCss = (template.pageCss || []).map((u) =>
    u.includes("post-6128.css") ? `/wp-content/uploads/elementor/css/post-${NEW_ID}.css` : u
  );
  if (!pageCss.includes(`/wp-content/uploads/elementor/css/post-${NEW_ID}.css`)) {
    pageCss.push(`/wp-content/uploads/elementor/css/post-${NEW_ID}.css`);
  }

  const excerpt = META_DESC.slice(0, 240);

  const entry = {
    id: NEW_ID,
    type: "post",
    slug: SLUG,
    path: PATH,
    link: `https://connectfm.ae${PATH}`,
    title: TITLE,
    content: articleHtml,
    bodyHtml,
    excerpt,
    date: NOW,
    modified: NOW,
    categories: [CATEGORY_ID],
    tags: tagIds,
    author: AUTHOR_ID,
    authorName: AUTHOR_NAME,
    authorSlug: AUTHOR_SLUG,
    featuredImage: featured.url,
    status: "published",
    elementorCss: `/wp-content/uploads/elementor/css/post-${NEW_ID}.css`,
    pageCss,
    seo: {
      title: META_TITLE,
      description: META_DESC,
      canonical: PATH,
      ogImage: featured.url,
      robots: { index: "index", follow: "follow" },
      schemas: [faqSchema()],
    },
  };

  // Newest first (existing file is newest-first)
  posts.unshift(entry);
  fs.writeFileSync(POSTS_PATH, JSON.stringify(posts, null, 2) + "\n");

  // Verify
  const checks = {
    slug: entry.slug,
    path: entry.path,
    featuredAlt: bodyHtml.includes(`alt="${FEATURED_ALT}"`),
    centerAlt: bodyHtml.includes(`alt="${CENTER_ALT}"`),
    ctaContact: /href="\/contact\/"[\s\S]{0,200}smart-home-automation-Dubai-cta/i.test(bodyHtml),
    featuredUrl: bodyHtml.includes(featured.url),
    centerUrl: bodyHtml.includes(center.url),
    ctaUrl: bodyHtml.includes(cta.url),
    titleInBody: bodyHtml.includes(TITLE),
    docxSnippet: bodyHtml.includes("Picture yourself strolling into a cool"),
    faqPresent: bodyHtml.includes("What is the estimated price of smart home automation"),
    elementor: /data-elementor-type="single-post"/.test(bodyHtml),
  };
  console.log("VERIFY", checks);
  const failed = Object.entries(checks).filter(([, v]) => v === false);
  if (failed.length) {
    console.error("FAILED CHECKS", failed);
    process.exit(1);
  }
  console.log("OK published", PATH);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
