/**
 * Create Connect FM blog post from
 * Facial Recognition Access Control System_ Complete 2026 Guide.docx
 * Images: DOCX media (featured = image1; CTA = image2 → /contact/; process = image3)
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const UPLOAD_DIR = path.join(ROOT, "public/wp-content/uploads/2026/09");
const MEDIA_DIR = path.join(ROOT, "scripts/_tmp-facial-docx-media");
const POSTS_PATH = path.join(ROOT, "src/data/posts.json");
const TAGS_PATH = path.join(ROOT, "src/data/tags.json");

const NEW_ID = 6230;
const SLUG = "facial-recognition-access-control-system";
const POST_PATH = `/${SLUG}/`;
const TITLE = "Facial Recognition Access Control System";
const META_TITLE = "Facial Recognition Access Control Systems UAE | 2026 Guide";
const META_DESC =
  "Compare facial recognition access control systems, costs, and benefits for UAE offices and buildings. PDPL-compliant options, 2026 guide.";
const FEATURED_ALT = "facial recognition access control";
const CTA_ALT = "facial recognition access control systems";
const PROCESS_ALT = "facial recognition access";
const AUTHOR_ID = 10;
const AUTHOR_NAME = "Francisco";
const AUTHOR_SLUG = "francisco";
const CATEGORY_ID = 26; // Security & Smart Systems
const NOW = "2026-09-08T12:00:00";
const TEMPLATE_ID = 6229;

const SRC = {
  featured: path.join(MEDIA_DIR, "image1.jpeg"),
  cta: path.join(MEDIA_DIR, "image2.jpeg"),
  process: path.join(MEDIA_DIR, "image3.jpeg"),
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
  const inner = linkHref ? `<a href="${linkHref}">${tag}</a>` : tag;
  return `<p style="text-align:center;">${inner}</p>`;
}

function buildArticleContent(processImg, cta) {
  const blocks = [];
  const p = (html) => blocks.push(`<p>${html}</p>`);
  const ul = (items) =>
    blocks.push(`<ul>\n${items.map((item) => `<li>${item}</li>`).join("\n")}\n</ul>`);
  const ol = (items) =>
    blocks.push(`<ol>\n${items.map((item) => `<li>${item}</li>`).join("\n")}\n</ol>`);
  const h2 = (t) => blocks.push(`<h2>${escapeHtml(t)}</h2>`);
  const h3 = (t) => blocks.push(`<h3>${escapeHtml(t)}</h3>`);
  const h4 = (t) => blocks.push(`<h4>${escapeHtml(t)}</h4>`);

  p(
    "An employee walking into your Dubai office without reaching for a card. He doesn't enter a PIN or touch a fingerprint scanner. The camera recognizes the person as your employee, checks your permission, and unlocks the door in seconds.",
  );
  p("That's the practical appeal of facial recognition access control.");
  p(
    'Technology is moving beyond novelty. Modern systems combine AI-powered face matching, access permissions, and integration with <a href="/security/">security system</a> platforms.',
  );
  p(
    "But convenience isn't enough to assure you that the business is in safe hands. You must also consider accuracy, data security, and privacy requirements.",
  );
  p("To deep dive, we've written this guide.");
  p("In which we disclose:");
  ul([
    "How facial recognition systems work",
    "What they cost you",
    "When they make sense.",
  ]);

  h2("What's Facial Recognition Access Control?");
  p(
    "The system uses a camera and biometric software to verify a person's identity before they enter. It eliminates the traditional process of presenting a card or using a fingerprint at the entrance.",
  );
  p(
    "The system compares the captured facial features with an authorized profile, and according to that, it makes an access decision.",
  );

  h3("How a Facial Recognition Door Access System Works");
  p("The process is simple from every angle. Find out how it works.");
  ol([
    "<strong>Face capture:</strong> A camera captures your worker's face, who stands in front of it.",
    "<strong>Face analysis:</strong> AI software identifies facial features.",
    "<strong>Identity matching:</strong> The system compares those features with an authorised database.",
    "<strong>Security check:</strong> Anti-spoofing technology can determine if the face belongs to a real person.",
    "<strong>Access decision:</strong> The controller checks the permissions to be granted or not.",
    "<strong>Door release:</strong> The electronic lock opens if authorized.",
    "<strong>Event logging:</strong> The system records the access event for security or attendance purposes.",
  ]);

  h3("Key Components:");
  p(
    "A reliable system combines three core elements. The camera captures the user's face under different lighting conditions. AI software converts facial information into a biometric representation and performs matching. The database stores authorised user profiles and access permissions.",
  );
  p("The setup may also include:");
  ul([
    "Access controller",
    "Electronic lock",
    "Exit button",
    "Network connection",
    '<a href="/cctv-camera-installation-dubai/">CCTV</a>',
    "Software",
  ]);
  blocks.push(imgBlock(cta, CTA_ALT, "2", "/contact/"));

  h2("PROs of Facial Recognition Access Control");
  p(
    "The face becomes the credential, which is the biggest advantage you get. That means no card and no forgotten PIN are needed.",
  );

  h3("Security Benefits:");
  h4("Reduced Unauthorized Access:");
  p(
    "Cards can be borrowed or can be obtained through theft. PINs can be shared, and keys can be copied. It's an alarming situation!",
  );
  p(
    "A facial recognition access system ties the access attempt to the individual, not a physical credential. Administrators can also assign permissions by:",
  );
  ul(["Employee", "Department", "Door", "Location", "Time."]);

  h4("Anti-Spoofing &amp; Liveness Detection:");
  p(
    "Facial recognition should never rely on basic image matching. Attackers can attempt to present photographs. They can either use digital images or other artificial representations. NIST identifies these attempts as presentation attacks and evaluates technologies designed to detect them. Liveness detection determines whether the system is seeing a real person.",
  );
  p(
    "Willing to buy a system? Clear some queries in your mind. Ask about passive liveness detection and photo and video spoof resistance. Inquire about mask handling, low-light performance, and false acceptance and rejection rates.",
  );

  h3("Operational Benefits:");
  h4("Faster Entry for High-Traffic Buildings:");
  p(
    "Picture a nine a.m. rush at a corporate tower. Many employees arrive within minutes, and searching for access cards creates friction. Fingerprint scanners create queues when users repeatedly reposition their fingers. A properly configured facial recognition access system can make the interaction almost invisible.",
  );

  h4("Lower Long-Term Admin Cost:");
  p(
    "Physical credentials create an ongoing burden. Especially in a situation where your employees lose cards. Sometimes, contractors need temporary access, and old cards need deactivation, while new cards need issuing.",
  );
  p(
    "The system removes much of that routine. The initial investment can be higher than a basic card reader. Never make your decision by looking at price. You should compare ownership's total cost. Don't focus only on the purchase price.",
  );

  h3("Health &amp; Hygiene Benefits:");
  p("A facial recognition access system requires no physical contact.");
  p(
    "That matters in high-traffic environments such as offices, residential buildings, healthcare facilities, and shared workspaces.",
  );
  p(
    "Touchless entry also creates a smoother user experience. People can move through the entrance without touching a reader or searching through their pockets for a card.",
  );

  h2("Facial Recognition Access Control vs. Other Access Systems");
  p(
    "Every access method has strengths. The right choice depends on the building, risk level, budget, and privacy requirements.",
  );
  blocks.push(`<figure class="wp-block-table"><table><thead><tr>
<th>Feature</th><th>Facial Recognition</th><th>Fingerprint</th><th>Card/Key Access</th>
</tr></thead><tbody>
<tr><td>Touchless entry</td><td>Yes</td><td>No</td><td>Yes</td></tr>
<tr><td>Lost credential risk</td><td>Low</td><td>Low</td><td>High</td></tr>
<tr><td>Credential sharing</td><td>Difficult</td><td>Difficult</td><td>Possible</td></tr>
<tr><td>Hygiene</td><td>Excellent</td><td>Lower</td><td>Good</td></tr>
<tr><td>User convenience</td><td>High</td><td>Medium</td><td>High</td></tr>
<tr><td>Spoofing protection</td><td>Depends on liveness technology</td><td>Depends on sensor</td><td>Depends on card security</td></tr>
<tr><td>Replacement cost</td><td>Low after enrollment</td><td>Low</td><td>Ongoing card/key cost</td></tr>
<tr><td>Privacy considerations</td><td>High</td><td>High</td><td>Lower</td></tr>
<tr><td>Best suited for</td><td>High-security, high-traffic areas</td><td>Controlled environments</td><td>Cost-sensitive deployments</td></tr>
</tbody></table></figure>`);

  h3("Facial Recognition vs. Fingerprint");
  p(
    "Fingerprint systems require physical contact and can struggle with dirty, wet, or damaged fingers.",
  );
  p(
    "Facial recognition works without touching the reader. It can also create a smoother experience for users moving through busy entrances.",
  );
  p(
    "However, facial systems require stronger attention to camera positioning, lighting, privacy, and spoofing controls.",
  );

  h3("Facial Recognition vs. Card/Key Access");
  p("Cards remain simple and affordable.");
  p(
    "They also offer one major advantage: businesses can replace a lost card without changing a person's biometric profile.",
  );
  p("However, cards can be lost, stolen, shared, or forgotten.");
  p("Facial recognition removes that physical credential from the equation.");

  // DOCX places process infographic (image3) immediately above this H2
  blocks.push(imgBlock(processImg, PROCESS_ALT, "1", null));
  h2("Where Facial Recognition Access Control Systems Are Used in the UAE");
  h3("Corporate Offices");
  p("UAE businesses can use facial recognition for:");
  ul([
    "Main entrances",
    "Executive areas",
    "Server rooms",
    "Restricted departments",
    "Attendance tracking",
    "Visitor management",
  ]);
  p(
    "Integration with HR systems can also connect access events with employee records and attendance workflows.",
  );

  h3("Residential Towers and Gated Communities");
  p(
    "High-rise buildings and gated communities can use facial recognition for residents, staff, contractors, and approved visitors.",
  );
  p(
    "The experience is particularly attractive where residents already expect smart-building services.",
  );

  h3("Government and Critical Infrastructure");
  p("Sensitive facilities require stronger identity verification and detailed access records.");
  p(
    "Facial recognition can support controlled zones, security checkpoints, and restricted facilities. However, these deployments require careful governance, security controls, and compliance processes.",
  );

  h2("Cost of a Facial Recognition Access Control System in the UAE");
  p(
    "There is no single UAE price. The final cost depends on the reader, number of doors, software, integrations, locks, installation, networking, and maintenance.",
  );

  h3("Hardware Cost Range");
  p(
    "Entry and mid-range facial recognition terminals can cost around 400 to 2500 dirhams. Enterprise-grade devices can reach five thousand dirhams or more based on capabilities. One UAE security provider gives indicative ranges of four hundred to nine hundred dirhams for entry-level systems. On the other side, 1000 to 2500 dirhams for mid-range systems and two thousand to over five thousand dirhams for enterprise devices.",
  );

  h3("Installation &amp; Software Licensing");
  p(
    "Hardware represents only the project's part. Your quotation may also include electronic locks, door controllers, exit switches, power supplies, cabling and networking, software licenses, user enrollment, CCTV and HR integration, visitor management, and annual maintenance.",
  );

  h3("Factors That Affect Total Cost:");
  p(
    "Expect the price to increase when you need more doors, more users, outdoor-rated hardware, higher security levels, multi-factor authentication, cloud management, CCTV integration, HR/payroll integration, visitor management, advanced reporting, and lasting maintenance.",
  );

  h2("Is Facial Recognition Access Control Safe &amp; Compliant?");
  p("It can be secure, but you must design the system responsibly.");

  h3("UAE PDPL &amp; Data Privacy Requirements:");
  p(
    "UAE's Federal Decree-Law classifies biometric data as sensitive personal data. Facial images used for identification can trigger huge privacy considerations.",
  );
  p(
    "The law also gives individuals rights concerning their personal data. They have the right to ask for and access the information collected for processing purposes. Employers are obliged to provide them with details of how long the data is stored and shared.",
  );
  p(
    "You should, as a responsible business owner, therefore establish a clear purpose for collecting facial data. Provide them with appropriate legal grounds for processing, transparent employee or resident notices, and defined retention periods. It's your duty to clear every doubt regarding access restrictions, strong security controls, and procedures for handling data requests and incidents.",
  );

  h3("How Facial Data Is Stored &amp; Protected?");
  p("You should ask your vendor upfront what happens after enrollment.");
  p("Good questions include:");
  ul([
    "Is the biometric template encrypted?",
    "Is raw facial imagery retained?",
    "Where's the data stored?",
    "Can the vendor access it remotely?",
    "Is the system cloud-based or on-premise?",
    "What happens when a worker leaves?",
    "How long does the system retain records?",
    "How are backups protected?",
  ]);
  p(
    "Privacy should be designed into the system from day one. NIST guidance also highlights privacy-by-design considerations.",
  );

  h2("Criteria To Choose a Facial Recognition Access Control System:");
  p(
    "Don't buy based on camera resolution or a flashy product demo. Practicality outperforms a shine that fades away. Test the system where it will actually operate.",
  );

  h3("Questions to Ask Your Vendor");
  p("Ask:");
  ul([
    "How fast does recognition occur?",
    "What anti-spoofing technology does it use?",
    "Does liveness detection work by itself?",
    "How does it perform in UAE lighting conditions?",
    "Can it recognise users wearing glasses or masks?",
    "How many users can it support?",
    "What happens if the network goes offline?",
    "Where does it store biometric data?",
    "What're the licensing costs?",
    "Does the vendor provide local support?",
    "Can the system integrate with CCTV and HR software?",
  ]);

  h3("Integration With Your Security Infrastructure:");
  p(
    "The strongest systems rarely operate alone. They work best when integrating with another security infrastructure. You can integrate it with your CCTV, door controllers, visitor management, HR software, attendance systems, and alarm systems.",
  );

  h2("Conclusion:");
  p(
    'The future of <a href="/security/access-control/">access control systems</a> is becoming less about what you carry and more about who you are.',
  );
  p(
    "Facial recognition has gained popularity across businesses of all sizes. They are very much obsessed with the benefits it delivers, including faster entry, touchless authentication, stronger identity verification, and simpler credential management.",
  );
  p("But technology alone does not create security!");
  p(
    "The best facial recognition access control systems combine accurate recognition with anti-spoofing. It works best if it offers secure data handling, maintains access policies, and has responsible privacy practices.",
  );
  p(
    'Every smart employer today is more interested in "Can this system protect our people, premises, and biometric data at the same time?" Rather than "How quickly can this system recognise a face?"',
  );
  p(
    'Partner with the <a href="/">Connect FM</a> team to install a system that has an answer to this question. Hiring them means your business is in safe hands!',
  );

  h2("FAQs");
  h3("What's a facial recognition access control system?");
  p(
    "It is a biometric security system that verifies a person's face before granting access. Usually installed outside a door, gate, room, or restricted area.",
  );
  h3("How much does a facial recognition access control system cost in the UAE?");
  p(
    "Hardware can range from four hundred to over five thousand dirhams per terminal. It depends on capabilities. The other costs that add to the total project cost are:",
  );
  ul(["Installation", "Locks", "Software", "Integrations", "Maintenance"]);
  h3("Is facial recognition access control safe and private?");
  p(
    "It is safe when the system uses strong security, liveness detection, retention policies, and processes aligned with data protection requirements.",
  );
  h3("Does facial recognition access control work with masks or glasses?");
  p(
    "Some modern systems support masks and glasses. Performance changes by device. It's best to always test the exact model under your real operating conditions before making a purchase.",
  );
  h3("What's the difference between facial recognition and fingerprint access control?");
  p(
    "<strong>Facial recognition:</strong> It provides touchless verification.<br><strong>Fingerprint systems:</strong> They require physical contact.<br>Both can provide strong security. Their performance, privacy, and environmental requirements differ from each other.",
  );
  h3("Can facial recognition access control integrate with CCTV and HR systems?");
  p(
    "Many modern systems now support integration with security, attendance, and HR platforms. Must confirm the software compatibility with your infrastructure before purchasing.",
  );

  return blocks.join("\n");
}

function faqSchema() {
  const faqs = [
    {
      q: "What's a facial recognition access control system?",
      a: "It is a biometric security system that verifies a person's face before granting access. Usually installed outside a door, gate, room, or restricted area.",
    },
    {
      q: "How much does a facial recognition access control system cost in the UAE?",
      a: "Hardware can range from four hundred to over five thousand dirhams per terminal. It depends on capabilities. Other costs that add to the total project cost include installation, locks, software, integrations, and maintenance.",
    },
    {
      q: "Is facial recognition access control safe and private?",
      a: "It is safe when the system uses strong security, liveness detection, retention policies, and processes aligned with data protection requirements.",
    },
    {
      q: "Does facial recognition access control work with masks or glasses?",
      a: "Some modern systems support masks and glasses. Performance varies by device. It's best to test the exact model under your real operating conditions before making a purchase.",
    },
    {
      q: "What's the difference between facial recognition and fingerprint access control?",
      a: "Facial recognition provides touchless verification, while fingerprint systems require physical contact. Both can provide strong security, but their performance, privacy, and environmental requirements differ.",
    },
    {
      q: "Can facial recognition access control integrate with CCTV and HR systems?",
      a: "Many modern systems support integration with security, attendance, and HR platforms. You should confirm software compatibility with your existing infrastructure before purchasing.",
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

function articleSchema(featuredUrl) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://connectfm.ae${POST_PATH}`,
    },
    headline: TITLE,
    description: META_DESC,
    image: `https://connectfm.ae${featuredUrl}`,
    author: {
      "@type": "Person",
      name: AUTHOR_NAME,
      url: `https://connectfm.ae/author/${AUTHOR_SLUG}/`,
    },
    publisher: {
      "@type": "Organization",
      name: "Connect FM",
      logo: {
        "@type": "ImageObject",
        url: "https://connectfm.ae/wp-content/uploads/2023/08/Connect-FM-Logo.svg",
      },
    },
    datePublished: "2026-09-08",
    dateModified: "2026-09-08",
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

/** Remove template leftover title widgets placed after the featured image. */
function stripAfterFeaturedTitleWidgets(bodyHtml) {
  for (const dataId of [`${TEMPLATE_ID}posttitle`, `${NEW_ID}posttitle`]) {
    const marker = `data-id="${dataId}"`;
    const markerIdx = bodyHtml.indexOf(marker);
    if (markerIdx < 0) continue;
    const openIdx = bodyHtml.lastIndexOf("<div", markerIdx);
    let i = openIdx;
    let depth = 0;
    let end = -1;
    while (i < bodyHtml.length) {
      const nextOpen = bodyHtml.indexOf("<div", i);
      const nextClose = bodyHtml.indexOf("</div>", i);
      if (nextClose < 0) break;
      if (nextOpen >= 0 && nextOpen < nextClose) {
        depth++;
        i = nextOpen + 4;
      } else {
        depth--;
        if (depth === 0) {
          end = nextClose + 6;
          break;
        }
        i = nextClose + 6;
      }
    }
    if (end > 0) {
      let after = end;
      while (after < bodyHtml.length && /[\s\n\r\t]/.test(bodyHtml[after])) after++;
      bodyHtml = bodyHtml.slice(0, openIdx) + bodyHtml.slice(after);
    }
  }
  return bodyHtml;
}

