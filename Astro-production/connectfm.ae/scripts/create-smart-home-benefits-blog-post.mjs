/**
 * Create Connect FM blog post from
 * Smart Home Automation Benefits_ The Complete 2026 Guide.docx
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const UPLOAD_DIR = path.join(ROOT, "public/wp-content/uploads/2026/09");
const MEDIA_DIR = path.join(ROOT, "scripts/_tmp-benefits-docx-media");
const POSTS_PATH = path.join(ROOT, "src/data/posts.json");
const TAGS_PATH = path.join(ROOT, "src/data/tags.json");

const NEW_ID = 6229;
const SLUG = "smart-home-automation-benefits";
const POST_PATH = `/${SLUG}/`;
const TITLE = "Smart Home Automation Benefits: The Complete 2026 Guide";
const META_TITLE = "Smart Home Automation Benefits: Guide, Cost & Top Picks 2026";
const META_DESC =
  "Discover the real benefits of smart home automation in 2026—energy savings, security, cost breakdown, and top companies compared. Read the full guide.";
const FEATURED_ALT = "smart home automation benefits";
const ADVANTAGES_ALT = "advantages of smart home automation";
const BENEFITS_ALT = "benefits of smart home automation";
const AUTHOR_ID = 10;
const AUTHOR_NAME = "Francisco";
const AUTHOR_SLUG = "francisco";
const CATEGORY_ID = 26;
const NOW = "2026-09-01T10:00:00";

const SRC = {
  featured: path.join(MEDIA_DIR, "image4.jpg"),
  advantages: path.join(MEDIA_DIR, "image5.jpg"),
  benefits: path.join(MEDIA_DIR, "image3.png"),
  cta: path.join(MEDIA_DIR, "image1.jpg"),
};

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

async function writeResponsive(srcPath, baseName) {
  const img = sharp(srcPath);
  const meta = await img.metadata();
  const w = meta.width || 1500;
  const h = meta.height || 1000;
  const fullName = `${baseName}.webp`;
  await sharp(srcPath).webp({ quality: 82 }).toFile(path.join(UPLOAD_DIR, fullName));

  const widths = [300, 768, 1024].filter((x) => x < w);
  const srcsetParts = [];
  for (const tw of widths) {
    const th = Math.round((h * tw) / w);
    const name = `${baseName}-${tw}x${th}.webp`;
    await sharp(srcPath)
      .resize(tw, th, { fit: "cover" })
      .webp({ quality: 80 })
      .toFile(path.join(UPLOAD_DIR, name));
    srcsetParts.push(`/wp-content/uploads/2026/09/${name} ${tw}w`);
  }
  srcsetParts.push(`/wp-content/uploads/2026/09/${fullName} ${w}w`);

  return {
    url: `/wp-content/uploads/2026/09/${fullName}`,
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

function imgBlock(asset, alt, idSuffix, linkHref) {
  const w = Math.min(asset.width, 800);
  const h = Math.round((asset.height * w) / asset.width);
  const tag = `<img loading="lazy" decoding="async" class="aligncenter size-large wp-image-${NEW_ID}${idSuffix}" src="${asset.url}" alt="${escapeHtml(alt)}" width="${w}" height="${h}" srcset="${asset.srcset}" sizes="${asset.sizesDefault}" />`;
  const inner = linkHref
    ? `<a href="${linkHref}">${tag}</a>`
    : tag;
  return `<p style="text-align:center;">${inner}</p>`;
}

function buildArticleContent(featured, advantages, benefits, cta) {
  const blocks = [];
  const p = (html) => blocks.push(`<p>${html}</p>`);
  const ul = (items) =>
    blocks.push(`<ul>\n${items.map((item) => `<li>${item}</li>`).join("\n")}\n</ul>`);
  const h2 = (t) => blocks.push(`<h2>${escapeHtml(t)}</h2>`);
  const h3 = (t) => blocks.push(`<h3>${escapeHtml(t)}</h3>`);

  p(
    "Many individuals leave home in a rush to reach somewhere early. Then, realise later on that they forgot to lock the door. Faced that situation, too?"
  );
  p(
    "Ten years ago, that meant turning the car around. Today, a quick check on your phone can confirm the door is locked, the lights are off, and the thermostat has adjusted automatically."
  );
  p("<strong>That's where the real smart home automation benefits begin.</strong>");
  p(
    '<a href="/security/smart-homes/">Smart home automation</a> is a system that connects everything together, whether it\'s your devices, sensors, appliances, or controls. So they can communicate, respond automatically, and behave like a living human being. Everything can now be managed remotely. The benefits are obvious: it improves energy efficiency, security, convenience, and accessibility. You have control in your hand over everyday household tasks.'
  );

  h2("What Is Smart Home Automation?");
  p("It allows connected devices to perform actions based on:");
  ul(["Schedules", "Sensor activity", "User preferences", "Remote commands."]);
  p(
    "You're the king of your kingdom and can create rules that make devices respond automatically. The idea of manually controlling every light, lock, camera, or thermostat has become outdated."
  );

  h3("How Smart Home Systems Work:");
  p("A smart home follows a simple four-step process:");
  ul([
    "A trigger occurs in the form of motion or a temperature change.",
    "A hub, app, or controller processes the information.",
    "A connected device responds automatically.",
    "The homeowner can monitor or control the result remotely.",
  ]);
  p("For example:");
  p(
    "The system can turn off selected lights, adjust the thermostat, and activate security features when you leave the home."
  );

  h3("Key Components: Hubs, Sensors, Apps, & Voice Assistants");
  p(
    "Most systems provide smart hubs, motion, temperature, door, and window sensors, smart lights, locks, cameras, plugs, and thermostats. You are given mobile apps for remote control, voice assistants, and automation routines and schedules."
  );
  p("Technology quietly does the routine work in the background, freeing you from managing everything manually.");
  blocks.push(imgBlock(advantages, ADVANTAGES_ALT, "1", "/security/smart-homes/"));

  h2("Top Benefits of Smart Home Automation:");
  p(
    "Lower energy waste is the biggest benefit of smart home automation. You experience improved security, enjoy greater convenience, and have better accessibility and centralised control all in a single system!"
  );

  h3("Energy Efficiency & Lower Bills");
  p(
    "Automation can shrink unnecessary energy use by controlling lighting, cooling, and connected appliances according to occupancy and schedules."
  );
  p(
    "It turns lights off in empty rooms, adjusts the thermostat when nobody is home, schedules appliances, and uses only automated blinds to reduce heat gain. Not limited to this, it also keeps an eye on unusually high electricity use and switches off standby devices with smart plugs."
  );

  h3("How Much Can You Save?");
  p(
    "Savings depend on many factors, including home, climate, equipment, and user habits. Smart thermostats can reduce wasted heating and cooling by responding to occupancy and schedules. ENERGY STAR notes that heating and cooling account for nearly half of annual household energy costs in the average US home. This makes climate control the most important area for smart energy management."
  );

  h3("Enhanced Home Security:");
  p(
    "Smart automation can strengthen your home security through connected cameras, installed smart locks, sensors, and alarms."
  );
  p(
    "You can view everything live via camera and get instant motion alerts. You can use smart locks and temporary access codes. If anyone enters, you'll get instant door and window notifications. The video doorbells and automated lighting keep you updated every minute when you are away."
  );

  h3("Remote Monitoring & Real-Time Alerts:");
  p(
    "It lets homeowners check important areas of their property from almost anywhere. A water-leak sensor can alert you before a small problem becomes expensive damage. A door sensor can notify you when an entry opens unexpectedly. This immediate visibility is the most practical advantage of smart home automation that users enjoy."
  );

  h3("Convenience & Time Savings:");
  p(
    'Automation replaces repeated manual actions with routines. A simple "Good Night" routine could lock doors, switch off lights, lower blinds, adjust the temperature, and activate compatible security devices.'
  );

  h3("Improved Accessibility:");
  p(
    "Smart homes can make everyday living easier for elderly residents and people with mobility limitations. This goes far beyond convenience for many households. It can support greater independence."
  );

  h3("Increased Property Value:");
  p(
    "A well-designed automated system can make your property more appealing to buyers or tenants. No one has the audacity to turn down a property that provides them so many practical benefits."
  );
  p(
    "Here's the catch: more gadgets do not automatically mean more value. A reliable, simple, and transferable system will generally offer greater appeal than a confusing collection of incompatible devices."
  );
  blocks.push(imgBlock(benefits, BENEFITS_ALT, "2"));

  h2("Perks of Home Automation Over Traditional Systems:");
  p(
    "Both differ from each other completely. Why? Because connected devices can communicate, react to triggers, and work together in ways that traditional systems can't match."
  );

  h3("Centralised Control vs. Manual Operation");
  p("Having a traditional home may require:");
  ul(["Separate switches", "Remotes", "Control panels", "In every corner of the house."]);
  p("A smart system can bring compatibility:");
  ul(["Lighting", "Climate", "Security", "Other devices", "Into one app or dashboard."]);
  p("Your one command and boom! It can replace various separate actions. That's called convenience with a purpose.");

  h3("Scalability: Adding Devices Over Time");
  p("You do not need to automate the entire house at once.");
  p(
    "A practical approach is to start with high-impact devices. Then gradually add security or climate controls. Later on, introduce sensors and routines. Lastly, expand as your needs and budget grow."
  );

  h2("Smart Home Automation Guide: Getting Started");
  p(
    "Identify the problem first that you want automation to solve. You can start with energy savings, security, convenience, or accessibility."
  );

  h3("Setup Process, Steps Involved:");
  ul([
    "Identify your priorities.",
    "Check Wi-Fi and network coverage.",
    "Choose a compatible ecosystem.",
    "Start with high-impact devices.",
    "Create simple routines.",
    "Test alerts and reliability.",
    "Expand gradually.",
  ]);

  h3("Make the Right Device Choice for Your Home");
  p(
    "You should check device compatibility before buying. Make sure it offers security and software update support, privacy settings, fulfills your installation requirements, has reasonable subscription costs, and offers future expansion options."
  );

  h3("Mistakes to Avoid:");
  p(
    "Never buy devices that can't work together. Don't choose weak Wi-Fi, unnecessary subscriptions, overly complicated products, and products with limited software support."
  );

  h2("Cost of Smart Home Automation");
  p(
    "The cost falls from a few hundred dollars for a basic setup to tens of thousands for a professionally integrated property."
  );

  h3("Cost by System Type");
  blocks.push(`<figure class="wp-block-table"><table>
<thead><tr><th>System Type</th><th>Typical Features</th><th>Estimated Cost in USD</th></tr></thead>
<tbody>
<tr><td>Basic</td><td>Smart lights, plugs, sensors</td><td>200-1,000</td></tr>
<tr><td>Mid-range</td><td>Cameras, locks, thermostat, lighting</td><td>1,000-5,000</td></tr>
<tr><td>Full-home</td><td>Security, climate, lighting, blinds</td><td>5,000-25,000+</td></tr>
</tbody>
</table></figure>`);
  p(
    "<strong>Important:</strong> These costs are estimated and vary from case to case, depending on the factors involved."
  );

  h3("One-Time vs. Subscription Costs:");
  p("You should know what you need to pay one time and what constantly needs money:");
  blocks.push(`<figure class="wp-block-table"><table>
<thead><tr><th>Cost Type</th><th>Examples</th></tr></thead>
<tbody>
<tr><td>One-time</td><td>Devices, hubs, installation, wiring</td></tr>
<tr><td>Recurring</td><td>Cloud storage, monitoring, premium features</td></tr>
<tr><td>Maintenance</td><td>Batteries, replacements, network upgrades</td></tr>
</tbody>
</table></figure>`);

  h3("Factors That Affect Pricing");
  p(
    "The cost has been greatly impacted by the number of rooms, devices, automation rules, and installation requirements you have."
  );

  h3("Home Size & Number of Devices:");
  p(
    "A small apartment requires fewer devices than a large villa with multiple devices. If you live in an apartment, then definitely you need fewer climate zones, cameras, sensors, and lighting scenes."
  );

  h3("Installation vs. DIY:");
  p("These setups can minimize your upfront costs. Professional installation may be better for:");
  ul(["Wired systems", "Complex security setups", "Large properties", "Integrated automation."]);

  h2("Top Smart Home Automation Companies:");
  p(
    "Your budget decides what to choose; the existing devices, privacy preferences, and desired level of automation also play their roles."
  );

  h3("Table to Compare:");
  p("Let's figure out their features, pricing, and why they are best:");
  blocks.push(`<figure class="wp-block-table"><table>
<thead><tr><th>Platform</th><th>Main Strength</th><th>Pricing</th><th>Best For</th></tr></thead>
<tbody>
<tr><td>Google Home</td><td>Broad ecosystem and easy control</td><td>Device-based</td><td>Mainstream users</td></tr>
<tr><td>Amazon Alexa</td><td>Voice-first automation</td><td>Device-based</td><td>Voice control</td></tr>
<tr><td>Apple Home</td><td>Apple integration</td><td>Hardware-based</td><td>Apple households</td></tr>
<tr><td>Samsung SmartThings</td><td>Multi-device management</td><td>Varies by hardware</td><td>Mixed-device homes</td></tr>
<tr><td>Home Assistant</td><td>Local control &amp; customization</td><td>Hardware/support varies.</td><td>Advanced users</td></tr>
</tbody>
</table></figure>`);

  h3("Qualities of a Right Provider for Your Needs:");
  p("Before finalizing, you should ask:");
  ul([
    "Does your system work with my devices?",
    "Can I expand your system later?",
    "Does the system support Matter where relevant?",
    "Does it require a subscription?",
    "How long will it receive security updates?",
    "Can it continue working during internet outages?",
  ]);
  blocks.push(imgBlock(cta, FEATURED_ALT, "3", "/contact/"));

  h2("Is Home Automation Worth It?");
  p("Of course it is if it solves a real problem. The most returns come from lowering energy waste, enhancing security, or making your busy routines easier.");

  h3("Who Benefits Most");
  p(
    "Smart automation can be useful for busy families. Frequent travellers also need an automation system that works in their absence. It's the preferred choice of families with large households, energy-conscious homeowners, and elderly residents. Automation also works well for people with mobility limitations and property owners who need remote monitoring."
  );

  h3("Drawbacks to Consider:");
  p(
    "Besides the perks, smart homes also come with challenges. The privacy concerns, cybersecurity risks, compatibility problems, Wi-Fi dependence, subscription costs, and difficult setup requirements are all areas that need consideration."
  );
  p(
    "To dodge them, you can either use strong passwords or enable multi-factor authentication. Securing your router must be your number one priority, and keep the firmware updated."
  );

  h2("It's Time to Upgrade Your Property Smartly!");
  p(
    "The smart home automation benefits go far beyond controlling lights with your phone. A well-planned smart home can help you reduce energy waste, provide better security and remote monitoring, and enjoy greater convenience and improved accessibility. Its centralised control gives you the power to manage it from anywhere."
  );
  p(
    'Start small and solve one genuine problem first. Then expand. After all, the best smart home does not constantly remind you that it is smart. It simply makes life easier. <a href="/">Connect FM</a> is the reliable name that you can fully trust. We\'ll professionally turn your traditional home into a smart one. Let\'s talk to solve your problem today!'
  );

  h2("FAQs");
  h3("What are the main benefits of smart home automation?");
  p("Smart automation's main benefits include:");
  ul([
    "Energy efficiency",
    "Improved security",
    "Remote monitoring",
    "Convenience",
    "Accessibility",
    "Centralised control",
  ]);

  h3("How much does smart automation cost?");
  p(
    "A basic system may cost you between AED 3,000 for a basic starter kit and AED 250,000+ for a fully integrated luxury villa. The final price depends on property size, wired or wireless automation, and the special system you choose to automate."
  );

  h3("Is automation worth the investment?");
  p(
    "It is worth your investment if it addresses your genuine needs, such as reducing your energy waste, improving your security concerns, saving your time, or supporting your independent living."
  );

  h3("What's the difference between smart automation and a traditional home?");
  p("Traditional homes:");
  ul(["They rely mainly on manual controls."]);
  p("Smart homes:");
  ul(["They allow connected devices to respond automatically."]);

  h3("Which company is best for home automation?");
  p("There is no single best option. You can choose one from them that suits you best:");
  ul(["Google Home", "Amazon Alexa", "Apple Home", "Samsung SmartThings", "Home Assistant"]);
  p("They all serve different users and budgets.");

  h3("Can smart home automation reduce energy bills?");
  p(
    "Smart thermostats, automated lighting, occupancy controls, and energy monitoring can shrink your unnecessary energy use."
  );

  h3("Is home automation safe from hacking?");
  p(
    "It's not completely risk-free. But you can try out strong passwords, multi-factor authentication, regular updates, secure routers, and devices. Make sure to obtain the ongoing security support."
  );

  return `<div id="bsf_rt_marker"></div>\n${blocks.join("\n")}\n`;
}

function faqSchema() {
  const faqs = [
    {
      q: "What are the main benefits of smart home automation?",
      a: "Smart automation's main benefits include energy efficiency, improved security, remote monitoring, convenience, accessibility, and centralised control.",
    },
    {
      q: "How much does smart automation cost?",
      a: "A basic system may cost between AED 3,000 for a starter kit and AED 250,000+ for a fully integrated luxury villa. The final price depends on property size, wired or wireless automation, and the specific systems you choose to automate.",
    },
    {
      q: "Is automation worth the investment?",
      a: "Smart home automation is worth the investment if it addresses your genuine needs, such as reducing energy waste, improving security, saving time, or supporting independent living.",
    },
    {
      q: "What's the difference between smart automation and a traditional home?",
      a: "Traditional homes rely mainly on manual controls, while smart homes allow connected devices to communicate and respond automatically based on user preferences, schedules, sensors, or other triggers.",
    },
    {
      q: "Which company is best for home automation?",
      a: "There is no single best option for home automation. Google Home, Amazon Alexa, Apple Home, Samsung SmartThings, and Home Assistant all serve different users, requirements, and budgets. The best choice depends on your specific needs and the devices you want to integrate.",
    },
    {
      q: "Can smart home automation reduce energy bills?",
      a: "Yes. Smart thermostats, automated lighting, occupancy controls, and energy monitoring can help reduce unnecessary energy use and may lower your energy bills.",
    },
    {
      q: "Is home automation safe from hacking?",
      a: "Smart home automation is not completely risk-free, but you can improve security by using strong passwords, multi-factor authentication, regular software updates, secure routers and devices, and ongoing security support.",
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
      if (depth === 0) contentStart = html.indexOf(">", nextOpen) + 1;
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
    } else {
      hit.count = (hit.count || 0) + 1;
    }
    ids.push(hit.id);
  }
  fs.writeFileSync(TAGS_PATH, JSON.stringify(tags, null, 2) + "\n");
  return ids;
}

/** Keep template title above featured image; strip any legacy below-image title + hide CSS. */
function restoreTitleAboveFeatured(bodyHtml) {
  return bodyHtml.replace(
    /\n?\t*\s*<div class="elementor-element elementor-element-6229posttitle[\s\S]*?<\/div>\s*(?=<div class="elementor-element elementor-element-5ea276d)/,
    "",
  );
}

