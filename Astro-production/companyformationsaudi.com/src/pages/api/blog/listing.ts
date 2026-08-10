import type { APIRoute } from 'astro';
import { getAllBlogPosts, type BlogPost } from '../../../lib/blog';
import { getIndexedPosts, type IndexedPost } from '../../../lib/posts-index';

export const prerender = false;

const PER_PAGE_DEFAULT = 9;

function formatCardDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(+d)) return '';
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function categorySlugFromIndexed(post: IndexedPost): string {
  const c = post.categories?.[0];
  return (c?.slug || '').toLowerCase();
}

function categoryLabelFromIndexed(post: IndexedPost): string {
  return post.categories?.[0]?.name || '';
}

function categorySlug(post: BlogPost): string {
  const c = post.categories?.[0];
  if (!c) return '';
  return (c.slug || c.name || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-');
}

function categoryLabel(post: BlogPost): string {
  return post.categories?.[0]?.name || '';
}

function matchesCategoryIndexed(post: IndexedPost, category: string): boolean {
  if (!category || category === 'all') return true;
  const want = category.toLowerCase();
  return (post.categories || []).some((c) => {
    const slug = (c.slug || '').toLowerCase();
    const name = (c.name || '').toLowerCase().replace(/\s+/g, '-');
    return slug === want || name === want || String(c.id) === want;
  });
}

function matchesCategory(post: BlogPost, category: string): boolean {
  if (!category || category === 'all') return true;
  const want = category.toLowerCase();
  return (post.categories || []).some((c) => {
    const slug = (c.slug || '').toLowerCase();
    const name = (c.name || '').toLowerCase().replace(/\s+/g, '-');
    return slug === want || name === want;
  });
}

function buildPaginationHtml(page: number, totalPages: number): string {
  if (totalPages <= 1) return '';
  const parts: string[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === page) {
      parts.push(`<span class="page-numbers current">${i}</span>`);
    } else {
      parts.push(`<a class="page-numbers" href="#">${i}</a>`);
    }
  }
  return parts.join('');
}

async function handle(request: Request): Promise<Response> {
  let category = 'all';
  let page = 1;
  let postsPerPage = PER_PAGE_DEFAULT;

  if (request.method === 'POST') {
    const ct = request.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      category = String(body.category || 'all');
      page = Math.max(1, Number(body.page) || 1);
      postsPerPage = Math.min(24, Math.max(1, Number(body.posts_per_page) || PER_PAGE_DEFAULT));
    } else {
      const form = await request.formData().catch(() => null);
      if (form) {
        category = String(form.get('category') || 'all');
        page = Math.max(1, Number(form.get('page')) || 1);
        postsPerPage = Math.min(
          24,
          Math.max(1, Number(form.get('posts_per_page')) || PER_PAGE_DEFAULT),
        );
      }
    }
  } else {
    const url = new URL(request.url);
    category = url.searchParams.get('category') || 'all';
    page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    postsPerPage = Math.min(
      24,
      Math.max(1, Number(url.searchParams.get('posts_per_page')) || PER_PAGE_DEFAULT),
    );
  }

  const indexed = getIndexedPosts();
  if (indexed.length) {
    const sorted = indexed.filter((p) => matchesCategoryIndexed(p, category));
    const totalPages = Math.max(1, Math.ceil(sorted.length / postsPerPage));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * postsPerPage;
    const slice = sorted.slice(start, start + postsPerPage);
    return new Response(
      JSON.stringify({
        posts: slice.map((post) => ({
          link: post.url,
          thumbnail: post.image || '',
          author: categoryLabelFromIndexed(post) || 'Company Formation Saudi',
          date: formatCardDate(post.publishedAt),
          title: post.title,
          category: categorySlugFromIndexed(post),
        })),
        pagination: buildPaginationHtml(safePage, totalPages),
        page: safePage,
        total: sorted.length,
        totalPages,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=30',
        },
      },
    );
  }

  const sorted = getAllBlogPosts()
    .filter((p) => matchesCategory(p, category))
    .sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));

  const totalPages = Math.max(1, Math.ceil(sorted.length / postsPerPage));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * postsPerPage;
  const slice = sorted.slice(start, start + postsPerPage);

  return new Response(
    JSON.stringify({
      posts: slice.map((post) => {
        const thumb =
          post.featuredImage?.src ||
          '/wp-content/uploads/2023/08/Logo-Royal-Visa-dark_1-300x178.png';
        return {
          link: `/${post.slug}/`,
          thumbnail: thumb,
          author: categoryLabel(post) || 'Company Formation Saudi',
          date: formatCardDate(post.publishedAt),
          title: post.title,
          category: categorySlug(post),
        };
      }),
      pagination: buildPaginationHtml(safePage, totalPages),
      page: safePage,
      total: sorted.length,
      totalPages,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=30',
      },
    },
  );
}

export const GET: APIRoute = async ({ request }) => handle(request);
export const POST: APIRoute = async ({ request }) => handle(request);
