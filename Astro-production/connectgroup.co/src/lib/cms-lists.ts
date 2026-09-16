/**
 * WordPress often wraps lists as:
 *   <ul class="wp-block-list"><li style="list-style-type: none;"><ul><li>…</li></ul></li></ul>
 * That renders two bullets (outer + inner). Flatten to a single list.
 */
export function unwrapWordpressNestedLists(html: string): string {
  if (!html) return html;

  const pattern =
    /<(ul|ol)(\b[^>]*)>\s*<li\b[^>]*style=(["'])[^"']*list-style-type\s*:\s*none[^"']*\3[^>]*>\s*<\1(\b[^>]*)>([\s\S]*?)<\/\1>\s*<\/li>\s*<\/\1>/gi;

  let prev = '';
  let out = html;
  // Run a few times in case of deeper accidental nesting.
  for (let i = 0; i < 5 && out !== prev; i += 1) {
    prev = out;
    out = out.replace(pattern, '<$1$2>$5</$1>');
  }
  return out;
}
