export const prerender = false;

/** CF7 refill stub — Astro has no WP REST; keep CF7 happy. */
export async function GET() {
  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST() {
  return GET();
}