function ensurePostTitleCss() {
  const cssPath = path.join(ROOT, `public/wp-content/uploads/elementor/css/post-${NEW_ID}.css`);
  if (!fs.existsSync(cssPath)) return;
  let css = fs.readFileSync(cssPath, "utf8");
  const cleaned = css
    .replace(/\.elementor-2619 \.elementor-element\.elementor-element-54bb6bf\{display:none;\}/g, "")
    .replace(/\.elementor-2619 \.elementor-element\.elementor-element-6229posttitle\{[^}]*\}/g, "")
    .replace(
      /\.elementor-2619\.post-6229 \.elementor-element\.elementor-element-6229posttitle[\s\S]*?color:#232932;\}/g,
      "",
    );
  if (cleaned !== css) fs.writeFileSync(cssPath, cleaned);
}

async function refreshExistingPost() {
  for (const [k, v] of Object.entries(SRC)) {
    if (!fs.existsSync(v)) throw new Error(`Missing source image ${k}: ${v}`);
  }

  console.log("Optimizing images from DOCX media...");
  const featured = await writeResponsive(SRC.featured, "Smart-Home-Automation-Benefits");
  const advantages = await writeResponsive(SRC.advantages, "smart-home-automation-advantages");
  const benefits = await writeResponsive(SRC.benefits, "benefits-of-smart-home-automation");
  const cta = await writeResponsive(SRC.cta, "smart-home-automation-benefits-cta");

  const posts = JSON.parse(fs.readFileSync(POSTS_PATH, "utf8"));
  const post = posts.find((p) => p.id === NEW_ID);
  if (!post) throw new Error(`Post ${NEW_ID} not found`);

  const articleHtml = buildArticleContent(featured, advantages, benefits, cta);
  post.content = articleHtml;
  post.featuredImage = featured.url;
  post.modified = NOW;
  if (post.seo) {
    post.seo.ogImage = featured.url;
  }

  let bodyHtml = replaceWidgetContent(
    post.bodyHtml,
    "theme-post-content.default",
    `\n\t\t\t\t\t${articleHtml}\n\t\t\t\t`,
  );

  const featInner = `\n\t\t\t\t\t\t\t<img loading="eager" width="${featured.width}" height="${featured.height}" src="${featured.url}" class="attachment-full size-full wp-image-${NEW_ID}" alt="${escapeHtml(FEATURED_ALT)}" srcset="${featured.srcset}" sizes="(max-width: ${featured.width}px) 100vw, ${featured.width}px" />\t\t\t\t\t\t\t`;
  bodyHtml = replaceWidgetContent(bodyHtml, "theme-post-featured-image.default", featInner);
  bodyHtml = replaceWidgetContent(
    bodyHtml,
    "theme-post-title.default",
    `\n\t\t\t\t\t<h1 class="elementor-heading-title elementor-size-default">${escapeHtml(TITLE)}</h1>\t\t\t\t`,
  );
  bodyHtml = restoreTitleAboveFeatured(bodyHtml);
  ensurePostTitleCss();
  post.bodyHtml = bodyHtml;

  fs.writeFileSync(POSTS_PATH, JSON.stringify(posts, null, 2) + "\n");

  const checks = {
    featuredSrc: bodyHtml.includes(featured.url),
    advantagesLink: articleHtml.includes('href="/security/smart-homes/"'),
    ctaContact: articleHtml.includes('href="/contact/"'),
    homepageLink: articleHtml.includes('<a href="/">Connect FM</a>'),
    noTitleBelowFeatured: !bodyHtml.includes("elementor-element-6229posttitle"),
    titleBeforeFeatured:
      bodyHtml.indexOf("elementor-element-54bb6bf") < bodyHtml.indexOf("elementor-element-aa0ee56"),
    advantagesImg: articleHtml.includes("smart-home-automation-advantages.webp"),
    benefitsImg: articleHtml.includes("benefits-of-smart-home-automation.webp"),
    ctaImg: articleHtml.includes("smart-home-automation-benefits-cta.webp"),
  };
  console.log("VERIFY", checks);
  if (Object.values(checks).some((v) => v === false)) process.exit(1);
  console.log("OK refreshed post", POST_PATH);
}

