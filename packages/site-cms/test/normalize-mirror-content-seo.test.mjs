import assert from 'node:assert/strict';
import test from 'node:test';
import { absolutizeMirrorSeoHtml } from '../src/seo/absolutize-mirror-seo.ts';

const origin = 'https://redo.ae';

function pageHtml({ bodyClass, ogType, graph }) {
  return `<!doctype html><html><head>
<title>House Renovation Dubai</title>
<meta name="description" content="House renovation services in Dubai." />
<meta property="og:title" content="House Renovation Dubai" />
<meta property="og:description" content="House renovation services in Dubai." />
<meta property="og:type" content="${ogType}" />
<meta property="og:image" content="/wp-content/uploads/hero.webp" />
<link rel="canonical" href="/redo-house-renovation/" />
<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': graph,
  })}</script>
</head><body class="${bodyClass}"><h1>House Renovation</h1></body></html>`;
}

const orgNode = {
  '@type': ['Person', 'Organization'],
  '@id': '/#organization',
  name: 'Redo',
};
const webPageNode = {
  '@type': 'WebPage',
  '@id': '/redo-house-renovation/',
  url: '/redo-house-renovation/',
  name: 'House Renovation Dubai',
};
const articleNode = {
  '@type': 'Article',
  headline: 'House Renovation Dubai',
  datePublished: '2024-01-01',
};

test('commercial WP pages get og:type=website, drop Article, add Service', () => {
  const html = pageHtml({
    bodyClass: 'wp-singular page-template-default page page-id-5794',
    ogType: 'article',
    graph: [orgNode, webPageNode, articleNode],
  });
  const out = absolutizeMirrorSeoHtml(html, { siteOrigin: origin, path: '/redo-house-renovation/' });
  assert.match(out, /property="og:type" content="website"/);
  assert.doesNotMatch(out, /property="og:type" content="article"/);
  assert.match(out, /"@type":"Service"/);
  assert.doesNotMatch(out, /"@type":"Article"/);
  assert.match(out, /property="og:title" content="House Renovation Dubai"/);
  assert.match(out, /property="og:image" content="https:\/\/redo\.ae\/wp-content\/uploads\/hero\.webp"/);
});

test('insights listing is website without Service or Article', () => {
  const html = pageHtml({
    bodyClass: 'page-template-default page page-id-27',
    ogType: 'article',
    graph: [orgNode, webPageNode, articleNode],
  });
  const out = absolutizeMirrorSeoHtml(html, { siteOrigin: origin, path: '/insights/' });
  assert.match(out, /property="og:type" content="website"/);
  assert.doesNotMatch(out, /"@type":"Article"/);
  assert.doesNotMatch(out, /"@type":"Service"/);
});

test('genuine WP posts keep article OG and Article schema', () => {
  const html = pageHtml({
    bodyClass: 'wp-singular post-template-default single single-post postid-2493',
    ogType: 'article',
    graph: [orgNode, webPageNode, { ...articleNode, '@type': 'BlogPosting' }],
  });
  const out = absolutizeMirrorSeoHtml(html, { siteOrigin: origin, path: '/bathroom-design-trends-2025/' });
  assert.match(out, /property="og:type" content="article"/);
  assert.match(out, /"@type":"BlogPosting"/);
  assert.doesNotMatch(out, /"@type":"Service"/);
});

test('contentKind=article keeps article even on a page body', () => {
  const html = pageHtml({
    bodyClass: 'page page-id-1',
    ogType: 'website',
    graph: [articleNode],
  });
  const out = absolutizeMirrorSeoHtml(html, {
    siteOrigin: origin,
    path: '/my-post/',
    contentKind: 'article',
  });
  assert.match(out, /property="og:type" content="article"/);
  assert.match(out, /"@type":"Article"/);
});
