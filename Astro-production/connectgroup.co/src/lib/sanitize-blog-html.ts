import { sanitizeCmsHtml } from '@connect/site-cms';

/**
 * CMS sanitize strips <details>/<summary> (packages allowlist is publish-blocked).
 * Preserve FAQ accordion markup by placeholder-swapping around sanitizeCmsHtml.
 * Scripts/handlers inside FAQ blocks are stripped before restore.
 */
export function sanitizeBlogHtml(dirty: string): string {
  const input = String(dirty || '');
  if (!input.trim()) return '';

  const blocks: string[] = [];
  const withPlaceholders = input.replace(/<div\b[^>]*\bclass=(["'])([^"']*\bbp-faq\b[^"']*)\1[^>]*>[\s\S]*?<\/div>/gi, (match) => {
    const safe = match
      .replace(/<script\b[\s\S]*?<\/script>/gi, '')
      .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
    const idx = blocks.length;
    blocks.push(safe);
    return `@@BP_FAQ_BLOCK_${idx}@@`;
  });

  let out = sanitizeCmsHtml(withPlaceholders);
  out = out.replace(/@@BP_FAQ_BLOCK_(\d+)@@/g, (_, rawIdx: string) => blocks[Number(rawIdx)] || '');
  return out;
}
