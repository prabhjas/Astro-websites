import { sanitizeMirrorHtml, absolutizeMirrorSeoHtml } from '@connect/site-cms';
/**
 * Serve a Phase 1 cleaned WordPress HTML mirror from src/legacy/<slug>.cleaned.html
 * Applies shared Header/Footer chrome for all slugs except homepage.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { injectRuntimeGtmLoader } from './gtm/inject.ts';
import { notFoundResponse } from './not-found.js';
import { applySharedChrome } from './shared-chrome.js';
import { buildPostAuthorBoxHtml, isIndexedBlogPostSlug } from './authors.ts';

const SITE_ORIGIN = (process.env.PUBLIC_SITE_URL || process.env.SITE_URL || '')
  .trim()
  .replace(/\/$/, '');

/** @param {string} value */
function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {Array<{ name: string; url?: string }>} crumbs
 * @param {{ center?: boolean }} [opts]
 */
function buildPageBreadcrumbHtml(crumbs, opts = {}) {
  if (!crumbs?.length) return '';
  const items = crumbs
    .map((crumb, i) => {
      const isLast = i === crumbs.length - 1;
      if (isLast || !crumb.url) {
        return `<span class="cfs-page-breadcrumb__current">${escapeHtml(crumb.name)}</span>`;
      }
      return `<a href="${escapeHtml(crumb.url)}">${escapeHtml(crumb.name)}</a>`;
    })
    .join('<span aria-hidden="true"> / </span>');
  const centerClass = opts.center ? ' cfs-page-breadcrumb--center' : '';
  return `<nav class="cfs-page-breadcrumb${centerClass}" aria-label="Breadcrumb">${items}</nav>`;
}

/** @param {string} html */
function extractEntryTitle(html) {
  const match = html.match(/<h1[^>]*class="[^"]*entry-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i);
  if (!match) return '';
  return match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Visible breadcrumbs on /services/, /law/, and blog singles (author-page style).
 * @param {string} html
 * @param {string} slug
 */
function injectPageBreadcrumbs(html, slug) {
  if (!html || html.includes('cfs-page-breadcrumb')) return html;

  const norm = String(slug || '')
    .replace(/^\/+|\/+$/g, '')
    .toLowerCase();

  if (norm === 'services') {
    const nav = buildPageBreadcrumbHtml(
      [
        { name: 'Home', url: '/' },
        { name: 'Services' },
      ],
      { center: true },
    );
    if (/elementor-element-2758c33/i.test(html)) {
      return html.replace(
        /(<div[^>]*class="[^"]*elementor-element-2758c33[^"]*"[^>]*>)/i,
        `${nav}\n$1`,
      );
    }
    return html.replace(
      /(<span class="elementor-heading-title elementor-size-default">Our Services<\/span>)/i,
      `${nav}$1`,
    );
  }

  if (norm === 'law') {
    // Inject into the Elementor hero (page-header is covered by hero negative margin).
    const nav = buildPageBreadcrumbHtml(
      [
        { name: 'Home', url: '/' },
        { name: 'Law' },
      ],
      { center: true },
    );
    if (/elementor-element-3b2edc6/i.test(html)) {
      return html.replace(
        /(<div[^>]*class="[^"]*elementor-element-3b2edc6[^"]*"[^>]*>)/i,
        `${nav}\n$1`,
      );
    }
    return html.replace(
      /(<h2 class="elementor-heading-title elementor-size-default">Legal Information)/i,
      `${nav}$1`,
    );
  }

  if (isIndexedBlogPostSlug(slug)) {
    const title = extractEntryTitle(html) || 'Article';
    const nav = buildPageBreadcrumbHtml([
      { name: 'Home', url: '/' },
      { name: 'Blogs', url: '/blogs/' },
      { name: title },
    ]);
    if (/page-header/i.test(html)) {
      return html.replace(
        /(<div[^>]*class="[^"]*page-header[^"]*"[^>]*>\s*)/i,
        `$1${nav}\n`,
      );
    }
    return html.replace(
      /(<h1[^>]*class="[^"]*entry-title[^"]*"[^>]*>)/i,
      `${nav}\n$1`,
    );
  }

  return html;
}

