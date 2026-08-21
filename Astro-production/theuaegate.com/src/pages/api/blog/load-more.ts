import type { APIRoute } from 'astro';
import {
  buildLawCardHtml,
  getIndexedLaw,
  getIndexedPosts,
} from '../../../lib/posts-index';
import {
  ARCHIVE_POSTS_PER_PAGE,
  buildInsightsCardHtml,
  getAllBlogPosts,
} from '../../../lib/blog';

export const prerender = false;

/** Law /law/ page: 6 ECS cards in static HTML, then 6 per Load More. */
const LAW_DEFAULT_PER_PAGE = 6;
const LAW_DEFAULT_OFFSET = 6;

/** Insights fallback (royalvisa-style JSON blog). */
const INSIGHTS_DEFAULT_PER_PAGE = 6;
const INSIGHTS_DEFAULT_OFFSET = 12;

export const GET: APIRoute = async ({ url }) => {
  const type = (url.searchParams.get('type') || 'post').toLowerCase();
  const page = Math.max(1, Number(url.searchParams.get('page') || '1') || 1);

  if (type === 'law') {
    const perPage = Math.min(
      24,
      Math.max(
        1,
        Number(url.searchParams.get('perPage') || LAW_DEFAULT_PER_PAGE) || LAW_DEFAULT_PER_PAGE,
      ),
    );
    const offset = Math.max(
      0,
      Number(url.searchParams.get('offset') || String(LAW_DEFAULT_OFFSET)) || LAW_DEFAULT_OFFSET,
    );
    const sorted = getIndexedLaw();
    const start = offset + Math.max(0, page - 2) * perPage;
    const slice = sorted.slice(start, start + perPage);
    const remaining = Math.max(0, sorted.length - (start + slice.length));
    const hasMore = remaining > 0;
    const html = slice.map((p) => buildLawCardHtml(p)).join('\n');

    return new Response(
      JSON.stringify({
        ok: true,
        type: 'law',
        page,
        perPage,
        offset,
        total: sorted.length,
        totalPages: Math.max(1, Math.ceil((sorted.length - offset) / perPage) + 1),
        hasMore,
        nextPage: hasMore ? page + 1 : null,
        html,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=60',
        },
      },
    );
  }

  // Prefer mirror index for CFS posts; fall back to JSON CMS blog if present.
  const indexed = getIndexedPosts();
  const jsonPosts = getAllBlogPosts();
  const useIndex = indexed.length > 0;

  const perPage = Math.min(
    24,
    Math.max(
      1,
      Number(url.searchParams.get('perPage') || INSIGHTS_DEFAULT_PER_PAGE) ||
        INSIGHTS_DEFAULT_PER_PAGE,
    ),
  );
  const offset = Math.max(
    0,
    Number(url.searchParams.get('offset') || String(INSIGHTS_DEFAULT_OFFSET)) ||
      INSIGHTS_DEFAULT_OFFSET,
  );

  if (useIndex) {
    const sorted = indexed;
    const start = offset + Math.max(0, page - 2) * perPage;
    const slice = sorted.slice(start, start + perPage);
    const remaining = Math.max(0, sorted.length - (start + slice.length));
    const hasMore = remaining > 0;
    // Reuse law-style simplified insight cards via CAF isn't needed here —
    // Insights cards expect BlogPost; emit a minimal ECS-like link card for index posts.
    const html = slice
      .map((p) => {
        const img = p.image
          ? `<img loading="lazy" decoding="async" width="800" height="450" src="${p.image}" class="attachment-large size-large" alt="${p.title.replace(/"/g, '&quot;')}" />`
          : '';
        return `<article class="elementor-post elementor-grid-item ecs-post-loop type-post status-publish has-post-thumbnail hentry"><a href="${p.url}">${img}<h2 class="elementor-heading-title elementor-size-default">${p.title.replace(/</g, '&lt;')}</h2></a></article>`;
      })
      .join('\n');

    return new Response(
      JSON.stringify({
        ok: true,
        type: 'post',
        page,
        perPage,
        offset,
        total: sorted.length,
        totalPages: Math.max(1, Math.ceil((sorted.length - offset) / perPage) + 1),
        hasMore,
        nextPage: hasMore ? page + 1 : null,
        html,
        archivePerPage: ARCHIVE_POSTS_PER_PAGE,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=60',
        },
      },
    );
  }

  const sorted = jsonPosts.sort(
    (a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt),
  );
  const start = offset + Math.max(0, page - 2) * perPage;
  const slice = sorted.slice(start, start + perPage);
  const remaining = Math.max(0, sorted.length - (start + slice.length));
  const hasMore = remaining > 0;
  const html = slice.map((p) => buildInsightsCardHtml(p)).join('\n');

  return new Response(
    JSON.stringify({
      ok: true,
      page,
      perPage,
      offset,
      total: sorted.length,
      totalPages: Math.max(1, Math.ceil((sorted.length - offset) / perPage) + 1),
      hasMore,
      nextPage: hasMore ? page + 1 : null,
      html,
      archivePerPage: ARCHIVE_POSTS_PER_PAGE,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=60',
      },
    },
  );
};
