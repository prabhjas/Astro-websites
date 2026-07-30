export function applyInternalNoIndexHeaders(headers: Headers): void {
  headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  headers.set('Cache-Control', 'no-store, private');
}
