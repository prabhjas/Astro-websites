import type { APIRoute } from 'astro';

// Runs on the server (never prerendered) so the Pipedrive token stays secret.
export const prerender = false;

const API = 'https://api.pipedrive.com/v1';

// ── Pipedrive mapping — copied 1:1 from the old WordPress CF7→Pipedrive plugin config
// (recovered from the live site's submission log). These IDs belong to the Al Buraq
// Pipedrive account; override via env if the account ever changes.
const OWNER_ID = Number(import.meta.env.PIPEDRIVE_OWNER_ID || process.env.PIPEDRIVE_OWNER_ID || 13601147);
const VISIBLE_TO = Number(import.meta.env.PIPEDRIVE_VISIBLE_TO || process.env.PIPEDRIVE_VISIBLE_TO || 3);
const PERSON_LABEL = Number(import.meta.env.PIPEDRIVE_PERSON_LABEL || process.env.PIPEDRIVE_PERSON_LABEL || 5);
const LEAD_TITLE = import.meta.env.PIPEDRIVE_LEAD_TITLE || process.env.PIPEDRIVE_LEAD_TITLE || 'AD alburaq';
// Lead custom-field keys (Pipedrive field hashes) from the WP config:
const CF_SUBMITTED_ON = '1b6c5556b8f2796d4a87d842248152f78384ac37'; // "Lead Submitted On: <url>"
const CF_MESSAGE      = '3a108ee6cdcaad880546876dd524bfa9aa686da7'; // the visitor's message
const CF_COUNTRY      = '4c0ac56cd5cca4ff7d5996b692608d5b82ea9dc6'; // country
const CF_LANDED_ON    = '1a6deacde079621009c4acc7d0e0c237a84d3d86'; // "User Landed on: <url>"

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

export const POST: APIRoute = async ({ request }) => {
  const token = import.meta.env.PIPEDRIVE_API_TOKEN || process.env.PIPEDRIVE_API_TOKEN;
  if (!token) {
    console.warn('[lead] PIPEDRIVE_API_TOKEN is not set — submission not forwarded.');
    return json({ ok: false, error: 'Form is not configured yet.' }, 503);
  }

  let body: Record<string, string> = {};
  try {
    const ct = request.headers.get('content-type') || '';
    body = ct.includes('application/json')
      ? await request.json()
      : Object.fromEntries((await request.formData()) as any);
  } catch {
    return json({ ok: false, error: 'Bad request.' }, 400);
  }

  const name = (body['full-name'] || body.name || '').trim();
  const email = (body['your-email'] || body.email || '').trim();
  const phone = (body['phone'] || body['phonetext-257'] || '').trim();
  const country = (body['country'] || body['countrytext-787'] || '').trim();
  const message = (body['your-message'] || body.message || '').trim();
  const submittedOn = (body['initial_url'] || request.headers.get('referer') || '').trim();
  const landedOn = (body['landed_url'] || '').trim();

  // Honeypot — bots fill hidden fields; pretend success.
  if ((body['_gotcha'] || '').trim()) return json({ ok: true });
  if (!name || (!email && !phone)) {
    return json({ ok: false, error: 'Please add your name and an email or phone.' }, 422);
  }

  const pd = (path: string, payload: object) =>
    fetch(`${API}${path}?api_token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(async (r) => ({ ok: r.ok, data: await r.json().catch(() => ({})) }));

  try {
    // 1) Person — same shape the WP plugin sends
    const person = await pd('/persons', {
      name,
      owner_id: OWNER_ID,
      visible_to: [VISIBLE_TO],
      email,
      phone,
      label: PERSON_LABEL,
    });
    const personId = person.data?.data?.id;
    if (!person.ok || !personId) {
      console.error('[lead] person create failed', person.data);
      return json({ ok: false, error: 'Could not save the lead.' }, 502);
    }

    // 2) Lead — title + owner + person + the 4 custom fields, exactly like WP
    const lead = await pd('/leads', {
      title: LEAD_TITLE,
      owner_id: OWNER_ID,
      person_id: personId,
      [CF_SUBMITTED_ON]: `Lead Submitted On: ${submittedOn}`,
      [CF_MESSAGE]: message,
      [CF_COUNTRY]: country,
      [CF_LANDED_ON]: `User Landed on:${landedOn ? ' ' + landedOn : ''}`,
    });
    if (!lead.ok) {
      console.error('[lead] lead create failed', lead.data);
      return json({ ok: false, error: 'Could not save the lead.' }, 502);
    }

    return json({ ok: true });
  } catch (err) {
    console.error('[lead] error', err);
    return json({ ok: false, error: 'Something went wrong. Please try again.' }, 500);
  }
};
