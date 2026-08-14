import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const LOCAL_ORIGIN_RE = /^https?:\/\/(?:www\.)?snapsale\.ae(?=\/|$)/i;
const IMAGE_EXT_RE = /\.(?:avif|webp|jpe?g|png|gif|svg)(?:[?#].*)?$/i;
const CONTENT_IMAGE_SKIP_RE =
  /(?:logo|icon|favicon|avatar|author|profile|social|whatsapp|facebook|linkedin|twitter|instagram|youtube|play|badge|rating|star)/i;
const HERO_NAME_RE = /(?:hero|banner|header|featured|main|page-title|background-image)/i;
const SECONDARY_BACKGROUND_RE = /(?:cta|footer|insights|testimonial|pattern|shape|overlay)/i;
const WP_ROCKET_MARKER_RE =
  /RocketLazyLoadScripts|rocket_beacon_data|wpr-beacon|lazyload\.min\.js|rocket-lazyload-nojs-css|wpr-lazyrender|RocketElementorPreload|lazyLoadThumb\(|data-(?:rocket|wpr)-/gi;

function countMatches(text, pattern) {
  return (text.match(pattern) || []).length;
}

function decodeHtmlAttr(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&#038;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}

function escapeAttr(value) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function attrRe(name, flags = 'i') {
  return new RegExp(
    `\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>]+))`,
    flags,
  );
}

function getAttr(tag, name) {
  const match = tag.match(attrRe(name));
  if (!match) return '';
  return decodeHtmlAttr(match[1] || match[2] || match[3] || '');
}

function hasAttr(tag, name) {
  return attrRe(name).test(tag);
}

function setAttr(tag, name, value) {
  const replacement = ` ${name}="${escapeAttr(value)}"`;
  const withoutExisting = tag.replace(attrRe(name, 'gi'), '');
  return withoutExisting.replace(/\s*\/?>$/, (end) => `${replacement}${end}`);
}

function removeAttr(tag, name) {
  return tag.replace(attrRe(name, 'gi'), '');
}

function normalizeLocalUrl(rawUrl) {
  const raw = decodeHtmlAttr(String(rawUrl || '').trim());
  if (!raw || raw.startsWith('data:') || raw.startsWith('blob:') || raw.startsWith('mailto:')) {
    return '';
  }
  if (raw.startsWith('//')) {
    return LOCAL_ORIGIN_RE.test(`https:${raw}`) ? new URL(`https:${raw}`).pathname : '';
  }
  if (/^https?:\/\//i.test(raw)) {
    if (!LOCAL_ORIGIN_RE.test(raw)) return '';
    return new URL(raw).pathname;
  }
  if (!raw.startsWith('/')) return '';
  return raw.split(/[?#]/, 1)[0];
}

function publicFileForUrl(rawUrl, publicRoot) {
  const localUrl = normalizeLocalUrl(rawUrl);
  if (!localUrl) return '';
  let decoded;
  try {
    decoded = decodeURIComponent(localUrl);
  } catch {
    return '';
  }
  const root = path.resolve(publicRoot);
  const file = path.resolve(root, `.${decoded}`);
  return file.startsWith(`${root}${path.sep}`) ? file : '';
}

function publicAssetExists(rawUrl, publicRoot) {
  const file = publicFileForUrl(rawUrl, publicRoot);
  return Boolean(file && existsSync(file));
}

function srcsetCandidateUrls(srcset) {
  return String(srcset || '')
    .split(',')
    .map((candidate) => candidate.trim().split(/\s+/)[0])
    .filter(Boolean);
}

function verifiedSrcset(srcset, publicRoot) {
  const urls = srcsetCandidateUrls(srcset);
  return urls.length > 0 && urls.every((url) => publicAssetExists(url, publicRoot));
}

function isLocalImageUrl(url, publicRoot) {
  return IMAGE_EXT_RE.test(url) && publicAssetExists(url, publicRoot);
}

function isContentImage(tag, publicRoot) {
  const src = getAttr(tag, 'src') || getAttr(tag, 'data-lazy-src');
  if (!src || !isLocalImageUrl(src, publicRoot)) return false;
  const combined = `${src} ${getAttr(tag, 'class')} ${getAttr(tag, 'alt')}`.toLowerCase();
  return !CONTENT_IMAGE_SKIP_RE.test(combined);
}

function stripWpRocketRuntime(html) {
  let next = html
    .replace(/<!--\s*This website is like a Rocket[\s\S]*?-->\s*/gi, '')
    .replace(/<meta\b[^>]*name=["']generator["'][^>]*WP Rocket[^>]*>\s*/gi, '')
    .replace(/<noscript>\s*<style\b[^>]*id=["']rocket-lazyload-nojs-css["'][\s\S]*?<\/style>\s*<\/noscript>\s*/gi, '')
    .replace(/\sdata-(?:rocket|wpr)-[a-z0-9_-]+(?:=(?:"[^"]*"|'[^']*'|[^\s"'=<>]+))?/gi, '');

  next = next.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, (styleTag) => {
    if (/rocket-lazyload-nojs-css|wpr-lazyrender|rocket-lazyload/i.test(styleTag)) return '';
    return styleTag;
  });

  next = next.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (scriptTag) => {
    const isExternalRocketScript = /wp-rocket\/assets\/js\/lazyload|wpr-beacon/i.test(scriptTag);
    const isInlineRocketRuntime =
      /class\s+RocketLazyLoadScripts|window\.lazyLoadOptions|new LazyLoad\(|lazyLoadThumb\(|rocket_beacon_data|wpr-beacon|RocketElementorPreload|wprRemoveCPCSS/i.test(
        scriptTag,
      );
    return isExternalRocketScript || isInlineRocketRuntime ? '' : scriptTag;
  });

  return next;
}

function recoverNoscriptResponsiveImages(html, publicRoot) {
  return html.replace(
    /(<img\b[^>]*>)\s*<noscript>\s*(<img\b[^>]*>)\s*<\/noscript>/gi,
    (match, activeTag, fallbackTag) => {
      let nextTag = activeTag;
      const fallbackSrc = getAttr(fallbackTag, 'src');
      const activeSrc = getAttr(activeTag, 'src');
      const srcset = getAttr(fallbackTag, 'srcset');
      const sizes = getAttr(fallbackTag, 'sizes');

      if (fallbackSrc && (!activeSrc || activeSrc.startsWith('data:')) && publicAssetExists(fallbackSrc, publicRoot)) {
        nextTag = setAttr(nextTag, 'src', fallbackSrc);
      }
      if (!getAttr(nextTag, 'alt') && getAttr(fallbackTag, 'alt')) {
        nextTag = setAttr(nextTag, 'alt', getAttr(fallbackTag, 'alt'));
      }
      if (srcset && verifiedSrcset(srcset, publicRoot)) {
        nextTag = setAttr(nextTag, 'srcset', srcset);
        if (sizes) nextTag = setAttr(nextTag, 'sizes', sizes);
        return nextTag;
      }

      const normalizedActive = normalizeLocalUrl(getAttr(nextTag, 'src'));
      const normalizedFallback = normalizeLocalUrl(fallbackSrc);
      if (normalizedActive && normalizedActive === normalizedFallback) {
        return nextTag;
      }
      return match;
    },
  );
}

function promoteLazyEmbeds(html) {
  let next = html.replace(/<iframe\b[^>]*>/gi, (tag) => {
    const lazySrc = getAttr(tag, 'data-lazy-src');
    const src = getAttr(tag, 'src');
    if (!lazySrc || (src && src !== 'about:blank' && !src.startsWith('data:'))) return tag;
    let nextTag = setAttr(tag, 'src', lazySrc);
    if (!getAttr(nextTag, 'loading')) nextTag = setAttr(nextTag, 'loading', 'lazy');
    nextTag = removeAttr(nextTag, 'data-lazy-src');
    return nextTag;
  });

  next = next.replace(
    /(<iframe\b[^>]*><\/iframe>)\s*<noscript>\s*(<iframe\b[\s\S]*?<\/iframe>)\s*<\/noscript>/gi,
    (match, activeTag, fallbackTag) => {
      const activeSrc = getAttr(activeTag, 'src');
      const fallbackSrc = getAttr(fallbackTag, 'src');
      return activeSrc && activeSrc === fallbackSrc ? activeTag : match;
    },
  );

  return next;
}

function collectStylesheetUrls(html) {
  const urls = [];
  html.replace(/<link\b[^>]*>/gi, (tag) => {
    const rel = getAttr(tag, 'rel');
    const href = getAttr(tag, 'href');
    if (/\bstylesheet\b/i.test(rel) && /\/wp-content\/uploads\/elementor\/css\/post-[^/]+\.css/i.test(href)) {
      urls.push(href);
    }
    return tag;
  });
  return urls;
}

function collectHeroBackgroundCandidates(html, publicRoot, slug = '') {
  const candidates = [];
  for (const stylesheetUrl of collectStylesheetUrls(html)) {
    const cssFile = publicFileForUrl(stylesheetUrl, publicRoot);
    if (!cssFile || !existsSync(cssFile)) continue;
    const css = readFileSync(cssFile, 'utf8');
    css.replace(/background-image\s*:\s*url\((['"]?)([^'")]+)\1\)/gi, (_match, _quote, rawUrl) => {
      const url = normalizeLocalUrl(rawUrl);
      if (!url || !IMAGE_EXT_RE.test(url) || !publicAssetExists(url, publicRoot)) return '';
      const filename = path.basename(url).toLowerCase();
      let score = 0;
      if (HERO_NAME_RE.test(filename)) score += 20;
      if (slug && filename.includes(slug.replace(/-/g, '-').toLowerCase())) score += 6;
      if (SECONDARY_BACKGROUND_RE.test(filename)) score -= 8;
      if (CONTENT_IMAGE_SKIP_RE.test(filename)) score -= 20;
      candidates.push({ url, score });
      return '';
    });
  }
  return candidates.sort((a, b) => b.score - a.score);
}

function ensureHeroBackgroundPreload(html, publicRoot, slug = '') {
  if (/<link\b(?=[^>]*\brel=["']?preload\b)(?=[^>]*\bas=["']?image\b)[^>]*>/i.test(html)) {
    return html;
  }
  const candidate = collectHeroBackgroundCandidates(html, publicRoot, slug)[0];
  if (!candidate || candidate.score < 0) return html;
  const preload = `<link rel="preload" as="image" href="${escapeAttr(candidate.url)}" fetchpriority="high">`;
  return html.replace(/<\/head>/i, `${preload}</head>`);
}

function tuneImagePriorities(html, publicRoot) {
  let contentImageIndex = 0;
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    if (!isContentImage(tag, publicRoot)) return tag;
    let nextTag = setAttr(tag, 'decoding', 'async');
    if (contentImageIndex === 0) {
      nextTag = setAttr(nextTag, 'loading', 'eager');
      nextTag = setAttr(nextTag, 'fetchpriority', 'high');
    } else {
      nextTag = setAttr(nextTag, 'loading', 'lazy');
      nextTag = setAttr(nextTag, 'fetchpriority', 'low');
    }
    contentImageIndex += 1;
    return nextTag;
  });
}

export function optimizeLegacyPerformanceHtml(html, options = {}) {
  const publicRoot = options.publicRoot || path.join(process.cwd(), 'public');
  const slug = options.slug || '';
  let next = html;
  next = stripWpRocketRuntime(next);
  next = recoverNoscriptResponsiveImages(next, publicRoot);
  next = promoteLazyEmbeds(next);
  next = ensureHeroBackgroundPreload(next, publicRoot, slug);
  next = tuneImagePriorities(next, publicRoot);
  return next.replace(/[ \t]+$/gm, '').replace(/\n{2,}$/u, '\n');
}

export function summarizeLegacyPerformanceHtml(html) {
  return {
    bytes: Buffer.byteLength(html),
    scripts: countMatches(html, /<script\b/gi),
    stylesheets: countMatches(html, /<link\b(?=[^>]*\brel=["']?stylesheet\b)/gi),
    inlineStyles: countMatches(html, /<style\b/gi),
    images: countMatches(html, /<img\b/gi),
    preloadImages: countMatches(html, /<link\b(?=[^>]*\brel=["']?preload\b)(?=[^>]*\bas=["']?image\b)/gi),
    preloadFonts: countMatches(html, /<link\b(?=[^>]*\brel=["']?preload\b)(?=[^>]*\bas=["']?font\b)/gi),
    responsiveImages: countMatches(html, /<img\b(?=[^>]*\bsrcset=)/gi),
    noscriptImages: countMatches(html, /<noscript>\s*<img\b/gi),
    lazyEmbeds: countMatches(html, /<iframe\b(?=[^>]*\bdata-lazy-src=)/gi),
    rocketMarkers: countMatches(html, WP_ROCKET_MARKER_RE),
    highPriorityImages: countMatches(html, /<img\b(?=[^>]*\bfetchpriority=["']high["'])/gi),
    lowPriorityImages: countMatches(html, /<img\b(?=[^>]*\bfetchpriority=["']low["'])/gi),
    integrationMarkers: countMatches(html, /runtime-gtm|googletagmanager|fbevents|facebook\.com|api\/contact|wa\.me|whatsapp/gi),
  };
}
