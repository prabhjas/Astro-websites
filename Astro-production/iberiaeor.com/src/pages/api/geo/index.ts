import type { APIRoute } from 'astro';

/** Legacy `/api/geo/` for phone-flags.js — fleet path is `/api/geo/country`. */
export const prerender = false;

export { GET } from './country';
