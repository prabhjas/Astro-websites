/**
 * Display helpers for author pages (names, avatars, bios from JSON + live overrides).
 */
import type { Author } from './authors.ts';

export const AUTHORS_BASE_PATH = '/author';
export const AUTHORS_ORIGIN = '';

/** Featured authors on live /author/ */
export const LIVE_AUTHOR_ORDER = [
  'nakul',
  'binju-t-r',
  'cheyne-hogan',
  'tanzyn-giovanna',
  'siva-rama',
  'dylan-wesley',
];

export const LIVE_AUTHOR_OVERRIDES: Record<
  string,
  { name?: string; title?: string; avatar?: string; bio?: string; description?: string }
> = {
  nakul: {
    name: 'Nakul',
    title: 'Head of Recruitment',
    avatar: '/wp-content/uploads/2024/05/cropped-8.png',
    bio: 'Nakul Sachdeva is Head of Recruitment at EmiratisationHub. His expertise has crossed multiple categories and channels with functional expertise in a variety of industries. He has 10 years of career in executive search firms and supported end to end Recruitment for Major Banks, Financial Institution, IT and Consulting firms based out of Toronto, Canada and Dubai, UAE. He manages end to end Recruitment at EmiratisationHub as well as serves as the client’s initial point of contact when seeking recruiting services.',
  },
  'binju-t-r': {
    name: 'Binju T. R',
    avatar: '/wp-content/uploads/2024/05/cropped-6.png',
  },
  'cheyne-hogan': {
    name: 'Cheyne Hogan',
    avatar: '/wp-content/uploads/2024/05/cropped-9.png',
  },
  'tanzyn-giovanna': {
    name: 'Tanzyn Giovanna',
    avatar: '/wp-content/uploads/2024/05/cropped-5-2-1.png',
  },
  'siva-rama': {
    name: 'Siva Rama Krishna',
    avatar: '/images/authors/siva-rama.jpg',
  },
  'dylan-wesley': {
    name: 'Dylan Wesley Wright',
    avatar: '/wp-content/uploads/2024/05/cropped-1-1.png',
  },
  'timothy-patridge': {
    name: 'Timothy Patridge',
  },
  'muhammad-faieezvistaoutsourcing-com': {
    name: 'Muhammad Faieez',
  },
  'kate-w': {
    name: 'Kate W',
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
