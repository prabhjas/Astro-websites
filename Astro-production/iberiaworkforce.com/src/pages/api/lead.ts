/**
 * Back-compat alias for the pre-fleet `/api/lead` endpoint.
 * Prefer POST /api/contact (fleet contract).
 */
export const prerender = false;

export { POST } from './contact';
