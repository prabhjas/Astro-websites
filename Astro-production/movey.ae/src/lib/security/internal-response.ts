export function applyInternalNoIndexHeaders(headers: Headers): void {
  headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  headers.set('Cache-Control', 'no-store, private');
}

/** Reliable 303 for dashboard form POSTs (avoids hanging on the API URL). */
export function dashboardSeeOther(request: Request, path: string): Response {
  const headers = new Headers();
  applyInternalNoIndexHeaders(headers);
  headers.set('Location', new URL(path, request.url).toString());
  return new Response(null, { status: 303, headers });
}
