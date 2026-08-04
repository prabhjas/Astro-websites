import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { safeSlug } from './utils';

const ROOT_DIR = process.cwd();
const BLOG_DIR = join(ROOT_DIR, 'src/content/blog');
const TAXONOMY_DIR = join(ROOT_DIR, 'src/content/taxonomies');

export type SoftDeleteStatus = 'active' | 'trash';

export type CategoryTerm = {
  name: string;
  slug: string;
  description?: string;
  status?: SoftDeleteStatus;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
};

export type TagTerm = {
  name: string;
  slug: string;
  status?: SoftDeleteStatus;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
};

const CATEGORIES_PATH = join(TAXONOMY_DIR, 'categories.json');
const TAGS_PATH = join(TAXONOMY_DIR, 'tags.json');

function nowIso() {
  return new Date().toISOString();
}

function readJsonArray<T>(filePath: string): T[] {
  if (!existsSync(filePath)) return [];
  const raw = readFileSync(filePath, 'utf8');
  if (!raw.trim()) return [];
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed as T[];
}

function writeJsonArray<T>(filePath: string, rows: T[]) {
  if (!existsSync(TAXONOMY_DIR)) mkdirSync(TAXONOMY_DIR, { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
}

function normalizeStatus<T extends { status?: SoftDeleteStatus; createdAt?: string; updatedAt?: string; deletedAt?: string }>(
  term: T,
  fallbackCreatedAt?: string,
): T {
  const createdAt = term.createdAt || fallbackCreatedAt || nowIso();
  return {
    ...term,
    status: term.status || 'active',
    createdAt,
    updatedAt: term.updatedAt || term.updatedAt,
    deletedAt: term.status === 'trash' ? term.deletedAt || nowIso() : undefined,
  };
}

function ensureSeedCategories(): CategoryTerm[] {
  if (existsSync(CATEGORIES_PATH)) return readJsonArray<CategoryTerm>(CATEGORIES_PATH);
  if (!existsSync(BLOG_DIR)) return [];

  const cats = new Map<string, CategoryTerm>();
  for (const name of readdirSync(BLOG_DIR).filter((f) => f.endsWith('.json'))) {
    const raw = readFileSync(join(BLOG_DIR, name), 'utf8');
    const post = JSON.parse(raw);
    for (const c of post.categories || []) {
      const name = String(c?.name || '').trim();
      const slug = String(c?.slug || safeSlug(name));
      if (!slug) continue;
      if (!cats.has(slug)) cats.set(slug, { name, slug, status: 'active' });
    }
  }

  const seeded = [...cats.values()].map((t) => normalizeStatus(t));
  writeJsonArray(CATEGORIES_PATH, seeded);
  return seeded;
}

function ensureSeedTags(): TagTerm[] {
  const tags = readJsonArray<TagTerm>(TAGS_PATH);
  // If tags.json is present but uses old shape {name,slug}, normalize to {status:'active'}
  return tags.map((t) => normalizeStatus(t));
}

export function listCategoryTerms(includeTrash: boolean, q = ''): Array<CategoryTerm & { postCount: number }> {
  const terms = ensureSeedCategories();
  const query = q.trim().toLowerCase();

  const posts = existsSync(BLOG_DIR)
    ? readdirSync(BLOG_DIR).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(join(BLOG_DIR, f), 'utf8')))
    : [];

  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const c of post.categories || []) {
      const slug = String(c?.slug || '');
      if (!slug) continue;
      counts.set(slug, (counts.get(slug) || 0) + 1);
    }
  }

  return terms
    .filter((t) => (includeTrash ? t.status === 'trash' : t.status !== 'trash'))
    .filter((t) => (!query ? true : `${t.name} ${t.slug}`.toLowerCase().includes(query)))
    .map((t) => ({ ...t, postCount: counts.get(t.slug) || 0 }))
    .sort((a, b) => b.postCount - a.postCount || a.name.localeCompare(b.name));
}

