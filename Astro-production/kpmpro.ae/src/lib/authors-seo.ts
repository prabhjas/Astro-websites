import type { Author } from './authors.ts';
import { AUTHORS_ORIGIN, authorProfilePath, getDisplayAuthor } from './author-display.ts';

export function buildAuthorsIndexSeo() {
  const canonical = `${AUTHORS_ORIGIN}/author/`;
  return {
    title: 'Authors | KPM Pro',
    description:
      'Meet the KPM Pro authors — business setup, PRO services, and compliance experts sharing practical insights for the UAE.',
    canonical,
    robots: 'index, follow',
    og: {
      title: 'Authors | KPM Pro',
      description:
        'Meet the KPM Pro authors sharing practical UAE business and compliance insights.',
      type: 'website',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Authors | KPM Pro',
      description:
        'Meet the KPM Pro authors sharing practical UAE business and compliance insights.',
    },
  };
}

export function buildAuthorProfileSeo(author: Author, display: ReturnType<typeof getDisplayAuthor>) {
  const title = author.og?.title || `${display.name} | Author at KPM Pro`;
  const description =
    author.og?.description ||
    author.description ||
    display.shortBio ||
    `Articles and insights by ${display.name} at KPM Pro.`;
  const canonical = display.canonical;
  const ogImage = author.og?.image || (display.avatarSrc ? `${AUTHORS_ORIGIN}${display.avatarSrc}` : undefined);

  return {
    title,
    description,
    canonical,
    robots: 'index, follow',
    og: {
      title,
      description,
      type: 'profile',
      locale: 'en_US',
      image: ogImage,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export function buildAuthorsIndexSchema(siteUrl: string) {
  return [
    {
      '@type': 'BreadcrumbList',
      '@id': `${siteUrl}/author/#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
        { '@type': 'ListItem', position: 2, name: 'Authors', item: `${siteUrl}/author/` },
      ],
    },
    {
      '@type': 'CollectionPage',
      '@id': `${siteUrl}/author/#webpage`,
      name: 'Authors',
      url: `${siteUrl}/author/`,
      isPartOf: { '@id': `${siteUrl}/#website` },
    },
  ];
}

export function buildAuthorProfileSchema(
  author: Author,
  display: ReturnType<typeof getDisplayAuthor>,
  siteUrl: string,
) {
  const profileUrl = `${siteUrl}${authorProfilePath(author.slug)}`;
  const image = display.avatarSrc
    ? display.avatarSrc.startsWith('http')
      ? display.avatarSrc
      : `${siteUrl}${display.avatarSrc}`
    : undefined;

  const sameAs = (author.social || []).map((s) => s.url).filter(Boolean);

  return [
    {
      '@type': 'BreadcrumbList',
      '@id': `${profileUrl}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
        { '@type': 'ListItem', position: 2, name: 'Authors', item: `${siteUrl}/author/` },
        { '@type': 'ListItem', position: 3, name: display.name, item: profileUrl },
      ],
    },
    {
      '@type': 'Person',
      '@id': `${profileUrl}#person`,
      name: display.name,
      url: profileUrl,
      jobTitle: display.title || undefined,
      description: display.fullBio || display.shortBio || undefined,
      image: image ? { '@type': 'ImageObject', url: image } : undefined,
      sameAs: sameAs.length ? sameAs : undefined,
      worksFor: { '@id': `${siteUrl}/#organization` },
    },
    {
      '@type': 'ProfilePage',
      '@id': `${profileUrl}#profilepage`,
      url: profileUrl,
      name: `${display.name} — Author at KPM Pro`,
      description: display.shortBio || undefined,
      mainEntity: { '@id': `${profileUrl}#person` },
      isPartOf: { '@id': `${siteUrl}/#website` },
    },
  ];
}
