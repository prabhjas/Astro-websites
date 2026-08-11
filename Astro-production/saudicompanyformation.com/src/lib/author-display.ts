/**
 * Display helpers for author pages (names, avatars, bios from JSON + live overrides).
 */
import type { Author } from './authors.ts';

export const AUTHORS_BASE_PATH = '/author';
export const AUTHORS_ORIGIN = 'https://saudicompanyformation.com';

/** Live /author/ featured cards (primary six). */
export const LIVE_AUTHOR_ORDER = [
  'kate-williams',
  'shakil-malik',
  'harneet',
  'sanjyam-dhingra',
  'kane',
  'riju-karappurath',
];

export const LIVE_AUTHOR_OVERRIDES: Record<
  string,
  { name?: string; title?: string; avatar?: string; bio?: string; description?: string }
> = {
  'kate-williams': {
    name: 'Kate Williams',
    title: 'Global Strategy Director',
    avatar: '/images/authors/kate-williams.png',
    bio: 'As a seasoned Global Strategy Director with a focus on spearheading Company Formation initiatives in Saudi Arabia, I proudly occupy a leadership role within our organization.',
  },
  'shakil-malik': {
    name: 'Shakil Malik',
    title: 'Business Development Executive',
    avatar: '/images/authors/shakil-malik.png',
    bio: 'Experienced Business Development Executive at Saudi Company Formation, dedicated to fostering strategic partnerships and driving growth initiatives. Proficient in identifying market opportunities, negotiating deals, and delivering innovative solutions.',
  },
  harneet: {
    name: 'Harneet Bhatia',
    title: 'Sales & Compliance Officer',
    avatar: '/images/authors/harneet-bhatia.png',
    bio: 'Sales & Compliance Officer supporting clients through visas, licensing, and business setup compliance across Saudi Arabia.',
  },
  'sanjyam-dhingra': {
    name: 'Sanjyam Dhingra',
    title: 'Business Development Executive',
    avatar: '/images/authors/sanjyam-dhingra.png',
    bio: 'Business Development Executive focused on helping entrepreneurs establish and grow companies in Saudi Arabia.',
  },
  kane: {
    name: 'Kane Allyn Barnard',
    title: 'Enterprise Development Manager',
    avatar: '/images/authors/kane-bernard.png',
    bio: 'Enterprise Development Manager guiding organizations through market entry and company formation in the Kingdom.',
  },
  'riju-karappurath': {
    name: 'Riju Karappurath',
    title: 'Public Relations Officer',
    avatar: '/images/authors/riju-karappurath.png',
    bio: 'Public Relations Officer crafting clear communications and supporting client relationships across Saudi Company Formation.',
  },
};

export interface DisplayAuthor {
  slug: string;
  name: string;
  title: string;
  shortBio: string;
  fullBio: string;
  avatarSrc: string;
  avatarAlt: string;
  profileUrl: string;
  canonical: string;
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function truncateBio(text: string, maxLength = 160): string {
  const plain = stripHtml(text);
  if (!plain) return '';
  if (plain.length <= maxLength) return plain;
  const sliced = plain.slice(0, maxLength);
  const lastSpace = sliced.lastIndexOf(' ');
  return `${(lastSpace > 60 ? sliced.slice(0, lastSpace) : sliced).trim()}…`;
}

export function authorProfilePath(slug: string): string {
  return `${AUTHORS_BASE_PATH}/${slug}/`;
}

export function authorCanonical(slug: string): string {
  return `${AUTHORS_ORIGIN}${authorProfilePath(slug)}`;
}

export function getDisplayAuthor(author: Author): DisplayAuthor {
  const override = LIVE_AUTHOR_OVERRIDES[author.slug] || {};
  const name = override.name || author.name;
  const title = (override.title || author.title || '').trim();
  const fullBio = stripHtml(
    override.description || author.description || override.bio || author.bio || '',
  );
  const shortBio = truncateBio(fullBio || override.bio || author.bio || '', 160);
  const avatarSrc = override.avatar || author.avatar?.src || '';
  const avatarAlt = author.avatar?.alt || name;

  return {
    slug: author.slug,
    name,
    title,
    shortBio,
    fullBio,
    avatarSrc,
    avatarAlt,
    profileUrl: authorProfilePath(author.slug),
    canonical: author.canonical?.includes('/author/')
      ? author.canonical.replace('/authors/', '/author/')
      : authorCanonical(author.slug),
  };
}

export function getAuthorSocialLinks(author: Author): { type: string; url: string; label: string }[] {
  const links: { type: string; url: string; label: string }[] = [];
  for (const s of author.social || []) {
    if (!s.url) continue;
    const t = s.type.toLowerCase();
    let label = s.type.charAt(0).toUpperCase() + s.type.slice(1);
    if (t === 'linkedin') label = 'LinkedIn';
    if (t === 'twitter' || t === 'x') label = 'Twitter';
    links.push({ type: s.type, url: s.url, label });
  }
  return links;
}

export function socialIconClass(type: string): string {
  const t = type.toLowerCase();
  if (t === 'linkedin') return 'fab fa-linkedin';
  if (t === 'twitter' || t === 'x') return 'fab fa-twitter';
  if (t === 'facebook') return 'fab fa-facebook';
  if (t === 'instagram') return 'fab fa-instagram';
  return 'fas fa-link';
}
