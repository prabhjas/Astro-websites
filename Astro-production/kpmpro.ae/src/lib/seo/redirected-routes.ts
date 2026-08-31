import { readCanonicalRedirectsYaml } from '../runtime-redirects/store.ts';
import { normaliseCanonicalPath } from './sitemap-utils.ts';

let cachedPaths: Set<string> | null = null;

/** Normalised paths (e.g. `/dubai-pro/`) that 301 elsewhere — never sitemap targets. */
export function getRedirectSourcePaths(projectRoot = process.cwd()): Set<string> {
  if (cachedPaths) return cachedPaths;
  const paths = new Set<string>();
  for (const rule of readCanonicalRedirectsYaml(projectRoot)) {
    const from = normaliseCanonicalPath(rule.from);
    if (from) paths.add(from);
  }
  cachedPaths = paths;
  return paths;
}

export function isRedirectSourcePath(path: string, projectRoot = process.cwd()): boolean {
  const normalised = normaliseCanonicalPath(path);
  if (!normalised) return false;
  return getRedirectSourcePaths(projectRoot).has(normalised);
}

export function isRedirectSourceSlug(slug: string, projectRoot = process.cwd()): boolean {
  const path = slug ? `/${slug}/` : '/';
  return isRedirectSourcePath(path, projectRoot);
}
