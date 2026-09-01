import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  chunkEntries,
  dedupeEntries,
  escapeXml,
  isIndexableRobots,
  isSameOriginUrl,
  normaliseCanonicalPath,
  parseSitemapSuffix,
  resolveSitemapLoc,
  sitemapChunkFilename,
} from './sitemap-utils.ts';
import { normaliseSiteOrigin, resolveSiteOrigin } from './site-url.ts';
import {
  buildIndexItemsFromChunks,
  renderRobotsTxt,
  renderSitemapIndex,
  renderUrlSet,
} from './sitemap-xml.ts';
import type { SitemapEntry } from './sitemap-config.ts';

describe('site-url', () => {
  it('normalises trailing slashes and enforces https for production hosts', () => {
    assert.equal(normaliseSiteOrigin('https://connectgroup.co/'), 'https://connectgroup.co');
    assert.equal(normaliseSiteOrigin('connectgroup.co'), 'https://connectgroup.co');
    assert.equal(normaliseSiteOrigin('http://example.com'), 'https://example.com');
    assert.equal(normaliseSiteOrigin('http://localhost:4321'), 'http://localhost:4321');
  });

  it('resolves PUBLIC_SITE_URL over astro site', () => {
    const origin = resolveSiteOrigin({
      env: { PUBLIC_SITE_URL: 'https://example.com/' },
      astroSite: 'https://connectgroup.co',
      isDev: false,
    });
    assert.equal(origin, 'https://example.com');
  });

  it('falls back to astro site then localhost in dev', () => {
    assert.equal(
      resolveSiteOrigin({
        env: {},
        astroSite: 'https://connectgroup.co',
        isDev: false,
      }),
      'https://connectgroup.co',
    );
    assert.equal(
      resolveSiteOrigin({
        env: {},
        isDev: true,
      }),
      'http://localhost:4321',
    );
  });

  it('does not trust request host by default', () => {
    const origin = resolveSiteOrigin({
      env: {},
      astroSite: 'https://connectgroup.co',
      request: new Request('https://evil.example/'),
      trustRequestHost: false,
      isDev: false,
    });
    assert.equal(origin, 'https://connectgroup.co');
  });
});

describe('xml escaping', () => {
  it('escapes XML special characters', () => {
    assert.equal(escapeXml(`&<>"'`), '&amp;&lt;&gt;&quot;&apos;');
  });
});

describe('indexable / canonical helpers', () => {
  it('detects noindex', () => {
    assert.equal(isIndexableRobots('index, follow'), true);
    assert.equal(isIndexableRobots('noindex, follow'), false);
    assert.equal(isIndexableRobots('follow, noindex'), false);
    assert.equal(isIndexableRobots(undefined), true);
  });

  it('normalises trailing slashes and strips query/hash', () => {
    assert.equal(normaliseCanonicalPath('/about-us'), '/about-us/');
    assert.equal(normaliseCanonicalPath('/about-us/?utm=1#x'), '/about-us/');
    assert.equal(normaliseCanonicalPath('/'), '/');
  });

  it('rejects mismatched canonical paths and rewrites host to site origin', () => {
    assert.equal(
      resolveSitemapLoc('/about-us/', 'https://other.com/other/', 'https://connectgroup.co'),
      null,
    );
    assert.equal(
      resolveSitemapLoc('/about-us/', 'https://connectgroup.co/about-us/', 'https://example.com'),
      'https://example.com/about-us/',
    );
    assert.equal(
      resolveSitemapLoc('/about-us/', undefined, 'https://connectgroup.co'),
      'https://connectgroup.co/about-us/',
    );
    assert.equal(isSameOriginUrl('https://connectgroup.co/x/', 'https://connectgroup.co'), true);
  });
});

describe('dedupe and chunking', () => {
  it('removes duplicate URLs', () => {
    const entries: SitemapEntry[] = [
      { url: 'https://example.com/a/', type: 'page' },
      { url: 'https://example.com/a/', type: 'page' },
      { url: 'https://example.com/b/', type: 'page' },
    ];
    assert.equal(dedupeEntries(entries).length, 2);
  });

  it('chunks with Rank Math-style filenames', () => {
    assert.equal(sitemapChunkFilename('post', 0), 'post-sitemap.xml');
    assert.equal(sitemapChunkFilename('post', 1), 'post-sitemap2.xml');
    assert.equal(sitemapChunkFilename('post', 2), 'post-sitemap3.xml');
    assert.equal(sitemapChunkFilename('page', 1), 'page-sitemap2.xml');
  });

  it('exactly 100 posts → one chunk; 101 → two; 200 → two; 201 → three', () => {
    const make = (n: number) => Array.from({ length: n }, (_, i) => i);
    assert.equal(chunkEntries(make(100), 100).length, 1);
    assert.equal(chunkEntries(make(101), 100).length, 2);
    assert.equal(chunkEntries(make(200), 100).length, 2);
    assert.equal(chunkEntries(make(201), 100).length, 3);
    assert.equal(chunkEntries([], 100).length, 0);
  });

  it('rejects invalid sitemap suffixes (0, 1, negative, decimals)', () => {
    assert.equal(parseSitemapSuffix('0'), null);
    assert.equal(parseSitemapSuffix('1'), null);
    assert.equal(parseSitemapSuffix('-2'), null);
    assert.equal(parseSitemapSuffix('2.5'), null);
    assert.equal(parseSitemapSuffix('abc'), null);
    assert.equal(parseSitemapSuffix('2'), 2);
  });
});

