/**
 * Categories / tags store - backed by src/data/categories.json & tags.json.
 */
import type { CategoryEntry, TagEntry } from "../content-types";
import {
  nextNumericId,
  readCategories,
  readPosts,
  readTags,
  writeCategories,
  writePosts,
  writeTags,
} from "../data-store";
import { safeSlug } from "./utils";

export type SoftDeleteStatus = "active" | "trash";

export type CategoryTerm = {
  id?: number;
  name: string;
  slug: string;
  description?: string;
  status?: SoftDeleteStatus;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
  path?: string;
  count?: number;
  parent?: number;
};

export type TagTerm = {
  id?: number;
  name: string;
  slug: string;
  status?: SoftDeleteStatus;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
  path?: string;
  count?: number;
  description?: string;
};

function categoryToTerm(c: CategoryEntry): CategoryTerm {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description || "",
    status: c.status || "active",
    path: c.path,
    count: c.count,
    parent: c.parent,
  };
}

function tagToTerm(t: TagEntry): TagTerm {
  return {
    id: t.id,
    name: t.name,
    slug: t.slug,
    description: t.description || "",
    status: t.status || "active",
    path: t.path,
    count: t.count,
  };
}

function termToCategory(term: CategoryTerm, previous?: CategoryEntry): CategoryEntry {
  return {
    id: previous?.id || term.id || nextNumericId(readCategories()),
    name: term.name,
    slug: term.slug,
    path: term.path || `/category/${term.slug}/`,
    description: term.description || "",
    count: previous?.count ?? term.count ?? 0,
    parent: previous?.parent ?? term.parent ?? 0,
    status: term.status || "active",
  };
}

function termToTag(term: TagTerm, previous?: TagEntry): TagEntry {
  return {
    id: previous?.id || term.id || nextNumericId(readTags()),
    name: term.name,
    slug: term.slug,
    path: term.path || `/tag/${term.slug}/`,
    description: term.description || "",
    count: previous?.count ?? term.count ?? 0,
    status: term.status || "active",
  };
}

function recountCategories(): void {
  const posts = readPosts().filter((p) => !p.status || p.status === "published");
  const cats = readCategories().map((c) => ({
    ...c,
    count: posts.filter((p) => p.categories.includes(c.id)).length,
  }));
  writeCategories(cats);
}

function recountTags(): void {
  const posts = readPosts().filter((p) => !p.status || p.status === "published");
  const tags = readTags().map((t) => ({
    ...t,
    count: posts.filter((p) => p.tags.includes(t.id)).length,
  }));
  writeTags(tags);
}

export function listCategoryTerms(
  includeTrash: boolean,
  q = "",
): Array<CategoryTerm & { postCount: number }> {
  const terms = readCategories().map(categoryToTerm);
  const query = q.trim().toLowerCase();
  const posts = readPosts();
  const counts = new Map<number, number>();
  for (const post of posts) {
    if (post.status === "trash" || post.status === "draft") continue;
    for (const id of post.categories || []) {
      counts.set(id, (counts.get(id) || 0) + 1);
    }
  }

  return terms
    .filter((t) => (includeTrash ? t.status === "trash" : t.status !== "trash"))
    .filter((t) => (!query ? true : `${t.name} ${t.slug}`.toLowerCase().includes(query)))
    .map((t) => ({ ...t, postCount: counts.get(t.id || 0) || 0 }))
    .sort((a, b) => b.postCount - a.postCount || a.name.localeCompare(b.name));
}

export function listTagTerms(
  includeTrash: boolean,
  q = "",
): Array<TagTerm & { postCount: number }> {
  const terms = readTags().map(tagToTerm);
  const query = q.trim().toLowerCase();
  const posts = readPosts();
  const counts = new Map<number, number>();
  for (const post of posts) {
    if (post.status === "trash" || post.status === "draft") continue;
    for (const id of post.tags || []) {
      counts.set(id, (counts.get(id) || 0) + 1);
    }
  }

  return terms
    .filter((t) => (includeTrash ? t.status === "trash" : t.status !== "trash"))
    .filter((t) => (!query ? true : `${t.name} ${t.slug}`.toLowerCase().includes(query)))
    .map((t) => ({ ...t, postCount: counts.get(t.id || 0) || 0 }))
    .sort((a, b) => b.postCount - a.postCount || a.name.localeCompare(b.name));
}

function ensureUniqueSlug<T extends { slug: string }>(terms: T[], slug: string, excluding?: T) {
  return !terms.some((t) => t.slug === slug && (!excluding || t !== excluding));
}

export function upsertCategory(args: {
  originalSlug?: string;
  name: string;
  slug: string;
  description?: string;
}): { action: "create" | "update"; term: CategoryTerm } {
  const all = readCategories();
  const targetSlug = safeSlug(args.slug || args.name);
  if (!targetSlug) throw new Error("Category slug is required");

  const isUpdate = Boolean(args.originalSlug);
  const existing = isUpdate
    ? all.find((t) => t.slug === safeSlug(args.originalSlug || ""))
    : null;
  if (isUpdate && !existing) throw new Error("Category not found");

  if (!ensureUniqueSlug(all, targetSlug, existing || undefined)) {
    throw new Error(`Category slug "${targetSlug}" already exists`);
  }

  const term: CategoryTerm = {
    id: existing?.id,
    name: args.name.trim(),
    slug: targetSlug,
    description: args.description?.trim() || "",
    status: existing?.status || "active",
    path: `/category/${targetSlug}/`,
    parent: existing?.parent || 0,
    count: existing?.count || 0,
  };

  const entry = termToCategory(term, existing || undefined);
  const next = [...all.filter((t) => t.slug !== (existing?.slug || "")), entry];
  writeCategories(next);

  if (existing && existing.slug !== term.slug) {
    propagateCategorySlugChange(existing.id, entry.id, term.slug, term.name);
  }
  recountCategories();

  return { action: existing ? "update" : "create", term: categoryToTerm(entry) };
}

