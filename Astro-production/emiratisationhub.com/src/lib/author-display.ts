/**
 * Display helpers for author pages (names, avatars, bios from JSON + live overrides).
 */
import type { Author } from './authors.ts';

export const AUTHORS_BASE_PATH = '/author';
export const AUTHORS_ORIGIN = 'https://emiratisationhub.com';

export const LIVE_AUTHOR_ORDER = [
  'kate-c',
  'shak-malik',
  'harneet',
  'sanjyam-dhingra',
  'kane-bernard',
  'riju-karappurath',
];

export const LIVE_AUTHOR_OVERRIDES: Record<
  string,
  { name?: string; title?: string; avatar?: string; bio?: string; description?: string }
> = {
  'kate-c': {
    name: 'Kate Williams',
    title: 'Global Strategy Director',
    avatar: '/images/authors/kate-williams.png',
    bio: 'Skills in Communication, Interpersonal Skills, Time Management, Teamwork, and Customer Experience. She is an enthusiastic self-starter with a passion for building relationships with people.',
  },
  'shak-malik': {
    name: 'Shakil Malik',
    title: 'Business Development Executive',
    avatar: '/images/authors/shakil-malik.png',
    bio: 'He is an accomplished Business Development Executive with a strong background in driving revenue growth and fostering strategic partnerships. Known for his proactive approach and keen market insight, he excels in identifying new business opportunities, developing innovative strategies, and building long-lasting client relationships.',
  },
  harneet: {
    name: 'Harneet Bhatia',
    title: 'Business Sales & Golden Visa Expert',
    avatar: '/images/authors/harneet-bhatia.png',
    bio: 'She is a renowned Business Sales and Golden Visa Expert, specializing in facilitating business setups in Dubai. With a comprehensive portfolio of services, she adeptly assists clients in navigating the complexities of corporate bank account creation, addressing fines issues, and managing visa services. Her expertise extends to providing VAT services and obtaining necessary DM approvals, ensuring a seamless and efficient process for her clients.',
  },
  'sanjyam-dhingra': {
    name: 'Sanjyam Dhingra',
    title: 'Compliance officer',
    avatar: '/images/authors/sanjyam-dhingra.png',
    bio: 'She is an esteemed Compliance Officer with extensive experience in ensuring corporate adherence to regulatory standards. Her expertise spans a wide range of compliance functions, including regulatory analysis, risk management, and the implementation of compliance programs. She excels in identifying potential compliance issues and developing strategic solutions to mitigate risks.',
  },
  'kane-bernard': {
    name: 'Kane Bernard',
    title: 'Enterprise Development Manager',
    avatar: '/images/authors/kane-bernard.png',
    bio: 'He is a dynamic Enterprise Development Manager with a proven track record in driving business growth and innovation. With a strategic mindset and a passion for fostering enterprise success, he excels in identifying new market opportunities, developing strategic partnerships, and enhancing operational efficiencies. His expertise includes market analysis, business planning, and project management, enabling him to guide enterprises through complex development stages.',
  },
  'riju-karappurath': {
    name: 'Riju Karappurath',
    title: 'Public Relations Officer',
    avatar: '/images/authors/riju-karappurath.png',
    bio: 'He is a skilled Public Relations Officer renowned for his ability to craft compelling narratives and foster strong relationships between organizations and their audiences. He combines his creativity and strategic thinking to effectively promote his organization\'s mission and values.',
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
  if (!links.length && author.slug === 'kate-c') {
    links.push({
      type: 'linkedin',
      url: 'https://www.linkedin.com/in/kate-williams-59a784145/',
      label: 'LinkedIn',
    });
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
