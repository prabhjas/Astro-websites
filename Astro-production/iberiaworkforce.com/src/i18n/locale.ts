export type Locale = "en" | "es";

/** True for `/es` and `/es/...`. */
export function getLocale(pathname: string): Locale {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/es" || path.startsWith("/es/")) return "es";
  return "en";
}

/** Drop the `/es` prefix so English and Spanish share the same path logic. */
export function stripLocale(pathname: string): string {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/es") return "/";
  if (path.startsWith("/es/")) {
    const rest = path.slice(3);
    return rest.startsWith("/") ? rest : `/${rest}`;
  }
  return path;
}

/**
 * Directory routes always carry a trailing slash (`trailingSlash: 'always'`).
 * Preserves `?query` and `#hash`. Leaves file-like paths alone.
 */
function withTrailingSlash(href: string): string {
  const match = href.match(/^([^?#]*)(.*)$/);
  if (!match) return href;
  const [, path = "", rest = ""] = match;
  if (!path || path === "/") return href;
  if (path.endsWith("/")) return href;
  if (/\.[a-zA-Z0-9]+$/.test(path)) return href;
  return `${path}/${rest}`;
}

/**
 * Prefix (or strip) an internal href for the active locale.
 * Leaves hashes, absolute URLs, mailto and tel alone.
 * Always emits a trailing slash for page paths.
 */
export function withLocale(href: string, lang: Locale): string {
  if (
    !href ||
    href.startsWith("#") ||
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
  ) {
    return href;
  }

  let next: string;
  if (lang === "en") {
    if (href === "/es" || href === "/es/") next = "/";
    else if (href.startsWith("/es/")) next = href.slice(3) || "/";
    else next = href;
  } else if (href === "/es" || href.startsWith("/es/")) {
    next = href;
  } else if (href === "/") {
    next = "/es/";
  } else {
    next = href.startsWith("/") ? `/es${href}` : `/es/${href}`;
  }

  return withTrailingSlash(next);
}

/** Counterpart URL in the other language (same page, other locale). */
export function switchLocalePath(pathname: string, target: Locale): string {
  const bare = stripLocale(pathname);
  return withLocale(bare === "/" ? "/" : bare.endsWith("/") ? bare : `${bare}/`, target);
}

/** Locale-prefixed path with a trailing slash, for canonicals and hreflang. */
export function canonicalHref(pathname: string, lang: Locale): string {
  return withLocale(stripLocale(pathname) || "/", lang);
}

/**
 * Walk content data and rewrite `href` / `action` strings for the locale.
 * Used so Spanish YAML can keep English path values and still link under `/es`.
 */
export function localizeHrefs<T>(value: T, lang: Locale): T {
  if (lang === "en") {
    // Still normalize trailing slashes on English path values from YAML.
    if (Array.isArray(value)) {
      return value.map((item) => localizeHrefs(item, lang)) as T;
    }
    if (value && typeof value === "object") {
      const out: Record<string, unknown> = {};
      for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        if ((key === "href" || key === "action") && typeof child === "string") {
          out[key] = withLocale(child, "en");
        } else {
          out[key] = localizeHrefs(child, lang);
        }
      }
      return out as T;
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => localizeHrefs(item, lang)) as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if ((key === "href" || key === "action") && typeof child === "string") {
        out[key] = withLocale(child, lang);
      } else {
        out[key] = localizeHrefs(child, lang);
      }
    }
    return out as T;
  }
  return value;
}
