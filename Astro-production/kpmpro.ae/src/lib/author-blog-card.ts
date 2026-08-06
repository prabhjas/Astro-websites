/**
 * Shared blog card markup for author pages (Astro components + load-more API).
 */
import { getPostExcerpt, getCategorySlug, type BlogPost } from './blog.ts';
import { estimateReadingTime, formatPublishedDate } from './blog-format.ts';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function categoryHref(post: BlogPost): string {
  const cat = post.categories[0];
  if (!cat) return '/blog/';
  if (cat.url) {
    const local = cat.url.replace(/^https:\/\/kpmpro\.ae/i, '');
    return local.endsWith('/') ? local : `${local}/`;
  }
  return `/category/${getCategorySlug(cat)}/`;
}

export function buildAuthorBlogCardHtml(post: BlogPost): string {
  const img = post.featuredImage;
  const imgSrc = img?.src || '';
  const imgAlt = escapeHtml(img?.alt || post.title);
  const postUrl = `/${post.slug}/`;
  const title = escapeHtml(post.title);
  const excerpt = escapeHtml(getPostExcerpt(post, 140));
  const cat = post.categories[0];
  const catName = cat ? escapeHtml(cat.name) : '';
  const catUrl = escapeHtml(categoryHref(post));
  const date = escapeHtml(formatPublishedDate(post.publishedAt));
  const readMins = estimateReadingTime(post);

  const imgTag = imgSrc
    ? `<img loading="lazy" decoding="async" width="640" height="400" src="${escapeHtml(imgSrc)}" alt="${imgAlt}" sizes="(max-width: 544px) 100vw, (max-width: 1024px) 50vw, 25vw" />`
    : `<span class="kpmpro-author-post-card__thumb-placeholder" aria-hidden="true"></span>`;

  const categoryBlock = catName
    ? `<a class="kpmpro-author-post-card__category" href="${catUrl}">${catName}</a>`
    : '';

  return `<article class="kpmpro-author-post-card">
  <a class="kpmpro-author-post-card__thumb" href="${postUrl}" tabindex="-1">${imgTag}</a>
  <div class="kpmpro-author-post-card__body">
    ${categoryBlock}
    <h3 class="kpmpro-author-post-card__title"><a href="${postUrl}">${title}</a></h3>
    <p class="kpmpro-author-post-card__excerpt">${excerpt}</p>
    <p class="kpmpro-author-post-card__meta"><time datetime="${escapeHtml(post.publishedAt)}">${date}</time><span class="kpmpro-author-post-card__dot" aria-hidden="true">·</span><span>${readMins} min read</span></p>
    <a class="kpmpro-author-post-card__more" href="${postUrl}">Read More</a>
  </div>
</article>`;
}