function ensureCanonicalTitleCss() {
  const targets = [
    path.join(ROOT, `public/wp-content/uploads/elementor/css/post-${NEW_ID}.css`),
    path.join(ROOT, `dist/client/wp-content/uploads/elementor/css/post-${NEW_ID}.css`),
  ];
  for (const cssPath of targets) {
    if (!fs.existsSync(cssPath)) continue;
    let css = fs.readFileSync(cssPath, "utf8");
    // Never hide the above-image title (54bb6bf) — that is the site standard.
    css = css.replace(
      /\.elementor-2619 \.elementor-element\.elementor-element-54bb6bf\{display:none;\}/g,
      "",
    );
    css = css.replace(
      new RegExp(
        `\\.elementor-2619 \\.elementor-element\\.elementor-element-${NEW_ID}posttitle\\{padding:0 0 1\\.5rem 0;\\}`,
        "g",
      ),
      "",
    );
    css = css.replace(
      new RegExp(
        `\\.elementor-2619\\.post-${NEW_ID} \\.elementor-element\\.elementor-element-${NEW_ID}posttitle \\.elementor-heading-title,\\.elementor-2619 \\.post-${NEW_ID} \\.elementor-element\\.elementor-element-${NEW_ID}posttitle \\.elementor-heading-title\\{[^}]*\\}`,
        "g",
      ),
      "",
    );
    fs.writeFileSync(cssPath, css);
  }
}

