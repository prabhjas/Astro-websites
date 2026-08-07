import sanitizeHtmlLib from 'sanitize-html';

/**
 * CMS HTML sanitizer (security audit P0-5).
 * Strips scriptable surfaces while keeping typical post markup (headings, lists, media).
 */
const CMS_OPTIONS: sanitizeHtmlLib.IOptions = {
  allowedTags: [
    ...sanitizeHtmlLib.defaults.allowedTags,
    'img',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'figure',
    'figcaption',
    'picture',
    'source',
    'video',
    'audio',
    'iframe',
    'table',
    'thead',
    'tbody',
    'tfoot',
    'tr',
    'th',
    'td',
    'colgroup',
    'col',
    'section',
    'article',
    'header',
    'footer',
    'nav',
    'aside',
    'main',
    'div',
    'span',
    'blockquote',
    'pre',
    'code',
    'hr',
    'br',
    'ul',
    'ol',
    'li',
    'dl',
    'dt',
    'dd',
    'p',
    'a',
    'strong',
    'em',
    'b',
    'i',
    'u',
    's',
    'sub',
    'sup',
    'small',
    'mark',
    'time',
  ],
  allowedAttributes: {
    a: ['href', 'name', 'target', 'rel', 'title', 'class', 'id'],
    img: ['src', 'srcset', 'sizes', 'alt', 'title', 'width', 'height', 'loading', 'class', 'id'],
    source: ['src', 'srcset', 'type', 'media', 'sizes'],
    video: ['src', 'controls', 'poster', 'width', 'height', 'class', 'id'],
    audio: ['src', 'controls', 'class', 'id'],
    iframe: ['src', 'width', 'height', 'title', 'allow', 'allowfullscreen', 'frameborder', 'loading', 'class', 'id'],
    '*': ['class', 'id', 'title', 'role'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: {
    img: ['http', 'https', 'data'],
  },
  allowProtocolRelative: false,
  // SVG / MathML omitted from allowedTags (polyglot XSS vectors).
  allowedIframeHostnames: [
    'www.youtube.com',
    'youtube.com',
    'www.youtube-nocookie.com',
    'player.vimeo.com',
    'www.google.com',
    'maps.google.com',
  ],
  transformTags: {
    a: sanitizeHtmlLib.simpleTransform('a', { rel: 'noopener noreferrer' }),
  },
};

/** Sanitize HTML intended for set:html / CMS post bodies. */
export function sanitizeCmsHtml(dirty: string): string {
  const input = String(dirty || '');
  if (!input.trim()) return '';
  return sanitizeHtmlLib(input, CMS_OPTIONS);
}

/**
 * Light sanitizer for Elementor / WP mirror HTML (audit P0-5 / P1).
 *
 * Mirrors are trusted site exports — Elementor mega-menus, ScrollSequence,
 * `elementorFrontendConfig`, and similar widgets ship as **inline** <script>
 * (and sometimes on* handlers). Stripping those breaks the live UI.
 *
 * Only neutralize document-level hijacks here. CMS/user HTML still goes through
 * the stricter {@link sanitizeCmsHtml}.
 */
export function sanitizeMirrorHtml(dirty: string): string {
  let html = String(dirty || '');
  if (!html.trim()) return '';

  // Neutralize javascript: URLs (not needed by Elementor widgets)
  html = html.replace(/(href|src|xlink:href)\s*=\s*(['"])\s*javascript:[^'"]*\2/gi, '$1=$2#$2');
  // Remove <base> hijacks
  html = html.replace(/<base\b[^>]*>/gi, '');
  // Remove meta refresh redirects
  html = html.replace(/<meta\b[^>]*http-equiv\s*=\s*['"]?refresh['"]?[^>]*>/gi, '');

  return html;
}

/**
 * GTM / analytics snippets must keep <script>, but strip handlers and javascript: URLs.
 */
export function sanitizeGtmHtml(dirty: string): string {
  let html = String(dirty || '');
  if (!html.trim()) return '';
  html = html.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  html = html.replace(/(href|src)\s*=\s*(['"])\s*javascript:[^'"]*\2/gi, '$1=$2#$2');
  html = html.replace(/<svg\b[\s\S]*?<\/svg>/gi, '');
  return html.trim();
}