export function listTagTerms(includeTrash: boolean, q = ''): Array<TagTerm & { postCount: number }> {
  const terms = ensureSeedTags();
  const query = q.trim().toLowerCase();

  const posts = existsSync(BLOG_DIR)
    ? readdirSync(BLOG_DIR).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(join(BLOG_DIR, f), 'utf8')))
    : [];

  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const t of post.tags || []) {
      const slug = String(t?.slug || '');
      if (!slug) continue;
      counts.set(slug, (counts.get(slug) || 0) + 1);
    }
  }

  return terms
    .filter((t) => (includeTrash ? t.status === 'trash' : t.status !== 'trash'))
    .filter((t) => (!query ? true : `${t.name} ${t.slug}`.toLowerCase().includes(query)))
    .map((t) => ({ ...t, postCount: counts.get(t.slug) || 0 }))
    .sort((a, b) => b.postCount - a.postCount || a.name.localeCompare(b.name));
}

function getTermBySlug(terms: CategoryTerm[] | TagTerm[], slug: string) {
  return terms.find((t: any) => t.slug === slug) || null;
}

function ensureUniqueSlug<T extends { slug: string }>(terms: T[], slug: string, excluding?: T) {
  return !terms.some((t) => t.slug === slug && (!excluding || t !== excluding));
}

export function upsertCategory(args: {
  originalSlug?: string;
  name: string;
  slug: string;
  description?: string;
}): { action: 'create' | 'update'; term: CategoryTerm } {
  const all = ensureSeedCategories();
  const targetSlug = safeSlug(args.slug || args.name);
  if (!targetSlug) throw new Error('Category slug is required');

  const isUpdate = Boolean(args.originalSlug);
  const existing = isUpdate ? getTermBySlug(all, safeSlug(args.originalSlug || '')) : null;
  if (isUpdate && !existing) throw new Error('Category not found');

  if (!ensureUniqueSlug(all, targetSlug, existing || undefined)) {
    throw new Error(`Category slug "${targetSlug}" already exists`);
  }

  const createdAt = existing?.createdAt || nowIso();
  const updatedAt = nowIso();

  const term: CategoryTerm = {
    name: args.name.trim(),
    slug: targetSlug,
    description: args.description?.trim() || undefined,
    status: existing?.status || 'active',
    createdAt,
    updatedAt,
    deletedAt: existing?.status === 'trash' ? existing.deletedAt : undefined,
  };

  const next = [...all.filter((t) => t.slug !== (existing?.slug || args.originalSlug)), term];
  writeJsonArray(CATEGORIES_PATH, next);

  // If slug changed, update posts references.
  if (existing && existing.slug !== term.slug) {
    propagateCategorySlugChange(existing.slug, term.slug, term.name);
  }

  return { action: existing ? 'update' : 'create', term };
}

export function moveCategoryToTrash(slug: string): void {
  const all = ensureSeedCategories();
  const existing = getTermBySlug(all, slug);
  if (!existing) return;
  existing.status = 'trash';
  existing.deletedAt = nowIso();
  existing.updatedAt = nowIso();
  writeJsonArray(CATEGORIES_PATH, all);
}

export function restoreCategoryFromTrash(slug: string): void {
  const all = ensureSeedCategories();
  const existing = getTermBySlug(all, slug);
  if (!existing) return;
  existing.status = 'active';
  existing.deletedAt = undefined;
  existing.updatedAt = nowIso();
  writeJsonArray(CATEGORIES_PATH, all);
}

export function deleteCategoryPermanently(slug: string): void {
  const all = ensureSeedCategories();
  const next = all.filter((t) => t.slug !== slug);
  writeJsonArray(CATEGORIES_PATH, next);
}

