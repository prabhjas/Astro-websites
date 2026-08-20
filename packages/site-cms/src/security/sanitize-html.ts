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
 * Mirror HTML hygiene for Elementor / WP page exports (audit P0-5 / P1).
 *
 * **Do not** strip inline `<script>`, `on*` handlers, or `<style>` here.
 * Elementor mega-menus, Swiper/slider arrows, ScrollSequence (`ssqInput`),
 * `elementorFrontendConfig`, and many widgets depend on those. Aggressive
 * sanitization broke Kinza / Connect Group / sliders (2026-08-07) — reverted.
 *
 * Trusted mirrors ≠ CMS HTML. User/CMS bodies must use {@link sanitizeCmsHtml}.
 * This helper only blocks document hijacks (`<base>`, meta refresh, `javascript:` URLs).
 */
export function sanitizeMirrorHtml(dirty: string): string {
  let html = String(dirty || '');
  if (!html.trim()) return '';

  html = html.replace(/(href|src|xlink:href)\s*=\s*(['"])\s*javascript:[^'"]*\2/gi, '$1=$2#$2');
  html = html.replace(/<base\b[^>]*>/gi, '');
  html = html.replace(/<meta\b[^>]*http-equiv\s*=\s*['"]?refresh['"]?[^>]*>/gi, '');

  // Strip WordPress / Elementor / WP Rocket / WPML generator fingerprints.
  html = html.replace(/<meta\b[^>]*name=["']generator["'][^>]*>/gi, '');
  html = html.replace(
    /<!--\s*This website is like a Rocket[\s\S]*?-->/gi,
    '',
  );
  html = html.replace(/<!--\s*WP Rocket[\s\S]*?-->/gi, '');
  // Drop WP Rocket beacon / lazy-load helper scripts that 404 on Astro.
  html = html.replace(
    /<script\b[^>]*(?:wpr-beacon|rocket-lazy|wp-rocket)[^>]*>[\s\S]*?<\/script>/gi,
    '',
  );
  // WP Rocket head bootstrap blocks first paint; astro-mirror-fixes handles body scripts.
  html = html.replace(
    /<script>if\(navigator\.userAgent\.match\(\/MSIE[\s\S]*?<\/script>/gi,
    '',
  );
  html = html.replace(
    /<script>\(\(\)=>\{class RocketLazyLoadScripts[\s\S]*?<\/script>/gi,
    '',
  );
  html = html.replace(
    /<script>\(\(\)=>\{class RocketElementorPreload[\s\S]*?<\/script>/gi,
    '',
  );

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
