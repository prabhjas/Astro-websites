/** Deduplicate FAQPage JSON-LD (head `seo.schemas` vs mirrored body scripts). */

export function isFaqPageSchema(schema: unknown): boolean {
  if (!schema || typeof schema !== "object") return false;
  const type = (schema as { "@type"?: unknown })["@type"];
  if (type === "FAQPage") return true;
  if (Array.isArray(type)) return type.includes("FAQPage");
  const graph = (schema as { "@graph"?: unknown })["@graph"];
  if (Array.isArray(graph)) return graph.some(isFaqPageSchema);
  return false;
}

export function hasFaqPageSchema(schemas: unknown[] = []): boolean {
  return schemas.some(isFaqPageSchema);
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

/** Remove inline FAQPage JSON-LD from mirrored WordPress HTML. */
export function stripInlineFaqJsonLd(html: string): string {
  return html.replace(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi,
    (block) => (isFaqPageSchema(parseJsonLdBlock(block)) ? "" : block),
  );
}

function extractInlineFaqSchemas(html: string): unknown[] {
  const found: unknown[] = [];
  html.replace(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi,
    (block) => {
      const parsed = parseJsonLdBlock(block);
      if (isFaqPageSchema(parsed) && parsed && typeof parsed === "object") {
        const type = (parsed as { "@type"?: unknown })["@type"];
        if (type === "FAQPage" || (Array.isArray(type) && type.includes("FAQPage"))) {
          found.push(parsed);
        } else {
          const graph = (parsed as { "@graph"?: unknown[] })["@graph"];
          if (Array.isArray(graph)) {
            for (const node of graph) {
              if (isFaqPageSchema(node)) found.push(node);
            }
          }
        }
      }
      return block;
    },
  );
  return found;
}

/**
 * Ensure a page emits at most one FAQPage:
 * - Prefer existing head `seo.schemas` FAQ
 * - Else promote the first body FAQ into schemas
 * - Always strip inline FAQ JSON-LD from HTML
 */
export function dedupeFaqSchema(
  html: string,
  schemas: unknown[] = [],
): { html: string; schemas: unknown[] } {
  const fromBody = extractInlineFaqSchemas(html);
  const cleanedHtml = stripInlineFaqJsonLd(html);
  const fromHead = schemas.filter(isFaqPageSchema);
  const others = schemas.filter((schema) => !isFaqPageSchema(schema));

  if (fromHead.length > 0) {
    return { html: cleanedHtml, schemas: [...others, fromHead[0]] };
  }

  if (fromBody.length > 0) {
    return { html: cleanedHtml, schemas: [...others, fromBody[0]] };
  }

  return { html: cleanedHtml, schemas: others };
}
