/**
 * Read/write helpers for src/data/*.json used by the public site + dashboard.
 * Always reads from disk so dashboard edits apply without a rebuild.
 */
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type {
  AuthorEntry,
  CaseStudyEntry,
  CategoryEntry,
  PageEntry,
  PostEntry,
  TagEntry,
} from "./content-types";

const DATA_DIR = join(process.cwd(), "src/data");

type CacheEntry = { mtimeMs: number; data: unknown[] };
const arrayCache = new Map<string, CacheEntry>();

function readArray<T>(fileName: string): T[] {
  const path = join(DATA_DIR, fileName);
  if (!existsSync(path)) return [];
  try {
    const mtimeMs = statSync(path).mtimeMs;
    const cached = arrayCache.get(path);
    if (cached && cached.mtimeMs === mtimeMs) {
      return cached.data as T[];
    }
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    const data = Array.isArray(parsed) ? parsed : [];
    arrayCache.set(path, { mtimeMs, data });
    return data as T[];
  } catch {
    return [];
  }
}

function writeArray<T>(fileName: string, rows: T[]): void {
  const path = join(DATA_DIR, fileName);
  writeFileSync(path, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
  arrayCache.delete(path);
}

export function readPages(): PageEntry[] {
  return readArray<PageEntry>("pages.json");
}

export function readPosts(): PostEntry[] {
  return readArray<PostEntry>("posts.json");
}

export function writePosts(rows: PostEntry[]): void {
  writeArray("posts.json", rows);
}

export function readCaseStudies(): CaseStudyEntry[] {
  return readArray<CaseStudyEntry>("case-studies.json");
}

export function readCategories(): CategoryEntry[] {
  return readArray<CategoryEntry>("categories.json");
}

export function writeCategories(rows: CategoryEntry[]): void {
  writeArray("categories.json", rows);
}

export function readTags(): TagEntry[] {
  return readArray<TagEntry>("tags.json");
}

export function writeTags(rows: TagEntry[]): void {
  writeArray("tags.json", rows);
}

export function readAuthors(): AuthorEntry[] {
  return readArray<AuthorEntry>("authors.json");
}

export function nextNumericId(rows: Array<{ id: number }>): number {
  return rows.reduce((max, row) => Math.max(max, Number(row.id) || 0), 0) + 1;
}
