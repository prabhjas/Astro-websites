/**
 * Trigger Astro's custom 404.astro (SSR). Prefer this over ad-hoc HTML/text
 * so unknown URLs never leak prepare:page instructions or return 503.
 */
export function notFoundResponse() {
  return new Response(null, {
    status: 404,
    statusText: 'Not Found',
  });
}
