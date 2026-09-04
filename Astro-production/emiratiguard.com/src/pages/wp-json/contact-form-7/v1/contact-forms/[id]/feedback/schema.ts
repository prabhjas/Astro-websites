export const prerender = false;

/** CF7 REST stub — WP endpoints are not available on Astro; forms post to /api/contact. */
export async function GET() {
  return new Response(JSON.stringify({ version: "contact-form-7.stub", schema: {} }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