/** @param {string} slug */
export function serveLegacyPage(slug) {
  const cleanedPath = join(process.cwd(), 'src/legacy', `${slug}.cleaned.html`);

  if (!existsSync(cleanedPath)) {
    // Public visitors must get a real 404 — never 503 or internal prepare:page hints.
    console.warn(`[legacy-page] Missing prepared HTML for "${slug}" → 404`);
    return notFoundResponse();
  }

  const path = !slug || slug === 'homepage' ? '/' : `/${String(slug).replace(/^\/|\/$/g, '')}/`;
  const raw = readFileSync(cleanedPath, 'utf-8');
  let html = absolutizeMirrorSeoHtml(injectRuntimeGtmLoader(applySharedChrome(raw, slug)), {
    siteOrigin: SITE_ORIGIN,
    path,
  });

  // WP mirrors sometimes show login emails as author; display brand name + archive link.
  html = html.replace(/muhammad\.faieez@vistaoutsourcing\.com/gi, 'Company Formation Saudi');
  html = html.replace(
    /(<span[^>]*class="[^"]*elementor-post-info__item--type-author[^"]*"[^>]*>)\s*Company Formation Saudi\s*(<\/span>)/gi,
    '$1<a href="/author/company-formation-saudi/">Company Formation Saudi</a>$2',
  );
  html = html.replace(
    /(<span[^>]*itemprop="author"[^>]*>)\s*Company Formation Saudi\s*(<\/span>)/gi,
    '$1<a href="/author/company-formation-saudi/">Company Formation Saudi</a>$2',
  );

  html = injectPageBreadcrumbs(html, slug);

  // Blog posts only (never law): author info card before site footer.
  if (isIndexedBlogPostSlug(slug) && !html.includes('cfs-post-author-box')) {
    const authorBox = buildPostAuthorBoxHtml('company-formation-saudi');
    if (html.includes('ekit-template-content-footer')) {
      html = html.replace(
        /(<div[^>]*class="[^"]*ekit-template-content-footer[^"]*"[^>]*>)/i,
        `${authorBox}\n$1`,
      );
    } else if (/<\/main>/i.test(html)) {
      html = html.replace(/<\/main>/i, `</main>\n${authorBox}`);
    } else if (/<\/body>/i.test(html)) {
      html = html.replace(/<\/body>/i, `${authorBox}\n</body>`);
    }
  }

  // Cloudflare email protection is not available locally — decode obfuscated addresses.
  if (!html.includes('cf-email-decode.js')) {
    html = html.replace(
      /<\/body>/i,
      '<script src="/js/cf-email-decode.js" defer></script>\n</body>',
    );
  }

  // CF7 → /api/contact + Ads/UTM capture (also injected at prepare time; keep as runtime safety).
  if (!html.includes('astro-mirror-fixes.js')) {
    html = html.replace(
      /<\/body>/i,
      '<script src="/js/astro-mirror-fixes.js" defer></script>\n</body>',
    );
  }

  // Site CSS overrides (e.g. hide Smart Slider Learn More on homepage cards).
  if (!html.includes('cfs-site-fixes.css')) {
    html = html.replace(
      /<\/head>/i,
      '<link rel="stylesheet" href="/css/cfs-site-fixes.css" data-cfs-site-fixes="1" />\n</head>',
    );
  }

  // Category Ajax Filter → Astro CAF API (WP admin-ajax is not available).
  if (html.includes('tc_caf_ajax') || html.includes('caf-post-layout-container')) {
    html = html.replace(
      /var tc_caf_ajax\s*=\s*\{[\s\S]*?\};\s*\n/,
      'var tc_caf_ajax = {"ajax_url":"/api/blog/caf/","nonce":"local","plugin_path":"/wp-content/plugins/category-ajax-filter/"};\n',
    );
  }

  // /law/ Load More → Astro load-more API (ECS admin-ajax is not available).
  if (
    (slug === 'law' || html.includes('ecs-load-more-button')) &&
    !html.includes('cfs-law-load-more.js')
  ) {
    html = html.replace(
      /<\/body>/i,
      '<script src="/js/cfs-law-load-more.js" defer></script>\n</body>',
    );
  }

  html = sanitizeMirrorHtml(html);
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0',
    },
  });
}
