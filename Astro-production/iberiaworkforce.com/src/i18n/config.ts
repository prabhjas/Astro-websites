export const LANGS = ['en', 'es'] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = 'en';

// Root-relative prefix for a language ('' for the default at the site root).
export function langBase(lang: Lang): string {
  return lang === DEFAULT_LANG ? '' : `/${lang}`;
}

// Build a trailing-slash, language-aware path. localize('en','/about') → '/about/'
export function localize(lang: Lang, path = '/'): string {
  const clean = '/' + path.replace(/^\/+|\/+$/g, '');
  const base = langBase(lang);
  if (clean === '/') return base ? `${base}/` : '/';
  return `${base}${clean}/`;
}

// Given the current path, return the equivalent path in the other language.
export function altPath(path: string, from: Lang, to: Lang): string {
  let rest = path;
  if (from !== DEFAULT_LANG) rest = rest.replace(new RegExp(`^/${from}`), '');
  rest = rest.replace(/^\/+|\/+$/g, '');
  return localize(to, rest);
}