export function moveCategoryToTrash(slug: string): void {
  const all = readCategories();
  const existing = all.find((t) => t.slug === slug);
  if (!existing) return;
  existing.status = "trash";
  writeCategories(all);
}

export function restoreCategoryFromTrash(slug: string): void {
  const all = readCategories();
  const existing = all.find((t) => t.slug === slug);
  if (!existing) return;
  existing.status = "active";
  writeCategories(all);
}

export function deleteCategoryPermanently(slug: string): void {
  const all = readCategories();
  const existing = all.find((t) => t.slug === slug);
  writeCategories(all.filter((t) => t.slug !== slug));
  if (existing) {
    writePosts(
      readPosts().map((p) => ({
        ...p,
        categories: (p.categories || []).filter((id) => id !== existing.id),
      })),
    );
  }
}

export function upsertTag(args: {
  originalSlug?: string;
  name: string;
  slug: string;
}): { action: "create" | "update"; term: TagTerm } {
  const all = readTags();
  const targetSlug = safeSlug(args.slug || args.name);
  if (!targetSlug) throw new Error("Tag slug is required");

  const isUpdate = Boolean(args.originalSlug);
  const existing = isUpdate
    ? all.find((t) => t.slug === safeSlug(args.originalSlug || ""))
    : null;
  if (isUpdate && !existing) throw new Error("Tag not found");

  if (!isUpdate) {
    const hit = all.find((t) => t.slug === targetSlug);
    if (hit) return { action: "update", term: tagToTerm(hit) };
  }

  if (isUpdate && !ensureUniqueSlug(all, targetSlug, existing || undefined)) {
    throw new Error(`Tag slug "${targetSlug}" already exists`);
  }

  const term: TagTerm = {
    id: existing?.id,
    name: args.name.trim(),
    slug: targetSlug,
    status: existing?.status || "active",
    path: `/tag/${targetSlug}/`,
    count: existing?.count || 0,
    description: existing?.description || "",
  };

  const entry = termToTag(term, existing || undefined);
  const next = [...all.filter((t) => t.slug !== (existing?.slug || "")), entry];
  writeTags(next);

  if (existing && existing.slug !== term.slug) {
    propagateTagSlugChange(existing.id, entry.id, term.slug, term.name);
  }
  recountTags();

  return { action: existing ? "update" : "create", term: tagToTerm(entry) };
}

export function moveTagToTrash(slug: string): void {
  const all = readTags();
  const existing = all.find((t) => t.slug === slug);
  if (!existing) return;
  existing.status = "trash";
  writeTags(all);
}

export function restoreTagFromTrash(slug: string): void {
  const all = readTags();
  const existing = all.find((t) => t.slug === slug);
  if (!existing) return;
  existing.status = "active";
  writeTags(all);
}

export function deleteTagPermanently(slug: string): void {
  const all = readTags();
  const existing = all.find((t) => t.slug === slug);
  writeTags(all.filter((t) => t.slug !== slug));
  if (existing) {
    writePosts(
      readPosts().map((p) => ({
        ...p,
        tags: (p.tags || []).filter((id) => id !== existing.id),
      })),
    );
  }
}

function propagateCategorySlugChange(
  oldId: number,
  newId: number,
  newSlug: string,
  newName: string,
) {
  writePosts(
    readPosts().map((p) => ({
      ...p,
      categories: (p.categories || []).map((id) => (id === oldId ? newId : id)),
    })),
  );
  writeCategories(
    readCategories().map((c) =>
      c.id === newId ? { ...c, slug: newSlug, name: newName, path: `/category/${newSlug}/` } : c,
    ),
  );
}

function propagateTagSlugChange(oldId: number, newId: number, newSlug: string, newName: string) {
  writePosts(
    readPosts().map((p) => ({
      ...p,
      tags: (p.tags || []).map((id) => (id === oldId ? newId : id)),
    })),
  );
  writeTags(
    readTags().map((t) =>
      t.id === newId ? { ...t, slug: newSlug, name: newName, path: `/tag/${newSlug}/` } : t,
    ),
  );
}

export function getActiveCategoryOptions(): Array<CategoryTerm> {
  return readCategories()
    .filter((t) => (t.status || "active") !== "trash")
    .map(categoryToTerm);
}

export function getActiveTagOptions(): Array<TagTerm> {
  return readTags()
    .filter((t) => (t.status || "active") !== "trash")
    .map(tagToTerm);
}

export function getAllCategoryTerms(): Array<CategoryTerm> {
  return readCategories().map(categoryToTerm);
}

export function getAllTagTerms(): Array<TagTerm> {
  return readTags().map(tagToTerm);
}

export function getCategoryTermBySlug(slug: string): CategoryTerm | null {
  const hit = readCategories().find((t) => t.slug === slug);
  return hit ? categoryToTerm(hit) : null;
}

export function getTagTermBySlug(slug: string): TagTerm | null {
  const hit = readTags().find((t) => t.slug === slug);
  return hit ? tagToTerm(hit) : null;
}
