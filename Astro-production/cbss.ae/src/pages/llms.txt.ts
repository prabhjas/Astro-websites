import type { APIRoute } from 'astro';
import { licenceLlmsSection } from '../lib/licence.ts';

export const prerender = false;

/**
 * llms.txt — the plain-text brief AI crawlers read to understand who we are.
 * CBSS is a single-page site, so this is hand-shaped rather than generated from
 * a sitemap; the licence block comes from src/data/licence.json so the numbers
 * can never drift from the footer band.
 */
export const GET: APIRoute = ({ site }) => {
  const origin = (site?.origin ?? 'https://cbss.ae').replace(/\/$/, '');

  const body = [
    '# CBSS — Connect Business Support Services',
    '',
    '> CBSS is a Dubai-based business consultancy advising companies on setup, licensing and expansion in the UAE. All official applications are processed directly through the relevant UAE government authorities.',
    '',
    '## Pages',
    '',
    `- [Home](${origin}/): Business advisory for confident expansion in Dubai.`,
    '',
    licenceLlmsSection(origin),
  ]
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd();

  return new Response(`${body}\n`, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
};
