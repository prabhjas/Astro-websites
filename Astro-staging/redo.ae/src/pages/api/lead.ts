import type { APIRoute } from 'astro';

// Server-only (never prerendered) so the Pipedrive token stays secret.
export const prerender = false;

const API = 'https://api.pipedrive.com/v1';

// Same Connect Group Pipedrive account as Al Buraq → same owner/label/custom-field IDs
// (Pipedrive custom fields are account-wide). Overridable via env.
const OWNER_ID = Number(import.meta.env.PIPEDRIVE_OWNER_ID || process.env.PIPEDRIVE_OWNER_ID || 13601147);
const VISIBLE_TO = Number(import.meta.env.PIPEDRIVE_VISIBLE_TO || process.env.PIPEDRIVE_VISIBLE_TO || 3);
const PERSON_LABEL = Number(import.meta.env.PIPEDRIVE_PERSON_LABEL || process.env.PIPEDRIVE_PERSON_LABEL || 5);
const LEAD_TITLE = import.meta.env.PIPEDRIVE_LEAD_TITLE || process.env.PIPEDRIVE_LEAD_TITLE || 'AD redo';
const CF_SUBMITTED_ON = '1b6c5556b8f2796d4a87d842248152f78384ac37';
const CF_MESSAGE      = '3a108ee6cdcaad880546876dd524bfa9aa686da7';
const CF_COUNTRY      = '4c0ac56cd5cca4ff7d5996b692608d5b82ea9dc6';
const CF_LANDED_ON    = '1a6deacde079621009c4acc7d0e0c237a84d3d86';

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

export const POST: APIRoute = async ({ request }) => {
  const token = import.meta.env.PIPEDRIVE_API_TOKEN || process.env.PIPEDRIVE_API_TOKEN;
  if (!token) return json({ ok: false, error: 'Form is not configured yet.' }, 503);

  let body: Record<string, string> = {};
  try {
    const ct = request.headers.get('content-type') || '';
    body = ct.includes('application/json')
      ? await request.json()
      : Object.fromEntries((await request.formData()) as any);
  } catch {
    return json({ ok: false, error: 'Bad request.' }, 400);
  }

  // redo.ae CF7 fields: f-name, l-name, your-email, your-phone, textarea-292, gclid, initial_url
  const name = [body['f-name'], body['l-name']].map((s) => (s || '').trim()).filter(Boolean).join(' ');
  const email = (body['your-email'] || body.email || '').trim();
  const phone = (body['your-phone'] || body.phone || '').trim();
  const message = (body['textarea-292'] || body['your-message'] || body.message || '').trim();
  const gclid = (body['gclid'] || '').trim();
  const submittedOn = (body['initial_url'] || request.headers.get('referer') || '').trim();
  const landedOn = [submittedOn, gclid && `(gclid: ${gclid})`].filter(Boolean).join(' ');

  if ((body['_gotcha'] || '').trim()) return json({ ok: true });            // honeypot
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
    const person = await pd('/persons', {
      name, owner_id: OWNER_ID, visible_to: [VISIBLE_TO], email, phone, label: PERSON_LABEL,
    });
    const personId = person.data?.data?.id;
    if (!person.ok || !personId) return json({ ok: false, error: 'Could not save the lead.' }, 502);

    const lead = await pd('/leads', {
      title: LEAD_TITLE,
      owner_id: OWNER_ID,
      person_id: personId,
      [CF_SUBMITTED_ON]: `Lead Submitted On: ${submittedOn}`,
      [CF_MESSAGE]: message,
      [CF_COUNTRY]: '',
      [CF_LANDED_ON]: `User Landed on:${landedOn ? ' ' + landedOn : ''}`,
    });
    if (!lead.ok) return json({ ok: false, error: 'Could not save the lead.' }, 502);

    return json({ ok: true });
  } catch (err) {
    console.error('[lead] error', err);
    return json({ ok: false, error: 'Something went wrong. Please try again.' }, 500);
  }
};