async function patchExistingPost() {
  await refreshExistingPost();
}

async function main() {
  if (process.argv.includes("--patch-existing") || process.argv.includes("--refresh-existing")) {
    await refreshExistingPost();
    return;
  }

  for (const [k, v] of Object.entries(SRC)) {
    if (!fs.existsSync(v)) throw new Error(`Missing source image ${k}: ${v}`);
  }

  console.log("Optimizing images...");
  const featured = await writeResponsive(SRC.featured, "Smart-Home-Automation-Benefits");
  const advantages = await writeResponsive(SRC.advantages, "smart-home-automation-advantages");
  const benefits = await writeResponsive(SRC.benefits, "benefits-of-smart-home-automation");
  const cta = await writeResponsive(SRC.cta, "smart-home-automation-benefits-cta");

  const articleHtml = buildArticleContent(featured, advantages, benefits, cta);
  const posts = JSON.parse(fs.readFileSync(POSTS_PATH, "utf8"));
  if (posts.some((p) => p.slug === SLUG || p.id === NEW_ID)) {
    throw new Error(`Post already exists for slug ${SLUG} or id ${NEW_ID}`);
  }

  const template = posts.find((p) => p.id === 6128);
  if (!template) throw new Error("template post 6128 missing");

  let bodyHtml = template.bodyHtml;
  bodyHtml = bodyHtml.replace(/post-6128/g, `post-${NEW_ID}`);
  bodyHtml = bodyHtml.replace(
    /class="elementor elementor-2619 elementor-location-single post-\d+ post type-post status-publish format-standard has-post-thumbnail hentry[^"]*"/,
    `class="elementor elementor-2619 elementor-location-single post-${NEW_ID} post type-post status-publish format-standard has-post-thumbnail hentry category-security-smart-systems tag-smart-home-automation-benefits"`
  );

  const featInner = `\n\t\t\t\t\t\t\t<img loading="eager" width="${featured.width}" height="${featured.height}" src="${featured.url}" class="attachment-full size-full wp-image-${NEW_ID}" alt="${escapeHtml(FEATURED_ALT)}" srcset="${featured.srcset}" sizes="(max-width: ${featured.width}px) 100vw, ${featured.width}px" />\t\t\t\t\t\t\t`;
  bodyHtml = replaceWidgetContent(bodyHtml, "theme-post-featured-image.default", featInner);
  bodyHtml = replaceWidgetContent(
    bodyHtml,
    "theme-post-title.default",
    `\n\t\t\t\t\t<h1 class="elementor-heading-title elementor-size-default">${escapeHtml(TITLE)}</h1>\t\t\t\t`
  );
  bodyHtml = bodyHtml.replace(
    /<h1 class="elementor-heading-title elementor-size-default">[\s\S]*?<\/h1>/,
    `<h1 class="elementor-heading-title elementor-size-default">${escapeHtml(TITLE)}</h1>`
  );
  bodyHtml = replaceWidgetContent(bodyHtml, "theme-post-content.default", `\n\t\t\t\t\t${articleHtml}\n\t\t\t\t`);

  bodyHtml = bodyHtml.replace(
    /breadcrumb_blog[\s\S]{0,2500}?Guide to Security Guard Services in Dubai/,
    (m) => m.replace("Guide to Security Guard Services in Dubai", TITLE)
  );
  bodyHtml = bodyHtml.replace(
    /(breadcrumb_blog[\s\S]{0,2500}?)\/guide-to-security-guard-services-in-dubai\//,
    `$1${POST_PATH}`
  );

  const cssSrc = path.join(ROOT, "public/wp-content/uploads/elementor/css/post-6128.css");
  const cssDest = path.join(ROOT, `public/wp-content/uploads/elementor/css/post-${NEW_ID}.css`);
  if (fs.existsSync(cssSrc)) {
    let css = fs.readFileSync(cssSrc, "utf8");
    css = css.replaceAll("6128", String(NEW_ID));
    fs.writeFileSync(cssDest, css);
  }

  const tagIds = ensureTags([
    { name: "smart home automation benefits", slug: "smart-home-automation-benefits" },
  ]);

  const pageCss = (template.pageCss || []).map((u) =>
    u.includes("post-6128.css") ? `/wp-content/uploads/elementor/css/post-${NEW_ID}.css` : u
  );
  if (!pageCss.includes(`/wp-content/uploads/elementor/css/post-${NEW_ID}.css`)) {
    pageCss.push(`/wp-content/uploads/elementor/css/post-${NEW_ID}.css`);
  }

  const entry = {
    id: NEW_ID,
    type: "post",
    slug: SLUG,
    path: POST_PATH,
    link: `https://connectfm.ae${POST_PATH}`,
    title: TITLE,
    content: articleHtml,
    bodyHtml,
    excerpt: META_DESC.slice(0, 240),
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
      canonical: POST_PATH,
      ogImage: featured.url,
      robots: { index: "index", follow: "follow" },
      schemas: [faqSchema()],
    },
  };

  posts.unshift(entry);
  fs.writeFileSync(POSTS_PATH, JSON.stringify(posts, null, 2) + "\n");

  const checks = {
    slug: entry.slug,
    featuredAlt: bodyHtml.includes(`alt="${FEATURED_ALT}"`),
    advantagesLink: bodyHtml.includes('href="/security/smart-homes/"'),
    ctaContact: /href="\/contact\/"[\s\S]{0,300}smart-home-automation-benefits-cta/i.test(bodyHtml),
    docxSnippet: bodyHtml.includes("Many individuals leave home in a rush"),
    faqPresent: bodyHtml.includes("What are the main benefits of smart home automation?"),
    tables: (articleHtml.match(/wp-block-table/g) || []).length === 3,
  };
  console.log("VERIFY", checks);
  if (Object.values(checks).some((v) => v === false)) process.exit(1);
  console.log("OK published", POST_PATH);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
