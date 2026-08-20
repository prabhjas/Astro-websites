/**
 * Visible Rank Math–style breadcrumbs for KPM Pro inner pages.
 * Trail follows the primary header menu (src/legacy/chrome/header.html).
 */

import { isPostSlug } from './inventory.js';

const SITE_ORIGIN = (process.env.PUBLIC_SITE_URL || process.env.SITE_URL || 'https://kpmpro.ae')
  .trim()
  .replace(/\/$/, '');

/** @type {Record<string, { name: string, parents: Array<{ name: string, href?: string }> }>} */
const PAGE_TRAILS = {
  '/ded-services/': { name: 'DED Services', parents: [] },
  '/trade-license-amendment/': {
    name: 'Trade License Amendment',
    parents: [{ name: 'DED Services', href: '/ded-services/' }],
  },
  '/trade-license-renewal/': {
    name: 'Trade License Renewal',
    parents: [{ name: 'DED Services', href: '/ded-services/' }],
  },
  '/trade-license-cancellation/': {
    name: 'Trade License Cancellation',
    parents: [{ name: 'DED Services', href: '/ded-services/' }],
  },
  '/uae-government-entity-approvals/': { name: 'Government Entity Approvals', parents: [] },
  '/ded-initial-approval/': {
    name: 'DED Initial Approval',
    parents: [{ name: 'Government Entity Approvals', href: '/uae-government-entity-approvals/' }],
  },
  '/dubai-municipality-approval/': {
    name: 'Dubai Municipality Approval',
    parents: [{ name: 'Government Entity Approvals', href: '/uae-government-entity-approvals/' }],
  },
  '/dubai-environmental-approval/': {
    name: 'Dubai Environmental Approval',
    parents: [{ name: 'Government Entity Approvals', href: '/uae-government-entity-approvals/' }],
  },
  '/rta-approval-and-permit/': {
    name: 'RTA Approval and Permit',
    parents: [{ name: 'Government Entity Approvals', href: '/uae-government-entity-approvals/' }],
  },
  '/uae-golden-visa/': {
    name: 'UAE Golden visa',
    parents: [{ name: 'Visa Services' }],
  },
  '/entrepreneur-visa-dubai/': {
    name: 'Entrepreneur Visa Dubai',
    parents: [{ name: 'Visa Services' }, { name: 'UAE Golden visa', href: '/uae-golden-visa/' }],
  },
  '/retirement-visa-dubai/': {
    name: 'Retirement Visa Dubai',
    parents: [{ name: 'Visa Services' }, { name: 'UAE Golden visa', href: '/uae-golden-visa/' }],
  },
  '/investor-visa-dubai/': {
    name: 'Investor Visa Dubai',
    parents: [{ name: 'Visa Services' }, { name: 'UAE Golden visa', href: '/uae-golden-visa/' }],
  },
  '/uae-visit-visa/': { name: 'UAE Visit Visa', parents: [{ name: 'Visa Services' }] },
  '/work-residency-visa/': { name: 'Work & Residency Visa', parents: [{ name: 'Visa Services' }] },
  '/work-residency-visa-renewal/': {
    name: 'Work & Residency Visa Renewal',
    parents: [{ name: 'Visa Services' }],
  },
  '/dependent-visa-service/': { name: 'Dependent Visa', parents: [{ name: 'Visa Services' }] },
  '/uae-visa-cancellation/': { name: 'UAE Visa Cancellation', parents: [{ name: 'Visa Services' }] },
  '/dependent-work-residency-visa-cancellation/': {
    name: 'Dependent Work & Residency Visa cancellation',
    parents: [{ name: 'Visa Services' }, { name: 'UAE Visa Cancellation', href: '/uae-visa-cancellation/' }],
  },
  '/work-residency-visa-cancellation/': {
    name: 'Work & Residency Visa Cancellation',
    parents: [{ name: 'Visa Services' }, { name: 'UAE Visa Cancellation', href: '/uae-visa-cancellation/' }],
  },
  '/legal-translation/': { name: 'Legal translation', parents: [{ name: 'Legal' }] },
  '/uae-attestation/': { name: 'UAE Attestation', parents: [{ name: 'Legal' }] },
  '/company-liquidation/': { name: 'Company Liquidation', parents: [{ name: 'Legal' }] },
  '/memorandum-of-association-amendment/': {
    name: 'Memorandum of Association Amendment',
    parents: [{ name: 'Legal' }],
  },
  '/labor-contract-modification/': { name: 'Labor Contract Modification', parents: [{ name: 'Legal' }] },
  '/establishment-card-renewal/': { name: 'Establishment Card Renewal', parents: [{ name: 'Legal' }] },
  '/company-immigration-card/': { name: 'Company Immigration Card', parents: [{ name: 'Legal' }] },
  '/employment-contract-amendment/': {
    name: 'Employment Contract Amendment',
    parents: [{ name: 'Legal' }],
  },
  '/blog/': { name: 'Insights', parents: [] },
  '/about-us/': { name: 'About us', parents: [] },
  '/contact-us/': { name: 'Contact us', parents: [] },
  '/author/': { name: 'Authors', parents: [{ name: 'Insights', href: '/blog/' }] },
};

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function titleFromSlug(slug) {
  const last = String(slug || '')
    .split('/')
    .filter(Boolean)
    .pop();
  if (!last) return 'Page';
  return last.replace(/-/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function decodeBasicEntities(value) {
  let out = String(value || '');
  for (let i = 0; i < 3; i += 1) {
    const next = out
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#039;/g, "'")
      .replace(/&quot;/g, '"');
    if (next === out) break;
    out = next;
  }
  return out;
}

function titleFromDocument(html) {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!h1) return '';
  return decodeBasicEntities(h1[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
}

function isBlogPost(slug, html) {
  return isPostSlug(slug) || /elementor-location-single/i.test(html);
}

function pagePath(slug) {
  if (!slug || slug === 'homepage') return '/';
  const clean = String(slug).replace(/^\/|\/$/g, '');
  return `/${clean}/`;
}

/**
 * @param {string} slug
 * @param {string} html
 * @returns {Array<{ name: string, href?: string }>}
 */
export function buildPageCrumbs(slug, html) {
  const path = pagePath(slug);
  if (path === '/') return [{ name: 'Home' }];

  const mapped = PAGE_TRAILS[path];
  const currentName = mapped?.name || titleFromDocument(html) || titleFromSlug(slug);

  if (isBlogPost(slug, html)) {
    return [
      { name: 'Home', href: '/' },
      { name: 'Insights', href: '/blog/' },
      { name: currentName },
    ];
  }

  const parents = mapped?.parents || [];
  return [{ name: 'Home', href: '/' }, ...parents, { name: currentName }];
}

function renderNav(crumbs, { blogPost = false } = {}) {
  const navClass = blogPost ? 'kpm-breadcrumbs kpm-breadcrumbs--blog' : 'kpm-breadcrumbs';
  const items = crumbs
    .map((crumb, i) => {
      const last = i === crumbs.length - 1;
      if (last || !crumb.href) {
        return `<span class="kpm-breadcrumbs__item kpm-breadcrumbs__item--current">${escapeHtml(crumb.name)}</span>`;
      }
      return `<a class="kpm-breadcrumbs__item" href="${escapeHtml(crumb.href)}">${escapeHtml(crumb.name)}</a>`;
    })
    .join('<span class="kpm-breadcrumbs__sep" aria-hidden="true">/</span>');

  return `<nav class="${navClass}" aria-label="Breadcrumb">${items}</nav>`;
}

function renderJsonLd(crumbs, slug) {
  const pageUrl = slug
    ? `${SITE_ORIGIN}/${String(slug).replace(/^\/|\/$/g, '')}/`
    : `${SITE_ORIGIN}/`;
  const itemListElement = crumbs.map((crumb, i) => {
    const isLast = i === crumbs.length - 1;
    const item = crumb.href
      ? `${SITE_ORIGIN}${crumb.href === '/' ? '/' : crumb.href}`
      : isLast
        ? pageUrl
        : `${SITE_ORIGIN}/`;
    return {
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.name,
      item,
    };
  });
  const payload = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement,
  };
  return `<script type="application/ld+json">${JSON.stringify(payload)}</script>`;
}

const BREADCRUMB_CSS = `
<style id="kpm-breadcrumbs-css">
.kpm-breadcrumbs{margin:0 0 12px;padding:0;font-size:14px;line-height:1.5;color:#fff;display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.kpm-breadcrumbs__item{color:#fff !important;text-decoration:none;font-weight:500;opacity:1}
a.kpm-breadcrumbs__item:hover{color:#d3a159 !important;text-decoration:underline}
.kpm-breadcrumbs__item--current{color:#d3a159 !important;font-weight:600}
.kpm-breadcrumbs__sep{color:#fff !important;opacity:.75}
.kpm-breadcrumbs--blog{margin:0 0 1rem;padding:0;font-size:14px;line-height:1.5;color:#666;display:flex;flex-wrap:wrap;align-items:center;gap:0}
.kpm-breadcrumbs--blog .kpm-breadcrumbs__item{color:#23369b !important;text-decoration:none;font-weight:500;opacity:1}
.kpm-breadcrumbs--blog a.kpm-breadcrumbs__item:hover{color:#0f2a48 !important;text-decoration:underline}
.kpm-breadcrumbs--blog .kpm-breadcrumbs__item--current{color:#333 !important;font-weight:500}
.kpm-breadcrumbs--blog .kpm-breadcrumbs__sep{color:#999 !important;opacity:1;margin:0 6px}
@media (max-width:767px){.kpm-breadcrumbs{margin:0 0 10px;font-size:13px}.kpm-breadcrumbs--blog{font-size:13px}}
</style>`;

/**
 * Inject visible breadcrumbs immediately above the page H1 (not in the site header).
 * Homepage is skipped — a full-bleed hero has no content heading slot.
 * @param {string} html
 * @param {string} slug
 */
export function injectPageBreadcrumbs(html, slug) {
  if (!html) return html;
  if (/class="astro-blog-breadcrumb"/i.test(html)) return html;
  if (!slug || slug === 'homepage') return html;

  const crumbs = buildPageCrumbs(slug, html);
  const blogPost = isBlogPost(slug, html);
  const nav = renderNav(crumbs, { blogPost });
  const jsonLd = renderJsonLd(crumbs, slug);
  let out = html;

  // Replace previously injected breadcrumbs so blog posts pick up Insights styling.
  out = out.replace(/<nav class="kpm-breadcrumbs[^"]*"[\s\S]*?<\/nav>\s*/i, '');

  if (!/id="kpm-breadcrumbs-css"/i.test(out)) {
    out = out.replace(/<\/head>/i, `${BREADCRUMB_CSS}\n</head>`);
  }
  if (!/BreadcrumbList/i.test(out)) {
    out = out.replace(/<\/head>/i, `${jsonLd}\n</head>`);
  }

  // Prefer the first H1 in #content / main; fall back to the first page H1.
  const contentStart = out.search(/id="content"/i);
  const searchFrom = contentStart >= 0 ? contentStart : 0;
  const h1Rel = out.slice(searchFrom).search(/<h1\b/i);
  if (h1Rel >= 0) {
    const h1At = searchFrom + h1Rel;
    return `${out.slice(0, h1At)}${nav}\n${out.slice(h1At)}`;
  }
  return out;
}
