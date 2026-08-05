import { readdirSync, readFileSync, writeFileSync, existsSync, unlinkSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { processContentHeadings, type BlogPost } from '../blog';
import { getActiveCategoryOptions as getActiveCategoryTerms, getActiveTagOptions as getActiveTagTerms } from './taxonomy-store';

const ROOT_DIR = process.cwd();
const BLOG_DIR = join(ROOT_DIR, 'src/content/blog');
const PUBLIC_UPLOADS_DIR = join(ROOT_DIR, 'public/wp-content/uploads/internal-posts');

export type PostStatus = 'draft' | 'published' | 'trash';

export type InternalPost = BlogPost & {
  status?: PostStatus;
  metaTitle?: string;
  metaDescription?: string;
  noIndex?: boolean;
  noFollow?: boolean;
  trashedFromStatus?: 'draft' | 'published';
  robotsBeforeTrash?: string;
};

export type CategoryOption = { name: string; slug?: string; url?: string };
export type TagOption = { name: string; slug: string };

function safeSlug(text: string): string {
  return (text || '')
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function ensureBasePost(template: InternalPost, slug: string): InternalPost {
  const now = new Date().toISOString();
  const base: InternalPost = JSON.parse(JSON.stringify(template)) as InternalPost;
  base.slug = slug;
  base.title = base.title || slug;
  base.description = base.description || '';
  base.metaTitle = base.metaTitle || '';
  base.metaDescription = base.metaDescription || base.description;
  base.canonical = `/${slug}/`;
  base.status = base.status || 'draft';
  base.publishedAt = base.publishedAt || now;
  base.modifiedAt = now;
  base.contentHtml = base.contentHtml || '';
  const processed = processContentHeadings(base.contentHtml || '');
  base.contentHtml = processed.html;
  base.toc = processed.toc;
  base.headings = processed.headings;
  base.images = base.images || [];
  base.links = base.links || [];
  base.linkAudit = base.linkAudit || {
    brokenInternal: [],
    wordpressSpecific: [],
    external: [],
    unresolved: [],
  };
  base.og = base.og || { title: '', description: '' };
  base.twitter = base.twitter || { card: 'summary_large_image' };
  base.author = base.author || { name: 'Redo', slug: 'redo' };
  base.categories = base.categories || [];
  base.tags = base.tags || [];
  base.featuredImage = base.featuredImage ?? null;
  return base;
}

function parseInternalPost(raw: string): InternalPost {
  const parsed = JSON.parse(raw) as InternalPost;
  if (!parsed.publishedAt) parsed.publishedAt = new Date().toISOString();
  if (!parsed.modifiedAt) parsed.modifiedAt = new Date().toISOString();
  if (!parsed.toc) parsed.toc = [];
  if (!parsed.headings) parsed.headings = [];
  if (!parsed.images) parsed.images = [];
  if (!parsed.links) parsed.links = [];
  if (!parsed.linkAudit) {
    parsed.linkAudit = {
      brokenInternal: [],
      wordpressSpecific: [],
      external: [],
      unresolved: [],
    };
  }
  if (!parsed.og) parsed.og = { title: parsed.title, description: parsed.description };
  if (!parsed.twitter) parsed.twitter = { card: 'summary_large_image' };
  if (!parsed.categories) parsed.categories = [];
  if (!parsed.tags) parsed.tags = [];
  if (parsed.featuredImage === undefined) parsed.featuredImage = null;
  return parsed;
}

function listBlogJsonSlugs(dir: string = BLOG_DIR, prefix = ''): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${name.name}` : name.name;
    if (name.isDirectory()) {
      out.push(...listBlogJsonSlugs(join(dir, name.name), rel));
    } else if (name.isFile() && name.name.endsWith('.json')) {
      out.push(rel.replace(/\.json$/, ''));
    }
  }
  return out.sort((a, b) => a.localeCompare(b));
}

function getTemplatePost(): InternalPost | null {
  const slugs = listBlogJsonSlugs();
  if (!slugs.length) return null;
  return getPost(slugs[0]);
}

export function listAllPosts(): InternalPost[] {
  return listBlogJsonSlugs().map((slug) => {
    const parsed = getPost(slug);
    if (!parsed) throw new Error(`Missing post JSON for slug: ${slug}`);
    parsed.slug = parsed.slug || slug;
    return parsed;
  });
}

export function getPost(slug: string): InternalPost | null {
  const path = join(BLOG_DIR, `${slug}.json`);
  if (!existsSync(path)) return null;
  return parseInternalPost(readFileSync(path, 'utf8'));
}

export function deletePost(slug: string): void {
  const path = join(BLOG_DIR, `${slug}.json`);
  if (existsSync(path)) unlinkSync(path);
}

export function deletePostPermanently(slug: string): void {
  deletePost(slug);
}

export function movePostToTrash(slug: string): void {
  const existing = getPost(slug);
  if (!existing) return;
  if (existing.status === 'trash') return;

  const fromStatus: 'draft' | 'published' = existing.status === 'draft' ? 'draft' : 'published';
  existing.trashedFromStatus = fromStatus;
  existing.robotsBeforeTrash = existing.robots;
  existing.status = 'trash';
  existing.robots = 'noindex, nofollow';
  existing.modifiedAt = new Date().toISOString();
  savePost(existing);
}

export function restorePostFromTrash(slug: string): void {
  const existing = getPost(slug);
  if (!existing) return;
  if (existing.status !== 'trash') return;

  const restoreStatus: 'draft' | 'published' = existing.trashedFromStatus || 'published';
  existing.status = restoreStatus;
  existing.robots = existing.robotsBeforeTrash || 'index, follow';
  existing.trashedFromStatus = undefined;
  existing.robotsBeforeTrash = undefined;
  existing.modifiedAt = new Date().toISOString();
  savePost(existing);
}

export function getAllCategoryOptions(): CategoryOption[] {
  return getActiveCategoryTerms()
    .map((t) => ({ name: t.name, slug: t.slug, url: `/category/${t.slug}/` }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getAllTagOptions(): TagOption[] {
  return getActiveTagTerms()
    .map((t) => ({ name: t.name, slug: t.slug }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function normalizeTagsCsv(tagsCsv: string): Array<{ name: string; slug: string }> {
  const parts = (tagsCsv || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const out: Array<{ name: string; slug: string }> = [];
  const seen = new Set<string>();
  for (const name of parts) {
    const slug = safeSlug(name);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push({ name, slug });
  }
  return out;
}

export function tagsToBlogTags(tags: Array<{ name: string; slug: string }>) {
  return tags.map((t) => ({
    name: t.name,
    slug: t.slug,
    url: `/tag/${t.slug}/`,
  }));
}

export function categoriesToBlogCategory(category: CategoryOption) {
  const slug = category.slug || safeSlug(category.name);
  return [
    {
      name: category.name,
      slug,
      url: category.url || `/category/${slug}/`,
    },
  ];
}

export function getUploadDestinationPath(fileName: string): { filePath: string; publicUrl: string } {
  const safe = fileName.replaceAll('\\', '/').split('/').pop() || 'image';
  const stamp = new Date();
  const yyyy = stamp.getFullYear();
  const mm = String(stamp.getMonth() + 1).padStart(2, '0');
  const extMatch = safe.match(/\.(png|jpe?g|webp|gif|svg)$/i);
  const ext = extMatch ? extMatch[0] : '.png';
  const base = safeSlug(safe.replace(ext, '')) || 'featured';
  const finalName = `${base}-${stamp.getTime()}${ext.toLowerCase()}`;

  const dir = join(PUBLIC_UPLOADS_DIR, String(yyyy), String(mm));
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const filePath = join(dir, finalName);
  const publicUrl = `/wp-content/uploads/internal-posts/${yyyy}/${mm}/${finalName}`;
  return { filePath, publicUrl };
}

export function robotsFromNoIndex(noIndex: boolean, noFollow: boolean): string {
  const indexPart = noIndex ? 'noindex' : 'index';
  const followPart = noFollow ? 'nofollow' : 'follow';
  return `${indexPart}, ${followPart}`;
}

export function savePost(post: InternalPost): void {
  const slug = safeSlug(post.slug);
  if (!slug) throw new Error('Post slug is required');

  const filePath = join(BLOG_DIR, `${slug}.json`);
  if (!existsSync(dirname(filePath))) mkdirSync(dirname(filePath), { recursive: true });

  writeFileSync(filePath, `${JSON.stringify(post, null, 2)}\n`, 'utf8');
}

export function createOrUpdatePost(args: {
  originalSlug?: string;
  slug: string;
  title: string;
  contentHtml: string;
  category: CategoryOption;
  tagsCsv: string;
  status: PostStatus;
  publishDateISO: string;
  metaTitle: string;
  metaDescription: string;
  noIndex: boolean;
  noFollow: boolean;
  featuredImage?: { publicUrl: string; fileName: string } | null;
}): { slug: string; action: 'create' | 'update' } {
  const now = new Date().toISOString();
  const targetSlug = safeSlug(args.slug || args.title);
  if (!targetSlug) throw new Error('Post title/slug must produce a valid slug');

  const template = getTemplatePost();
  if (!template) throw new Error('No existing blog post template found in src/content/blog/*.json');

  const existing = args.originalSlug ? getPost(safeSlug(args.originalSlug)) : null;
  const isUpdate = Boolean(existing);
  const action: 'create' | 'update' = isUpdate ? 'update' : 'create';

  let post: InternalPost;
  if (isUpdate && existing) {
    // Start from existing to preserve author/links/etc.
    post = JSON.parse(JSON.stringify(existing)) as InternalPost;
    post.slug = targetSlug;
  } else {
    post = ensureBasePost(template, targetSlug);
  }

  // If slug is changing during update, ensure we don't overwrite a different post.
  const targetPath = join(BLOG_DIR, `${targetSlug}.json`);
  if (!isUpdate || safeSlug(args.originalSlug || '') !== targetSlug) {
    if (existsSync(targetPath)) {
      throw new Error(`A post with slug "${targetSlug}" already exists.`);
    }
  }

  post.title = args.title;
  post.slug = targetSlug;
  post.description = args.metaDescription || post.description || '';
  post.metaTitle = args.metaTitle || '';
  post.metaDescription = args.metaDescription || '';
  post.canonical = `/${targetSlug}/`;
  post.contentHtml = args.contentHtml || '';

  post.categories = categoriesToBlogCategory(args.category);
  const tagList = normalizeTagsCsv(args.tagsCsv);
  post.tags = tagsToBlogTags(tagList);

  // Soft-delete support:
  // - moving to trash forces `noindex,nofollow` and stores previous robots + status for restore
  // - restoring removes those overrides
  const previousStatus = post.status;
  post.status = args.status;
  post.publishedAt = args.publishDateISO || now;
  post.modifiedAt = now;

  if (args.status === 'trash') {
    if (previousStatus !== 'trash') {
      post.trashedFromStatus = previousStatus === 'draft' ? 'draft' : 'published';
      post.robotsBeforeTrash = post.robots;
    }
    post.robots = 'noindex, nofollow';
  } else if (previousStatus === 'trash') {
    post.robots = post.robotsBeforeTrash || robotsFromNoIndex(args.noIndex, args.noFollow);
    post.trashedFromStatus = undefined;
    post.robotsBeforeTrash = undefined;
  } else {
    post.robots = robotsFromNoIndex(args.noIndex, args.noFollow);
  }

  if (args.featuredImage) {
    post.featuredImage = {
      src: args.featuredImage.publicUrl,
      alt: args.featuredImage.fileName,
      originalUrl: args.featuredImage.publicUrl,
    };
  } else if (args.featuredImage === null) {
    post.featuredImage = null;
  }

  // Rebuild toc/headings from current content.
  const processed = processContentHeadings(post.contentHtml || '');
  post.contentHtml = processed.html;
  post.toc = processed.toc;
  post.headings = processed.headings;

  post.og = post.og || {};
  post.og.title = args.metaTitle || post.title;
  post.og.description = args.metaDescription || post.description;

  post.twitter = post.twitter || { card: 'summary_large_image' };
  post.twitter.title = args.metaTitle || post.title;
  post.twitter.description = args.metaDescription || post.description;

  // Save and (if needed) delete old slug file.
  savePost(post);
  if (isUpdate && args.originalSlug && safeSlug(args.originalSlug) !== targetSlug) {
    deletePost(safeSlug(args.originalSlug));
  }

  return { slug: targetSlug, action };
}

