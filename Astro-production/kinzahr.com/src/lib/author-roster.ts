/**
 * Live Kinza HR authors from Figma Author-Pages (archive + single).
 * Shared by authors.ts and blog.ts to avoid circular imports.
 */
export interface LiveAuthorDef {
  slug: string;
  name: string;
  /** Job title — omit when not provided in Figma / content. */
  title?: string;
  bio?: string;
  avatar: string;
  linkedin: string;
}

/** Display order on /author/ (Figma grid). */
export const LIVE_AUTHOR_ROSTER: LiveAuthorDef[] = [
  {
    slug: 'nakul-sachdeva',
    name: 'Nakul Sachdeva',
    avatar: '/wp-content/uploads/2024/05/nakul-sachdeva-portrait-new.png',
    linkedin: 'https://www.linkedin.com/in/nakul-sachdeva-717590118/',
    bio: 'Global workforce and HR professional specializing in international recruitment, HR, payroll, outsourcing, and employment solutions across the USA, Canada, and UAE, helping businesses hire and manage talent globally.',
  },
  {
    slug: 'vesna-milic',
    name: 'Vesna Milic',
    avatar: '/wp-content/uploads/2024/05/vesna-milic.png',
    linkedin: 'https://www.linkedin.com/in/vesnamilic/',
    bio: 'HR and workforce solutions professional specializing in talent acquisition, recruitment, employment solutions, and workforce management, helping businesses navigate hiring and workforce requirements across the UAE.',
  },
  {
    slug: 'nikhat-fathima',
    name: 'Nikhat Fatima',
    avatar: '/wp-content/uploads/2024/05/nikhat-fathima.png',
    linkedin: 'https://www.linkedin.com/in/nikhat-fatima-864bab1b0/',
    bio: 'Business Development & Talent Acquisition professional with 15+ years of UAE market experience, specializing in recruitment, manpower solutions, contract staffing, client acquisition, and Emiratisation hiring across key industries.',
  },
  {
    slug: 'majd-alshiekh',
    name: 'Majd Alshiekh',
    avatar: '/wp-content/uploads/2024/05/majd-alshiekh.png',
    linkedin: 'https://www.linkedin.com/in/majd-alshiekh-a22a471b6/',
    bio: 'Electrical engineering professional with experience in renewable energy, solar power systems, and industrial projects across the Middle East, bringing a technical and analytical perspective to business and workforce-related topics.',
  },
  {
    slug: 'amandeep-kaur',
    name: 'Amandeep Kaur',
    avatar: '/wp-content/uploads/2024/05/amandeep-kaur.png',
    linkedin: 'https://www.linkedin.com/in/amandeep-kaur-90a231416/',
    bio: 'Talent Partner specializing in permanent recruitment, Emiratisation, nationalization, EOR services, and temporary staffing, helping businesses across the UAE connect with exceptional talent and build flexible workforce solutions.',
  },
  {
    slug: 'lombe-trevor',
    name: 'Lombe Trevor',
    avatar: '/wp-content/uploads/2024/05/lombe-trevor.png',
    linkedin: 'https://www.linkedin.com/in/lt-bwalya/',
    bio: 'Talent and recruitment professional specializing in global talent acquisition, workforce growth, and connecting businesses with skilled professionals. At KinzaHR, LT supports companies in building strong and scalable teams.',
  },
];

export const LIVE_AUTHOR_SLUGS = LIVE_AUTHOR_ROSTER.map((a) => a.slug);

export function isLiveAuthorSlug(slug: string): boolean {
  return LIVE_AUTHOR_SLUGS.includes(slug);
}

export function getLiveAuthorDef(slug: string): LiveAuthorDef | null {
  return LIVE_AUTHOR_ROSTER.find((a) => a.slug === slug) || null;
}

/** Deterministic “random” author pick from post slug (stable across builds). */
export function pickLiveAuthorForPostSlug(postSlug: string): LiveAuthorDef {
  let hash = 0;
  const key = String(postSlug || '');
  for (let i = 0; i < key.length; i++) {
    hash = (Math.imul(31, hash) + key.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % LIVE_AUTHOR_ROSTER.length;
  return LIVE_AUTHOR_ROSTER[idx]!;
}