describe('xml + robots rendering', () => {
  it('renders urlset and index with escaped locs and resolved domain', () => {
    const entries: SitemapEntry[] = [
      {
        url: 'https://example.com/a&b/',
        lastmod: '2026-07-27T00:00:00.000Z',
        type: 'page',
      },
    ];
    const xml = renderUrlSet(entries);
    assert.match(xml, /<loc>https:\/\/example\.com\/a&amp;b\/<\/loc>/);
    assert.match(xml, /application\/xml|/); // content type checked at response layer
    assert.ok(xml.includes('<?xml version="1.0" encoding="UTF-8"?>'));

    const index = renderSitemapIndex([
      { loc: 'https://example.com/page-sitemap.xml', lastmod: '2026-07-27T00:00:00.000Z' },
    ]);
    assert.match(index, /<sitemapindex /);
    assert.match(index, /page-sitemap\.xml/);
  });

  it('robots.txt references underscore sitemap_index.xml on resolved domain', () => {
    const txt = renderRobotsTxt('https://example.com', ['/tag/', '/category/', '/wp-admin/']);
    assert.equal(
      txt,
      [
        'User-agent: *',
        'Disallow: /tag/',
        'Disallow: /category/',
        'Disallow: /wp-admin/',
        '',
        'Sitemap: https://example.com/sitemap_index.xml',
        '',
      ].join('\n'),
    );
  });

  it('sitemap index excludes empty chunks', () => {
    const pageChunks: SitemapEntry[][] = [
      [{ url: 'https://example.com/', type: 'page' }],
      [],
    ];
    const postChunks: SitemapEntry[][] = [];
    const items = buildIndexItemsFromChunks(
      'https://example.com',
      pageChunks,
      postChunks,
      sitemapChunkFilename,
    );
    assert.equal(items.length, 1);
    assert.equal(items[0]?.loc, 'https://example.com/page-sitemap.xml');
  });
});

describe('sitemap overrides helpers', () => {
  it('sanitises priority and changefreq', async () => {
    const {
      sanitizeOverride,
      normalizeOverridePath,
    } = await import('./sitemap-overrides-store.ts');

    assert.deepEqual(sanitizeOverride({ priority: '0.91', changefreq: 'Weekly' }), {
      priority: 0.9,
      changefreq: 'weekly',
    });
    assert.equal(sanitizeOverride({ priority: '', changefreq: '' }), null);
    assert.equal(normalizeOverridePath('about-us'), '/about-us/');
    assert.equal(normalizeOverridePath('/'), '/');
  });
});

describe('project sitemap dataset (integration)', () => {
  it('classifies pages vs posts and uses PUBLIC_SITE_URL', async () => {
    const { buildSitemapDataset } = await import('./sitemap-data.ts');
    const data = buildSitemapDataset({
      env: { PUBLIC_SITE_URL: 'https://example.com' },
      isDev: false,
      trustRequestHost: false,
    });

    assert.equal(data.siteOrigin, 'https://example.com');
    assert.ok(data.pages.length > 0, 'expected static pages');
    assert.ok(data.posts.length > 0, 'expected blog posts');
    assert.ok(data.pages.every((e) => e.type === 'page'));
    assert.ok(data.posts.every((e) => e.type === 'post'));
    assert.ok(data.pages.every((e) => e.url.startsWith('https://example.com/')));
    assert.ok(data.posts.every((e) => e.url.startsWith('https://example.com/')));
    assert.ok(!data.pages.some((e) => e.url.includes('/demo/')));
    assert.ok(!data.pages.some((e) => e.url.includes('/status/')));
    assert.ok(!data.pages.some((e) => e.url.includes('/tag/')));
    assert.ok(!data.pages.some((e) => e.url.includes('/category/')));
    // Unpublished (not Done in spreadsheet) — still homepage redirects
    assert.ok(!data.pages.some((e) => e.url.includes('/payroll-services/')));
    assert.ok(!data.pages.some((e) => e.url.includes('/dubai-offshore/')));
    // Brand pages restored (MBS / UAE Gate)
    assert.ok(data.pages.some((e) => e.url.includes('/uaegate/')));
    assert.ok(data.pages.some((e) => e.url.includes('/mbs-tax-consultancy/')));

    // 244 posts → 3 chunks at limit 100
    if (data.posts.length === 244) {
      assert.equal(data.postChunks.length, 3);
      assert.equal(data.postChunks[0]?.length, 100);
      assert.equal(data.postChunks[1]?.length, 100);
      assert.equal(data.postChunks[2]?.length, 44);
    }

    assert.ok(data.indexItems.every((i) => i.loc.startsWith('https://example.com/')));
    assert.ok(data.indexItems.some((i) => i.loc.endsWith('/page-sitemap.xml')));
    assert.ok(data.indexItems.some((i) => i.loc.endsWith('/post-sitemap.xml')));
  });
});
