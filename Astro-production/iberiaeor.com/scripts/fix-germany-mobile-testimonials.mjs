/**
 * Fix Germany page mobile testimonial carousel (widget 42232ae):
 * replace duplicated Spain/Artemisia slides with full Germany testimonials.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const TESTIMONIALS = [
  {
    quote:
      "Their expertise in German laws saved us significant time and potential conflict when we were in the middle of setting up our Berlin team.",
    name: "Sofia Lindström",
    role: "International HR manager",
    img: "/wp-content/uploads/2025/08/Photo-by-Connor-Wilkins.webp",
    alt: "International HR manager",
  },
  {
    quote:
      "We scaled our German team from 1 to 12 in under four months with IberiaEOR. Couldn’t have done it without their insight and support.",
    name: "Markus Schneider",
    role: "Global HR Business Partner",
    img: "/wp-content/uploads/2025/08/Photo-by-Andres-Molina.webp",
    alt: "Global HR Business Partner",
  },
  {
    quote:
      "IberiaEOR made compliance feel simple. The legal side of things went better than smooth.",
    name: "Isabelle Moreau",
    role: "VP of Global People &amp; Culture",
    img: "/wp-content/uploads/2025/08/Photo-by-Christina-@-wocintechchat.webp",
    alt: "VP of Global People &amp; Culture",
  },
  {
    quote:
      "IberiaEOR made hiring in Germany look so simple. We had our first employee onboarded in 10 days!",
    name: "Artemisia",
    role: "Growth Manager, SaaS Company",
    img: "/wp-content/uploads/2025/08/Photo-by-Italo-Melo.webp",
    alt: "Growth Manager, SaaS Company",
  },
];

function extractWidget(doc, id) {
  const marker = `elementor-element-${id}`;
  const i = doc.indexOf(marker);
  if (i < 0) return null;
  const start = doc.lastIndexOf("<div", i);
  let depth = 0;
  const slice = doc.slice(start);
  for (let p = 0; p < slice.length; p++) {
    if (slice.startsWith("<div", p)) {
      depth++;
      p += 3;
    } else if (slice.startsWith("</div>", p)) {
      depth--;
      p += 5;
      if (depth === 0) return { start, end: start + p + 1, html: doc.slice(start, start + p + 1) };
    }
  }
  return null;
}

function patchSlide(slideHtml, t) {
  let out = slideHtml;
  out = out.replace(
    /(<p class="elementor-heading-title elementor-size-default">)([\s\S]*?)(<\/p>)/,
    `$1${t.quote}$3`,
  );
  out = out.replace(
    /(<img[^>]*?)\ssrc="[^"]*"([^>]*?>)/,
    `$1 src="${t.img}"$2`,
  );
  // if alt empty or wrong
  if (/alt="[^"]*"/.test(out)) {
    out = out.replace(/alt="[^"]*"/, `alt="${t.alt}"`);
  } else {
    out = out.replace(/<img /, `<img alt="${t.alt}" `);
  }
  out = out.replace(
    /(<h3 class="elementor-image-box-title">)([\s\S]*?)(<\/h3>)/,
    `$1${t.name}$3`,
  );
  out = out.replace(
    /(<p class="elementor-image-box-description">)([\s\S]*?)(<\/p>)/,
    `$1${t.role}$3`,
  );
  return out;
}

function fixHtml(doc) {
  const widget = extractWidget(doc, "42232ae");
  if (!widget) {
    console.warn("widget 42232ae not found");
    return doc;
  }

  const parts = widget.html.split(/(?=<div class="swiper-slide")/);
  // parts[0] = header before first slide
  const rebuilt = [parts[0]];
  let slideIdx = 0;
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    if (!part.startsWith('<div class="swiper-slide"')) {
      rebuilt.push(part);
      continue;
    }
    // Each part may include trailing after last slide; split footer after slide end
    // Find end of this slide's outer div - the slide wraps testimonial
    // Simpler: patch known Spain strings if present, using TESTIMONIALS[slideIdx]
    if (slideIdx < TESTIMONIALS.length) {
      rebuilt.push(patchSlide(part, TESTIMONIALS[slideIdx]));
      slideIdx++;
    } else {
      rebuilt.push(part);
    }
  }

  if (slideIdx < TESTIMONIALS.length) {
    console.warn("only patched", slideIdx, "slides, expected", TESTIMONIALS.length);
  }

  const newWidget = rebuilt.join("");
  // verify
  for (const t of TESTIMONIALS) {
    if (!newWidget.includes(t.name)) console.warn("missing name after patch", t.name);
    if (!newWidget.includes(t.quote.slice(0, 40))) console.warn("missing quote", t.name);
  }

  return doc.slice(0, widget.start) + newWidget + doc.slice(widget.end);
}

const bodiesPath = path.join(root, "src/data/bodies.json");
const bodies = JSON.parse(fs.readFileSync(bodiesPath, "utf8"));
const key = "/eor-services-germany/";
bodies[key] = fixHtml(bodies[key]);
fs.writeFileSync(bodiesPath, JSON.stringify(bodies, null, 2) + "\n");
console.log("updated bodies.json");

const pagesPath = path.join(root, "src/data/pages.json");
const pages = JSON.parse(fs.readFileSync(pagesPath, "utf8"));
let n = 0;
for (const p of pages) {
  const slug = String(p.slug || p.path || p.url || "");
  if (!/eor-services-germany/i.test(slug) && p.id !== 5324) continue;
  for (const field of ["bodyHtml", "content", "html", "body"]) {
    if (typeof p[field] === "string" && p[field].includes("42232ae")) {
      p[field] = fixHtml(p[field]);
      n++;
    }
  }
}
fs.writeFileSync(pagesPath, JSON.stringify(pages, null, 2) + "\n");
console.log("updated pages fields", n);

// sanity
const check = bodies[key];
const car = extractWidget(check, "42232ae").html;
console.log(
  "names in carousel:",
  [...car.matchAll(/elementor-image-box-title[^>]*>([^<]+)/g)].map((m) => m[1]),
);
console.log(
  "roles:",
  [...car.matchAll(/elementor-image-box-description[^>]*>([^<]+)/g)].map((m) => m[1]),
);
console.log(
  "quotes:",
  [...car.matchAll(/elementor-heading-title elementor-size-default">([^<]+)/g)].map((m) => m[1]),
);