export function upsertTag(args: {
  originalSlug?: string;
  name: string;
  slug: string;
}): { action: 'create' | 'update'; term: TagTerm } {
  const all = ensureSeedTags();
  const targetSlug = safeSlug(args.slug || args.name);
  if (!targetSlug) throw new Error('Tag slug is required');

  const isUpdate = Boolean(args.originalSlug);
  const existing = isUpdate ? getTermBySlug(all, safeSlug(args.originalSlug || '')) : null;
  if (isUpdate && !existing) throw new Error('Tag not found');

  if (!ensureUniqueSlug(all, targetSlug, existing || undefined)) {
    throw new Error(`Tag slug "${targetSlug}" already exists`);
  }

  const createdAt = existing?.createdAt || nowIso();
  const updatedAt = nowIso();
  const term: TagTerm = {
    name: args.name.trim(),
    slug: targetSlug,
    status: existing?.status || 'active',
    createdAt,
    updatedAt,
    deletedAt: existing?.status === 'trash' ? existing.deletedAt : undefined,
  };

  const next = [...all.filter((t) => t.slug !== (existing?.slug || args.originalSlug)), term];
  writeJsonArray(TAGS_PATH, next);

  if (existing && existing.slug !== term.slug) {
    propagateTagSlugChange(existing.slug, term.slug, term.name);
  }

  return { action: existing ? 'update' : 'create', term };
}

export function moveTagToTrash(slug: string): void {
  const all = ensureSeedTags();
  const existing = getTermBySlug(all, slug);
  if (!existing) return;
  existing.status = 'trash';
  existing.deletedAt = nowIso();
  existing.updatedAt = nowIso();
  writeJsonArray(TAGS_PATH, all);
}

export function restoreTagFromTrash(slug: string): void {
  const all = ensureSeedTags();
  const existing = getTermBySlug(all, slug);
  if (!existing) return;
  existing.status = 'active';
  existing.deletedAt = undefined;
  existing.updatedAt = nowIso();
  writeJsonArray(TAGS_PATH, all);
}

export function deleteTagPermanently(slug: string): void {
  const all = ensureSeedTags();
  const next = all.filter((t) => t.slug !== slug);
  writeJsonArray(TAGS_PATH, next);
}

function propagateCategorySlugChange(oldSlug: string, newSlug: string, newName: string) {
  if (!existsSync(BLOG_DIR)) return;
  for (const name of readdirSync(BLOG_DIR).filter((f) => f.endsWith('.json'))) {
    const path = join(BLOG_DIR, name);
    const post = JSON.parse(readFileSync(path, 'utf8'));
    let changed = false;
    post.categories = (post.categories || []).map((c: any) => {
      if (String(c?.slug || '') !== oldSlug) return c;
      changed = true;
      return {
        ...c,
        name: newName,
        slug: newSlug,
        url: `/category/${newSlug}/`,
      };
    });
    if (changed) writeFileSync(path, `${JSON.stringify(post, null, 2)}\n`, 'utf8');
  }
}

function propagateTagSlugChange(oldSlug: string, newSlug: string, newName: string) {
  if (!existsSync(BLOG_DIR)) return;
  for (const name of readdirSync(BLOG_DIR).filter((f) => f.endsWith('.json'))) {
    const path = join(BLOG_DIR, name);
    const post = JSON.parse(readFileSync(path, 'utf8'));
    let changed = false;
    post.tags = (post.tags || []).map((t: any) => {
      if (String(t?.slug || '') !== oldSlug) return t;
      changed = true;
      return {
        ...t,
        name: newName,
        slug: newSlug,
        url: `/tag/${newSlug}/`,
      };
    });
    if (changed) writeFileSync(path, `${JSON.stringify(post, null, 2)}\n`, 'utf8');
  }
}

export function getActiveCategoryOptions(): Array<CategoryTerm> {
  return ensureSeedCategories().filter((t) => (t.status || 'active') !== 'trash');
}

export function getActiveTagOptions(): Array<TagTerm> {
  return ensureSeedTags().filter((t) => (t.status || 'active') !== 'trash');
}

export function getAllCategoryTerms(): Array<CategoryTerm> {
  return ensureSeedCategories();
}

export function getAllTagTerms(): Array<TagTerm> {
  return ensureSeedTags();
}

export function getCategoryTermBySlug(slug: string): CategoryTerm | null {
  const all = ensureSeedCategories();
  return getTermBySlug(all, slug);
}

export function getTagTermBySlug(slug: string): TagTerm | null {
  const all = ensureSeedTags();
  return getTermBySlug(all, slug);
}

