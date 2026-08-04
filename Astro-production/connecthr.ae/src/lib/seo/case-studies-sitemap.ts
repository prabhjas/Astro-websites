/**
 * Connect HR runs a `case_studies` custom post type (mirrors the live Rank Math
 * case_studies-sitemap.xml). Case studies live in case-studies.json — a separate
 * store from pages/posts — so they get their own sitemap child here rather than
 * leaking into page-sitemap.xml.
 */
import { getCaseStudies } from '../content.ts';
import type { SitemapEntry } from './sitemap-config.ts';
import type { SitemapIndexItem } from './sitemap-xml.ts';
import { resolveSiteOrigin, type ResolveSiteOriginOptions } from './site-url.ts';
import {
  dedupeEntries,
  normaliseCanonicalPath,
  pickLastmod,
  resolveSitemapLoc,
  sortEntries,
} from './sitemap-utils.ts';

export function collectCaseStudyEntries(siteOrigin: string): SitemapEntry[] {
  const entries: SitemapEntry[] = [];
  for (const cs of getCaseStudies()) {
    const path = normaliseCanonicalPath(cs.path || `/case_studies/${cs.slug}/`);
    if (!path) continue;
    const canonical = cs.seo?.canonical || path;
    const url = resolveSitemapLoc(path, canonical || path, siteOrigin);
    if (!url) continue;
    entries.push({
      url,
      lastmod: pickLastmod(cs.modified, cs.date),
      // SitemapEntry.type is page|post in the shared config; case studies render
      // via the same urlset — the type field is not emitted in the XML.
      type: 'page',
    });
  }
  return sortEntries(dedupeEntries(entries));
}

export function caseStudyIndexItem(options: ResolveSiteOriginOptions): SitemapIndexItem | null {
  const siteOrigin = resolveSiteOrigin(options).replace(/\/$/, '');
  const entries = collectCaseStudyEntries(siteOrigin);
  if (!entries.length) return null;
  const newest = entries
    .map((e) => e.lastmod)
    .filter(Boolean)
    .sort()
    .pop();
  return { loc: `${siteOrigin}/case_studies-sitemap.xml`, lastmod: newest };
}
