/**
 * View helpers for the Figma v3 Insights listing + blog post chrome.
 */
import {
  formatDate,
  getAllBlogPosts,
  getCategoryUrl,
  getPostExcerpt,
  type BlogPost,
} from './blog.ts';
import { getBlogLeadCounts } from './blog-leads.ts';

export interface InsightCard {
  slug: string;
  href: string;
  title: string;
  excerpt: string;
  author: string;
  date: string;
  category: string;
  categorySlug: string;
  categoryHref: string;
  image: string | null;
  imageAlt: string;
  publishedAt: string;
  leads?: number;
}

export function displayAuthorName(name?: string): string {
  const raw = (name || '').trim();
  if (!raw) return 'Connect Group';
  if (raw.includes('@')) {
    const local = raw.split('@')[0] || '';
    const pretty = local
      .split(/[._-]+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
    return pretty || 'Connect Group';
  }
  return raw;
}

export function toInsightCard(post: BlogPost): InsightCard {
  const category = post.categories[0];
  return {
    slug: post.slug,
    href: `/${post.slug}/`,
    title: post.title,
    excerpt: getPostExcerpt(post, 140),
    author: displayAuthorName(post.author?.name),
    date: formatDate(post.publishedAt),
    category: category?.name || 'Insights',
    categorySlug: category?.slug || 'insights',
    categoryHref: category ? getCategoryUrl(category) : '/insights/',
    image: post.featuredImage?.src || null,
    imageAlt: post.featuredImage?.alt || post.title,
    publishedAt: post.publishedAt,
  };
}

/** Newest-first published posts as card view models. */
export function getInsightCards(): InsightCard[] {
  return getAllBlogPosts().map(toInsightCard);
}

/**
 * Top N posts by contact-form leads on that blog URL (seed + live submits).
 * Only posts with lead counts are preferred; newest fills only if still short.
 */
export async function getFeaturedCards(limit = 4): Promise<InsightCard[]> {
  const counts = await getBlogLeadCounts();
  const topSlugs = Object.entries(counts)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([slug]) => slug);
  const bySlug = new Map(getAllBlogPosts().map((p) => [p.slug, p]));
  const picked: InsightCard[] = [];

  for (const slug of topSlugs) {
    const post = bySlug.get(slug);
    if (!post) continue;
    picked.push({ ...toInsightCard(post), leads: counts[slug] || 0 });
    if (picked.length >= limit) break;
  }

  if (picked.length < limit) {
    const used = new Set(picked.map((c) => c.slug));
    for (const post of getAllBlogPosts()) {
      if (used.has(post.slug)) continue;
      picked.push({ ...toInsightCard(post), leads: counts[post.slug] || 0 });
      if (picked.length >= limit) break;
    }
  }

  return picked;
}

/** Remaining cards after Featured, newest-first, no Featured duplicates. */
export function getInsightCardsExcluding(slugs: Iterable<string>): InsightCard[] {
  const skip = new Set(slugs);
  return getInsightCards().filter((c) => !skip.has(c.slug));
}

/** Topic chips from Figma Insights Desktop (3741:9313). */
export const TOPIC_CHIP_ORDER = [
  'All',
  'Human Resource',
  'EOR',
  'PEO',
  'Company Formation',
  'Business Setup',
  'Visa Services',
  'Outsourcing',
] as const;

/** Map loose CMS category names → Figma chip labels when close. */
const CATEGORY_ALIASES: Record<string, string> = {
  'company formation': 'Company Formation',
  'business tips': 'Business Setup',
  'business setup': 'Business Setup',
  'visa services': 'Visa Services',
  'visa service': 'Visa Services',
  'human resource': 'Human Resource',
  'human resources': 'Human Resource',
  hr: 'Human Resource',
};

export function normalizeTopicLabel(name: string): string {
  const key = name.trim().toLowerCase();
  return CATEGORY_ALIASES[key] || name.trim();
}

export function getTopicChips(cards: InsightCard[]): string[] {
  const present = new Set(cards.map((c) => normalizeTopicLabel(c.category)));
  const ordered: string[] = TOPIC_CHIP_ORDER.filter(
    (name) => name === 'All' || present.has(name),
  );
  for (const name of [...present].sort()) {
    if (!ordered.includes(name)) ordered.push(name);
  }
  return ordered;
}

/** Contact form personalize chips — Figma Contact Us (3741:9822). */
export const SERVICE_CHIPS = [
  'Global Workforce Solutions',
  'Recruitment',
  'Visa Services',
  'Business Setup',
  'HR Software',
  'Real Estate',
  'Mobility',
  'Legal Services',
  'Other',
] as const;
