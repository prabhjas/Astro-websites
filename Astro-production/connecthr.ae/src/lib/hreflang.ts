import { absoluteUrl, getPages, normalizePath } from "./content";

export type HreflangAlternate = {
  hreflang: string;
  href: string;
};

/** Resolve EN/AR hreflang pairs from the live pages store. */
export function resolveHreflangAlternates(pathname: string): HreflangAlternate[] {
  const normalized = normalizePath(pathname);
  const known = new Set(getPages().map((p) => normalizePath(p.path)));

  const enPath =
    normalized === "/ar/" ? "/" : normalized.startsWith("/ar/") ? normalized.replace(/^\/ar\//, "/") : normalized;
  const arPath =
    normalized === "/" ? "/ar/" : normalized.startsWith("/ar/") ? normalized : `/ar${normalized}`;

  const alternates: HreflangAlternate[] = [];
  if (known.has(enPath)) {
    alternates.push({ hreflang: "en-AE", href: absoluteUrl(enPath) });
  }
  if (known.has(arPath)) {
    alternates.push({ hreflang: "ar", href: absoluteUrl(arPath) });
  }
  if (alternates.length) {
    const defaultPath = known.has(enPath) ? enPath : arPath;
    alternates.push({ hreflang: "x-default", href: absoluteUrl(defaultPath) });
  }
  return alternates;
}
