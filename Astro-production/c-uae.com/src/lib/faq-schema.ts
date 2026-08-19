import { load, type Cheerio, type Element } from "cheerio";

export type FaqItem = {
  name: string;
  text: string;
};

export type FaqSchemaOptions = {
  /** FAQ blocks inside these selectors are ignored (e.g. CSS-hidden sections). */
  excludeSelectors?: string[];
};

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeAnswerHtml(html: string): string {
  const trimmed = html.replace(/^\s+|\s+$/g, "");
  if (!trimmed) return "";
  const textOnly = normalizeWhitespace(trimmed.replace(/<[^>]+>/g, " "));
  return textOnly ? trimmed : "";
}

/** True when copy reads like a user-facing FAQ question (not nav/service labels). */
export function looksLikeFaqQuestion(text: string): boolean {
  const value = normalizeWhitespace(text);
  if (!value || value.length < 10) return false;
  if (value.includes("?")) return true;
  return /^(what|how|why|when|where|which|who|can|do|does|is|are|will|should|could|would)\b/i.test(
    value,
  );
}

export function isFaqPageSchema(schema: unknown): boolean {
  if (!schema || typeof schema !== "object") return false;
  const type = (schema as { "@type"?: unknown })["@type"];
  if (type === "FAQPage") return true;
  if (Array.isArray(type)) return type.includes("FAQPage");
  return false;
}

export function hasFaqPageSchema(schemas: unknown[] = []): boolean {
  return schemas.some(isFaqPageSchema);
}

export function faqPageSchema(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.name,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.text,
      },
    })),
  };
}

/** Remove inline FAQPage JSON-LD from mirrored WordPress HTML (head schema is canonical). */
export function stripInlineFaqJsonLd(html: string): string {
  return html.replace(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi,
    (block) => (isFaqPageSchema(parseJsonLdBlock(block)) ? "" : block),
  );
}

function parseJsonLdBlock(block: string): unknown {
  const match = block.match(/<script\b[^>]*>([\s\S]*?)<\/script>/i);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function extractElementorFaqs($: ReturnType<typeof load>, root: Cheerio<Element>): FaqItem[] {
  const items: FaqItem[] = [];
  const seen = new Set<string>();

  root.find(".elementor-toggle-item, .elementor-accordion-item").each((_, el) => {
    const item = $(el);
    const name = normalizeWhitespace(
      item.find(".elementor-toggle-title, .elementor-accordion-title").first().text(),
    );
    const answerEl = item.find(".elementor-tab-content").first();
    const text = normalizeAnswerHtml(answerEl.html() || answerEl.text());
    if (!name || !text || !looksLikeFaqQuestion(name)) return;

    const key = name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    items.push({ name, text });
  });

  return items;
}

function extractFaqOrderedList($: ReturnType<typeof load>, root: Cheerio<Element>): FaqItem[] {
  const items: FaqItem[] = [];
  const seen = new Set<string>();

  root.find("h2, h3").each((_, heading) => {
    const h = $(heading);
    const headingText = normalizeWhitespace(h.text());
    if (!/faq|frequently asked/i.test(headingText)) return;

    const ol = h.nextAll("ol").first();
    if (!ol.length) return;

    ol.find("li").each((_, li) => {
      const liEl = $(li);
      const rawHtml = liEl.html() || "";
      const brMatch = rawHtml.match(/<br\s*\/?>/i);
      let name = "";
      let text = "";

      if (brMatch && brMatch.index != null) {
        name = normalizeWhitespace(load(rawHtml.slice(0, brMatch.index)).text());
        text = normalizeAnswerHtml(rawHtml.slice(brMatch.index));
      } else {
        const full = normalizeWhitespace(liEl.text());
        const qEnd = full.indexOf("?");
        if (qEnd < 0) return;
        name = full.slice(0, qEnd + 1).trim();
        text = full.slice(qEnd + 1).trim();
      }

      if (!name || !text || !looksLikeFaqQuestion(name)) return;
      const key = name.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      items.push({ name, text });
    });
  });

  return items;
}

function extractHeadingFaqs($: ReturnType<typeof load>, root: Cheerio<Element>): FaqItem[] {
  const items: FaqItem[] = [];
  const seen = new Set<string>();
  const scoped = root.find(
    ".sp-article__content, .elementor-widget-theme-post-content, .entry-content",
  ).first();
  const scope = scoped.length ? scoped : root;

  scope.find("h2").each((_, h2) => {
    const name = normalizeWhitespace($(h2).text());
    if (!looksLikeFaqQuestion(name)) return;

    const parts: string[] = [];
    let next = $(h2).next();
    while (next.length && !next.is("h2")) {
      parts.push($.html(next));
      next = next.next();
    }

    const text = normalizeAnswerHtml(parts.join(""));
    if (!text) return;

    const key = name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    items.push({ name, text });
  });

  return items;
}

/** Extract visible FAQ Q&A pairs from mirrored Elementor / blog HTML. */
export function extractFaqsFromHtml(html: string, options: FaqSchemaOptions = {}): FaqItem[] {
  if (!html?.trim()) return [];

  const $ = load(html);
  for (const selector of options.excludeSelectors || []) {
    $(selector).remove();
  }

  const root = $.root();

  const elementor = extractElementorFaqs($, root);
  if (elementor.length >= 2) return elementor;
  if (elementor.length === 1 && elementor[0].name.includes("?")) return elementor;

  const list = extractFaqOrderedList($, root);
  if (list.length > 0) return list;

  const headings = extractHeadingFaqs($, root);
  if (headings.length >= 2) return headings;

  return elementor;
}

/**
 * Strip duplicate inline FAQ JSON-LD, drop stored FAQPage blocks, and append schema
 * generated from the FAQ content rendered on this page.
 */
export function preparePageFaqSchema(
  html: string,
  schemas: unknown[] = [],
  options: FaqSchemaOptions = {},
): { html: string; schemas: unknown[] } {
  const cleanedHtml = stripInlineFaqJsonLd(html);
  const schemasWithoutFaq = schemas.filter((schema) => !isFaqPageSchema(schema));
  const items = extractFaqsFromHtml(cleanedHtml, options);

  if (items.length === 0) {
    return { html: cleanedHtml, schemas: schemasWithoutFaq };
  }

  return {
    html: cleanedHtml,
    schemas: [...schemasWithoutFaq, faqPageSchema(items)],
  };
}