async function main() {
  for (const [k, v] of Object.entries(SRC)) {
    if (!fs.existsSync(v)) throw new Error(`Missing source image ${k}: ${v}`);
  }

  console.log("Optimizing DOCX images...");
  const featured = await writeResponsive(SRC.featured, "Facial-Recognition-Access-Control-System");
  const processImg = await writeResponsive(SRC.process, "facial-recognition-door-access-how-it-works");
  const cta = await writeResponsive(SRC.cta, "facial-recognition-access-control-systems-cta");

  const articleHtml = buildArticleContent(processImg, cta);
  const posts = JSON.parse(fs.readFileSync(POSTS_PATH, "utf8"));
  if (posts.some((p) => p.slug === SLUG || p.id === NEW_ID)) {
    throw new Error(`Post already exists for slug ${SLUG} or id ${NEW_ID}`);
  }

  const template = posts.find((p) => p.id === TEMPLATE_ID) || posts.find((p) => p.id === 6128);
  if (!template?.bodyHtml) throw new Error("template post missing");

  let bodyHtml = template.bodyHtml;
  bodyHtml = bodyHtml.replace(new RegExp(`post-${template.id}`, "g"), `post-${NEW_ID}`);
  bodyHtml = bodyHtml.replace(
    /class="elementor elementor-2619 elementor-location-single post-\d+ post type-post status-publish format-standard has-post-thumbnail hentry[^"]*"/,
    `class="elementor elementor-2619 elementor-location-single post-${NEW_ID} post type-post status-publish format-standard has-post-thumbnail hentry category-security-smart-systems tag-facial-recognition-access-control"`,
  );

  const featInner = `\n\t\t\t\t\t\t\t<img loading="eager" width="${featured.width}" height="${featured.height}" src="${featured.url}" class="attachment-full size-full wp-image-${NEW_ID}" alt="${escapeHtml(FEATURED_ALT)}" srcset="${featured.srcset}" sizes="(max-width: ${featured.width}px) 100vw, ${featured.width}px" />\t\t\t\t\t\t\t`;
  bodyHtml = replaceWidgetContent(bodyHtml, "theme-post-featured-image.default", featInner);
  bodyHtml = replaceWidgetContent(
    bodyHtml,
    "theme-post-title.default",
    `\n\t\t\t\t\t<h1 class="elementor-heading-title elementor-size-default">${escapeHtml(TITLE)}</h1>\t\t\t\t`,
  );
  bodyHtml = bodyHtml.replace(
    /<h1 class="elementor-heading-title elementor-size-default">[\s\S]*?<\/h1>/g,
    `<h1 class="elementor-heading-title elementor-size-default">${escapeHtml(TITLE)}</h1>`,
  );
  bodyHtml = replaceWidgetContent(
    bodyHtml,
    "theme-post-content.default",
    `\n\t\t\t\t\t${articleHtml}\n\t\t\t\t`,
  );
  // Template 6229 has a title-after-image hack; strip it so title stays above featured.
  bodyHtml = stripAfterFeaturedTitleWidgets(bodyHtml);

  // Breadcrumb label/path cleanup (best-effort)
  bodyHtml = bodyHtml.replace(
    /(breadcrumb_blog[\s\S]{0,2500}?)\/[a-z0-9-]+\//,
    `$1${POST_PATH}`,
  );

  const cssSrc = path.join(
    ROOT,
    `public/wp-content/uploads/elementor/css/post-${template.id}.css`,
  );
  const cssDest = path.join(ROOT, `public/wp-content/uploads/elementor/css/post-${NEW_ID}.css`);
  if (fs.existsSync(cssSrc)) {
    let css = fs.readFileSync(cssSrc, "utf8");
    css = css.replaceAll(String(template.id), String(NEW_ID));
    fs.writeFileSync(cssDest, css);
  }
  ensureCanonicalTitleCss();

  const tagIds = ensureTags([
    { name: "facial recognition access control", slug: "facial-recognition-access-control" },
  ]);

  const pageCss = (template.pageCss || []).map((u) =>
    u.includes(`post-${template.id}.css`)
      ? `/wp-content/uploads/elementor/css/post-${NEW_ID}.css`
      : u,
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
      schemas: [articleSchema(featured.url), faqSchema()],
    },
  };

  posts.unshift(entry);
  fs.writeFileSync(POSTS_PATH, JSON.stringify(posts, null, 2) + "\n");

  const checks = {
    slug: entry.slug,
    featuredAlt: bodyHtml.includes(`alt="${FEATURED_ALT}"`),
    ctaContact: bodyHtml.includes('href="/contact/"') && bodyHtml.includes(cta.url),
    processImg: bodyHtml.includes(processImg.url),
    securityLink: bodyHtml.includes('href="/security/"'),
    accessControlLink: bodyHtml.includes('href="/security/access-control/"'),
    faqPresent: bodyHtml.includes("What's a facial recognition access control system?"),
    table: (articleHtml.match(/wp-block-table/g) || []).length === 1,
  };
  console.log("VERIFY", checks);
  if (Object.values(checks).some((v) => v === false)) process.exit(1);
  console.log("OK created", POST_PATH, featured.url);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
