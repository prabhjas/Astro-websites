import { existsSync } from "node:fs";
import { join } from "node:path";

const LIVE_ORIGIN = "https://connectfm.ae";

function uploadRel(url: string): string {
  const m = String(url || "").match(/\/wp-content\/uploads\/[^?#\s]+/i);
  return m ? m[0] : "";
}

function localExists(rel: string): boolean {
  if (!rel) return false;
  return existsSync(join(process.cwd(), "public", rel.replace(/^\//, "")));
}

function toLive(url: string): string {
  const rel = uploadRel(url);
  if (!rel) return url;
  if (localExists(rel)) {
    return url.startsWith("http") ? rel : url.startsWith("/") ? url : `/${url}`;
  }
  return `${LIVE_ORIGIN}${rel}`;
}

/**
 * Prefer local /wp-content/uploads assets; fall back to live Connect FM CDN when missing.
 * Fixes empty single-post images when srcset picks sizes that were never downloaded.
 */
export function resolveUploadUrlsInHtml(html: string): string {
  if (!html) return html;

  let out = html.replace(/\bsrc=["']([^"']+)["']/gi, (full, src) => {
    if (!/\/wp-content\/uploads\//i.test(src)) return full;
    return `src="${toLive(src)}"`;
  });

  out = out.replace(/\bsrcset=["']([^"']+)["']/gi, (full, srcset) => {
    if (!/\/wp-content\/uploads\//i.test(srcset)) return full;
    const parts = srcset.split(",").map((chunk: string) => {
      const trimmed = chunk.trim();
      if (!trimmed) return trimmed;
      const [url, descriptor] = trimmed.split(/\s+/, 2);
      const next = toLive(url);
      return descriptor ? `${next} ${descriptor}` : next;
    });
    return `srcset="${parts.join(", ")}"`;
  });

  return out;
}
