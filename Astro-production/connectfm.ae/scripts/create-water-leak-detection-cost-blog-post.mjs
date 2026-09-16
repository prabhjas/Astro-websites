/**
 * Create Connect FM blog post from
 * Water Leak Detection Cost in Dubai (2026 Price Guide).docx
 * Images: DOCX media
 *   featured = image1
 *   cost methods = image2 → /plumbing/leak-detection/
 *   multi-method = image3
 *   CTA = image4 → /contact/
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const UPLOAD_DIR = path.join(ROOT, "public/wp-content/uploads/2026/09");
const MEDIA_DIR = path.join(ROOT, "scripts/_tmp-water-leak-docx/word/media");
const POSTS_PATH = path.join(ROOT, "src/data/posts.json");
const TAGS_PATH = path.join(ROOT, "src/data/tags.json");

const NEW_ID = 6231;
const SLUG = "water-leak-detection-cost";
const POST_PATH = `/${SLUG}/`;
const TITLE = "Water Leak Detection Cost in Dubai (2026 Price Guide)";
const META_TITLE = "Water Leak Detection Cost in Dubai (2026 Price Guide)";
const META_DESC =
  "Water leak detection cost in Dubai: real price ranges by method, what affects cost, and how to avoid overpaying. Updated for 2026.";
const FEATURED_ALT = "water leak detection cost";
const COST_IMG_ALT = "cost of water leak detection";
const SERVICE_IMG_ALT = "cost of water leak detection service";
const CTA_ALT = "water leak detection service cost";
const AUTHOR_ID = 10;
const AUTHOR_NAME = "Francisco";
const AUTHOR_SLUG = "francisco";
const CATEGORY_ID = 28; // Property Maintenance Tips
const NOW = "2026-09-14T12:00:00";
const TEMPLATE_ID = 6230;

const SRC = {
  // Preferred featured image (Downloads PNG); falls back to DOCX image1
  featured: fs.existsSync("C:\\Users\\DELL\\Downloads\\water-leak-detection-cost.png")
    ? "C:\\Users\\DELL\\Downloads\\water-leak-detection-cost.png"
    : path.join(MEDIA_DIR, "image1.jpg"),
  cost: path.join(MEDIA_DIR, "image2.jpg"),
  service: path.join(MEDIA_DIR, "image3.jpg"),
  cta: path.join(MEDIA_DIR, "image4.jpg"),
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

function buildArticleContent(costImg, serviceImg, cta) {
  const blocks = [];
  const p = (html) => blocks.push(`<p>${html}</p>`);
  const ul = (items) =>
    blocks.push(`<ul>\n${items.map((item) => `<li>${item}</li>`).join("\n")}\n</ul>`);
  const h2 = (t) => blocks.push(`<h2>${escapeHtml(t)}</h2>`);
  const h3 = (t) => blocks.push(`<h3>${escapeHtml(t)}</h3>`);
  const h4 = (t) => blocks.push(`<h4>${escapeHtml(t)}</h4>`);

  p(
    "Water leak detection cost in Dubai range from around AED 200 to AED 400 for a basic residential inspection and can reach AED 1,500 or more for a full property survey. Advanced methods such as thermal imaging, acoustic testing, pressure testing, CCTV inspection, and tracer gas detection cost more. The final price depends on the property, leak location, access, and methods required.",
  );

  h2("How Much Does Water Leak Detection Cost in Dubai?");
  p(
    '<a href="/water-leak-detection-system-in-dubai/">Water leak detection in Dubai</a> costs AED 200 to AED 1,500 for residential and standard property investigations, depending on the detection method and complexity.',
  );
  p(
    "Basic detection starts around AED 200, whereas thermal imaging can cost AED 350 to AED 700, and comprehensive multi-method surveys can reach AED 1,500 or more.",
  );
  blocks.push(imgBlock(costImg, COST_IMG_ALT, "2", "/plumbing/leak-detection/"));

  h3("Quick Answer Summary Box");
  blocks.push(`<figure class="wp-block-table"><table><thead><tr>
<th>Service</th><th>Estimated Dubai Price (in AED)</th>
</tr></thead><tbody>
<tr><td>Basic leak detection</td><td>200 to 400</td></tr>
<tr><td>Thermal imaging</td><td>350 to 700</td></tr>
<tr><td>Acoustic detection</td><td>500 to 900</td></tr>
<tr><td>CCTV pipe inspection</td><td>400 to 900</td></tr>
<tr><td>Pressure testing</td><td>150 to 500</td></tr>
<tr><td>Tracer gas detection</td><td>500 to 1,200</td></tr>
<tr><td>Full property survey</td><td>800 to 1,500+</td></tr>
<tr><td>Emergency detection</td><td>300 to 800</td></tr>
</tbody></table></figure>`);
  p(
    "These are estimated prices. Some providers quote much higher prices for specialist investigations, particularly where several detection technologies, engineering reports, or difficult access are involved.",
  );

  h3("Site Visit vs. Full Detection Fee: What's the Difference?");
  p(
    "A site visit fee usually covers the technician's arrival, initial visual assessment, moisture readings or basic testing, and an evaluation of what needs to happen next. It does not necessarily include advanced leak detection.",
  );
  p("For example:");
  p(
    "Some Dubai providers advertise an engineer site visit from AED 150 plus VAT, followed by separate charges for thermal or acoustic testing. Whereas, others bundle the initial inspection into the detection price or waive it when you proceed with the repair.",
  );
  p("Before booking, ask if the quoted amount includes the following:");
  ul([
    "Site attendance",
    "Moisture or pressure testing",
    "Detection equipment",
    "Leak location",
    "Written report",
    "VAT",
    "Emergency or after-hours charges",
  ]);

  h2("Cost of Water Leak Detection by Method");
  p(
    'A visible leak under a sink is a very different investigation from a suspected pipe leak beneath a concrete slab. That\'s why it\'s important to consider which method is used to <a href="/how-to-stop-water-leakage/">stop the water leakage</a>.',
  );

  h3("Thermal Imaging Detection Cost");
  p(
    "Thermal imaging costs around AED 350 to AED 700 for a standard scan in Dubai. Some specialist providers quote AED 750 or more for thermal detection when the service includes moisture mapping or a detailed engineering assessment.",
  );
  p(
    "A thermal camera detects temperature differences across surfaces. This can help identify areas affected by water movement behind walls, ceilings, and floors without immediately opening the surface.",
  );
  p("Thermal imaging is resourceful for when:");
  ul([
    "A wall or ceiling feels damp",
    "Moisture is spreading beneath tiles",
    "There is no visible pipe break",
    "The suspected leak is behind a finished surface",
    "You want to minimize unnecessary cutting",
  ]);

  h3("Acoustic Leak Detection Cost");
  p(
    "Acoustic leak detection costs around AED 500 to AED 900 for residential applications, although specialist acoustic investigations can be substantially more expensive.",
  );
  p(
    "The equipment listens for sound produced by pressurised water escaping from a pipe. Technicians can use acoustic sensors to narrow down the leak location before opening a wall or floor. It is useful for concealed supply-line leaks and underground or slab-related problems.",
  );

  h3("Pipe Camera Inspection Cost");
  p(
    "CCTV pipe inspection costs around AED 400 to AED 900 for standard investigations. The camera provides a live view inside accessible pipework and can help identify blockages, cracks, damaged sections, or other internal problems.",
  );
  p(
    "Camera inspection is more useful for drainage and pipe interiors than for every type of pressurised water leak. The right method depends on if the water is escaping.",
  );

  h3("Pressure Testing & Dye Tracing Cost");
  p(
    "Pressure testing can start from roughly AED 150 for simpler applications, whereas more involved pressure or tracer-gas investigations can cost AED 600 to AED 1,200 or more.",
  );
  p(
    "Pressure testing isolates sections of a plumbing system and checks whether pressure drops. This can help establish whether a concealed supply line is leaking.",
  );
  p(
    "Dye tracing can be more resourceful where the concern is water movement between fixtures, bathrooms, tanks, or other connected areas.",
  );

  h4("When Multiple Methods Are Needed Together");
  p(
    "A technician might begin with pressure testing, use thermal imaging to identify the affected zone, then use acoustic equipment to pinpoint the source. Complicated underground leaks may require additional methods such as tracer gas. That's why a quote for a complicated investigation can look very different from the starting price advertised for basic detection.",
  );
  blocks.push(imgBlock(serviceImg, SERVICE_IMG_ALT, "3", null));

  h2("Water Leak Detection Service Cost: What Affects the Price");
  p("The cost of water leak detection service depends on more than the equipment used.");

  h3("Property Type (Villa vs. Apartment vs. Commercial)");
  p(
    "Apartments involve smaller inspection areas, whereas villas can have multiple bathrooms, kitchens, outdoor plumbing, and longer pipe runs.",
  );
  p(
    "Commercial properties can cost more, as they contain larger plumbing networks, multiple floors, and several possible leak sources.",
  );
  p(
    "Estimated Dubai rates for water leak detection in residential properties range from around AED 200, and whole-building surveys can start from around AED 1,500.",
  );

  h3("Area Affected and Access Difficulty");
  p(
    "A leak beneath an accessible ceiling is easier to investigate than one beneath marble flooring or a concrete slab. The cost can increase when technicians need to inspect the following factors:",
  );
  ul([
    "Multiple rooms",
    "False ceilings",
    "Deeply concealed pipes",
    "Underground lines",
    "Large floor areas",
    "Difficult-to-access service zones",
  ]);

  h3("Number of Detection Methods Required");
  p(
    "Basic moisture testing might be enough for an obvious problem. A concealed leak can require thermal imaging, acoustic testing, pressure testing, or CCTV inspection. More equipment means more technician time and a higher service cost.",
  );

  h3("Emergency or Same-Day Cost (Premium)");
  p(
    "Emergency services incur an additional callout fee, especially outside normal working hours, on weekends or public holidays.",
  );
  p(
    "Estimated price rates range from around AED 300 for emergency detection to additional premiums of AED 100 to AED 600 depending on the provider.",
  );
  p(
    "If water is actively escaping, however, waiting for a cheaper appointment can be a false economy.",
  );

  h2("Price Comparison Table for Dubai Water Leak Detection Cost");
  blocks.push(`<figure class="wp-block-table"><table><thead><tr>
<th>Method</th><th>Starting Price: AED</th><th>Best For</th><th>Turnaround</th>
</tr></thead><tbody>
<tr><td>Basic detection</td><td>200 to 400</td><td>Localised residential leaks</td><td>30 to 90 min</td></tr>
<tr><td>Thermal imaging</td><td>350 to 700</td><td>Hidden moisture behind surfaces</td><td>1 to 2 hrs</td></tr>
<tr><td>Acoustic detection</td><td>500 to 900</td><td>Pressurised concealed pipe leaks</td><td>1 to 3 hrs</td></tr>
<tr><td>CCTV pipe inspection</td><td>400 to 900</td><td>Internal pipe and drainage inspection</td><td>1 to 3 hrs</td></tr>
<tr><td>Pressure testing</td><td>150 to 500</td><td>Testing isolated water lines</td><td>30 to 90 min</td></tr>
<tr><td>Tracer gas detection</td><td>500 to 1,200</td><td>Deep or difficult concealed leaks</td><td>2 to 4 hrs</td></tr>
<tr><td>Full property survey</td><td>800 to 1,500+</td><td>Villas and complex properties</td><td>2 to 6 hrs</td></tr>
<tr><td>Emergency detection</td><td>300 to 800+</td><td>Urgent, same-day investigations</td><td>Same day</td></tr>
</tbody></table></figure>`);

  h3("How to Read This Table Before You Book");
  p(
    "Do not choose a company based only on the lowest starting price. A quote of AED 200 might cover a basic inspection, whereas another company quoting AED 500 can include thermal imaging, acoustic testing, and a written report.",
  );
  p(
    "Ask what the price actually includes. The cheapest number is not necessarily the cheapest service if another visit, another method, or a separate report is added later on.",
  );

  h2("Cost of Water Leak Detection Service vs. Cost of NOT Detecting");
  p(
    "Paying for detection can feel unnecessary when the leak is not visibly damaging anything. The problem is that concealed water rarely stays in one place.",
  );

  h3("Structural Damage Repair Cost If Leaks Go Undetected");
  p(
    "Water can spread through walls, ceilings, flooring, and insulation before the original leak becomes obvious. Depending on the damage, the eventual repair will involve:",
  );
  ul([
    "Pipe replacement",
    "Tile removal and reinstatement",
    "Waterproofing repairs",
    "Ceiling repairs",
    "Plaster and paint restoration",
    "Mould remediation",
    "Flooring replacement",
  ]);
  p(
    "For example, estimated rates for concealed wall or floor pipe repairs are between AED 600 and AED 1,500. More extensive underground or main-line work can add up to even more than several thousand dirhams.",
  );
  p(
    "Detection does not eliminate the repair cost. It can, however, help identify the exact area that needs to be opened.",
  );

  h3("Water Bill Impact of Undetected Leaks");
  p(
    "A hidden supply leak can also show up through an unexplained increase in your DEWA bill. So watch out for:",
  );
  ul([
    "A sudden increase in water consumption",
    "Higher bills without a corresponding change in occupancy",
    "A water meter that continues moving when all fixtures are off",
    "The sound of running water when taps and appliances are not being used",
  ]);

  h2("Preventing Future Leaks: Is a Water Leak Detection System Worth It?");
  p(
    "A one-off inspection finds a current problem. A water leak detection system can monitor for future problems.",
  );

  h3("How a Water Leak Detection System in Dubai Pays for Itself");
  p(
    'A <a href="/water-leak-detection-system-in-dubai/">water leak detection system</a> can use sensors to monitor moisture or water flow and alert property owners when unusual activity occurs.',
  );
  p("This can be especially useful for:");
  ul([
    "Villas with multiple bathrooms",
    "Holiday homes",
    "Rental properties",
    "Properties that remain vacant",
    "Commercial premises",
    "Buildings with valuable interiors or equipment",
  ]);
  p(
    "The financial case depends on the property and system. If an installed system identifies a leak before it damages flooring, ceilings, or cabinetry, the avoided repair cost can outweigh the monitoring investment.",
  );

  h3("Cost Comparison of One-Time Detection vs. Installed Monitoring");
  blocks.push(`<figure class="wp-block-table"><table><thead><tr>
<th>Option</th><th>Estimated Cost</th><th>Best For</th>
</tr></thead><tbody>
<tr><td>One-time leak detection</td><td>AED 200 to 1,500+</td><td>Suspected current leak</td></tr>
<tr><td>Multi-method detection</td><td>AED 1,000 to 2,500+</td><td>Difficult or underground leaks</td></tr>
<tr><td>Annual detection or maintenance contract</td><td>AED 1,200 to 5,000/year</td><td>Villas and commercial properties</td></tr>
<tr><td>Installed leak monitoring system</td><td>Varies by property and system</td><td>Ongoing monitoring</td></tr>
</tbody></table></figure>`);
  blocks.push(imgBlock(cta, CTA_ALT, "4", "/contact/"));

  h2("How to Choose a Water Leak Detection Company Without Overpaying");
  p(
    "A good water leak detection service should tell you what it will do, why that method is appropriate, and what the quoted price includes.",
  );

  h3("Questions to Ask Before You Book");
  p("Ask these before agreeing to the work:");
  ul([
    "Is the site visit included in the detection fee?",
    "Which detection method will you use?",
    "Could additional methods be required?",
    "Is VAT included?",
    "Is there an emergency callout charge?",
    "Will I receive a written report?",
    "Will the report include photos or thermal images?",
    "Is leak repair charged separately?",
    "Will you mark the precise leak location?",
    "What happens if the first method does not locate the leak?",
  ]);

  h3("Vague Quotes, No Written Reports: The Red Flags in Pricing");
  p("Be cautious if a company cannot explain what its price includes. Warning signs include:");
  ul([
    "An unusually low starting price with no scope",
    "No written quotation",
    "Unclear equipment or detection methods",
    "No explanation of additional charges",
    "No documentation of the detected leak",
    "Pressure to approve repair work before the leak is properly located",
  ]);
  p(
    "A professional detection report can also be useful when you need to document damage for a landlord, building management company, or insurer.",
  );

  h3("See Our Top Water Leak Detection Companies Comparison");
  p(
    'Want to compare companies based on pricing transparency, detection methods, response time, reporting, and customer reviews instead of choosing solely on the lowest advertised rate? Check out our <a href="/plumbing/leak-detection/">leak detection service</a> and related guides before you book.',
  );

  h3("Need a leak located before the damage gets worse?");
  p(
    "Ask for a written quotation that specifies the detection method, expected scope, report, and any additional charges. This will make it much easier to compare the true water leak detection service cost rather than comparing headline prices alone.",
  );

  h2("FAQs");
  h3("How much does water leak detection cost in Dubai?");
  p(
    "The water leak detection cost in Dubai starts at around AED 200 to AED 400 for basic residential detection.",
  );

  h3("What is the average cost of water leak detection service?");
  p(
    "There is no average cost because the cost of water leak detection service varies by property and detection method. A simple residential investigation will cost you a few hundred dirhams, and multi-method or specialist investigations can exceed AED 1,500.",
  );

  h3("Is the site visit fee separate from the detection cost?");
  p(
    "Sometimes, the site visit fee is separate from the detection cost. Some companies charge a separate site visit or engineer assessment fee, but others include the visit in the detection price or waive it when you proceed with repairs.",
  );

  h3("Does villa leak detection cost more than apartment detection?");
  p(
    "Villa leak detection can cost more than apartment detection. Villas usually cover a larger area and may have more bathrooms, outdoor plumbing, irrigation lines and longer pipe runs.",
  );
  p(
    "However, the detection method and leak location matter more than the property label alone. A complicated apartment slab leak can cost more to investigate than a plain leak in a villa.",
  );

  h3("What's the cheapest way to detect a water leak?");
  p(
    "For a suspected basic leak, an initial visual inspection, moisture assessment, or pressure test is less expensive than advanced detection.",
  );

  h3("Does insurance cover water leak detection costs in Dubai?");
  p(
    "Coverage depends on your policy, the cause of the leak, and the type of damage involved.",
  );
  p(
    "Detection itself may not always be covered, but an insurer may request documentation of the leak and resulting damage when assessing a claim.",
  );
  p(
    "Ask your insurer what reports, photographs, and invoices are required before authorising non-emergency work.",
  );

  h3("How long does a water leak detection service take?");
  p(
    "A simple inspection can take around 30 to 90 minutes. Thermal or acoustic investigations will take one to three hours. Complex properties, underground leaks, and multi-method investigations can take several hours.",
  );
  p(
    "So the time depends on the area being inspected and how difficult the leak is to isolate.",
  );

  h3("Is a water leak detection system cheaper than repeated detection callouts?");
  p(
    "A water leak detection system can be cheaper than repeated detection callouts for properties with recurring leaks or high exposure to water damage.",
  );
  p(
    "An installed monitoring system has an upfront cost, but it can provide ongoing alerts instead of requiring a new detection visit every time there is a suspected problem.",
  );
  p(
    "For a property with frequent issues, compare the installation and monitoring cost against previous detection and repair expenses.",
  );

  return blocks.join("\n");
}

function faqSchema() {
  const faqs = [
    {
      q: "How much does water leak detection cost in Dubai?",
      a: "The water leak detection cost in Dubai starts at around AED 200 to AED 400 for basic residential detection.",
    },
    {
      q: "What is the average cost of water leak detection service?",
      a: "There is no average cost because the cost of water leak detection service varies by property and detection method. A simple residential investigation will cost you a few hundred dirhams, and multi-method or specialist investigations can exceed AED 1,500.",
    },
    {
      q: "Is the site visit fee separate from the detection cost?",
      a: "Sometimes, the site visit fee is separate from the detection cost. Some companies charge a separate site visit or engineer assessment fee, but others include the visit in the detection price or waive it when you proceed with repairs.",
    },
    {
      q: "Does villa leak detection cost more than apartment detection?",
      a: "Villa leak detection can cost more than apartment detection. Villas usually cover a larger area and may have more bathrooms, outdoor plumbing, irrigation lines and longer pipe runs. However, the detection method and leak location matter more than the property label alone. A complicated apartment slab leak can cost more to investigate than a plain leak in a villa.",
    },
    {
      q: "What's the cheapest way to detect a water leak?",
      a: "For a suspected basic leak, an initial visual inspection, moisture assessment, or pressure test is less expensive than advanced detection.",
    },
    {
      q: "Does insurance cover water leak detection costs in Dubai?",
      a: "Coverage depends on your policy, the cause of the leak, and the type of damage involved. Detection itself may not always be covered, but an insurer may request documentation of the leak and resulting damage when assessing a claim. Ask your insurer what reports, photographs, and invoices are required before authorising non-emergency work.",
    },
    {
      q: "How long does a water leak detection service take?",
      a: "A simple inspection can take around 30 to 90 minutes. Thermal or acoustic investigations will take one to three hours. Complex properties, underground leaks, and multi-method investigations can take several hours. So the time depends on the area being inspected and how difficult the leak is to isolate.",
    },
    {
      q: "Is a water leak detection system cheaper than repeated detection callouts?",
      a: "A water leak detection system can be cheaper than repeated detection callouts for properties with recurring leaks or high exposure to water damage. An installed monitoring system has an upfront cost but it can provide ongoing alerts instead of requiring a new detection visit every time there is a suspected problem. For a property with frequent issues, compare the installation and monitoring cost against previous detection and repair expenses.",
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
    datePublished: "2026-09-14",
    dateModified: "2026-09-14",
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
  const featured = await writeResponsive(SRC.featured, "Water-Leak-Detection-Cost-Dubai");
  const costImg = await writeResponsive(SRC.cost, "cost-of-water-leak-detection");
  const serviceImg = await writeResponsive(SRC.service, "cost-of-water-leak-detection-service");
  const cta = await writeResponsive(SRC.cta, "water-leak-detection-service-cost-cta");

  const articleHtml = buildArticleContent(costImg, serviceImg, cta);
  const posts = JSON.parse(fs.readFileSync(POSTS_PATH, "utf8"));
  if (posts.some((p) => p.slug === SLUG || p.id === NEW_ID)) {
    throw new Error(`Post already exists for slug ${SLUG} or id ${NEW_ID}`);
  }

  const template = posts.find((p) => p.id === TEMPLATE_ID) || posts.find((p) => p.id === 6229);
  if (!template?.bodyHtml) throw new Error("template post missing");

  let bodyHtml = template.bodyHtml;
  bodyHtml = bodyHtml.replace(new RegExp(`post-${template.id}`, "g"), `post-${NEW_ID}`);
  bodyHtml = bodyHtml.replace(
    /class="elementor elementor-2619 elementor-location-single post-\d+ post type-post status-publish format-standard has-post-thumbnail hentry[^"]*"/,
    `class="elementor elementor-2619 elementor-location-single post-${NEW_ID} post type-post status-publish format-standard has-post-thumbnail hentry category-property-maintenance-tips tag-water-leak-detection-cost"`,
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
  bodyHtml = stripAfterFeaturedTitleWidgets(bodyHtml);

  // Template bakes a hardcoded <time> date — replace with this post's date.
  bodyHtml = bodyHtml.replace(
    /(<span class="elementor-icon-list-text elementor-post-info__item elementor-post-info__item--type-date">\s*<time>)([^<]+)(<\/time>)/,
    `$1September 14, 2026$3`,
  );

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
    { name: "water leak detection cost", slug: "water-leak-detection-cost" },
    { name: "water leak detection dubai", slug: "water-leak-detection-dubai" },
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
    costImgLink:
      bodyHtml.includes('href="/plumbing/leak-detection/"') && bodyHtml.includes(costImg.url),
    serviceImg: bodyHtml.includes(serviceImg.url),
    ctaContact: bodyHtml.includes('href="/contact/"') && bodyHtml.includes(cta.url),
    systemLink: bodyHtml.includes('href="/water-leak-detection-system-in-dubai/"'),
    stopLeakLink: bodyHtml.includes('href="/how-to-stop-water-leakage/"'),
    faqPresent: bodyHtml.includes("How much does water leak detection cost in Dubai?"),
    tables: (articleHtml.match(/wp-block-table/g) || []).length === 3,
  };
  console.log("VERIFY", checks);
  if (Object.values(checks).some((v) => v === false)) process.exit(1);
  console.log("OK created", POST_PATH, featured.url);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
