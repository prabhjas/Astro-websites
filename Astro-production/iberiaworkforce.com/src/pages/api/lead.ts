import type { APIRoute } from 'astro';

// Runs on the server (never prerendered) so the Pipedrive token stays secret.
export const prerender = false;

const API = 'https://api.pipedrive.com/v1';

// Pipedrive routing. Fill these in with the Iberia Workforce account values via env.
const OWNER_ID = Number(import.meta.env.PIPEDRIVE_OWNER_ID || process.env.PIPEDRIVE_OWNER_ID || 0);
const VISIBLE_TO = Number(import.meta.env.PIPEDRIVE_VISIBLE_TO || process.env.PIPEDRIVE_VISIBLE_TO || 3);
const LEAD_TITLE =
  import.meta.env.PIPEDRIVE_LEAD_TITLE || process.env.PIPEDRIVE_LEAD_TITLE || 'Website lead — iberiaworkforce.com';

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
      : (Object.fromEntries((await request.formData()) as any) as Record<string, string>);
  } catch {
    return json({ ok: false, error: 'Bad request.' }, 400);
  }

  const name = (body.name || '').trim();
  const email = (body.email || '').trim();
  const phone = (body.phone || '').trim();
  const companyName = (body.company || '').trim();
  const service = (body.service || '').trim();
  const message = (body.message || '').trim();
  const lang = (body.lang || 'en').trim();
  const landedOn = (body.landed_url || request.headers.get('referer') || '').trim();

  // Honeypot — bots fill hidden fields; pretend success and drop it.
  if ((body._gotcha || '').trim()) return json({ ok: true });
  if (!name || (!email && !phone)) {
    return json({ ok: false, error: 'Please add your name and an email or phone.' }, 422);
  }

  const owner = OWNER_ID > 0 ? { owner_id: OWNER_ID } : {};

  const pd = (path: string, payload: object) =>
    fetch(`${API}${path}?api_token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(async (r) => ({ ok: r.ok, data: await r.json().catch(() => ({})) }));

  try {
    // 1) Person
    const person = await pd('/persons', {
      name,
      ...owner,
      visible_to: [VISIBLE_TO],
      ...(email ? { email: [{ value: email, primary: true }] } : {}),
      ...(phone ? { phone: [{ value: phone, primary: true }] } : {}),
    });
    const personId = (person.data as any)?.data?.id;
    if (!person.ok || !personId) {
      console.error('[lead] person create failed', person.data);
      return json({ ok: false, error: 'Could not save the lead.' }, 502);
    }

    // 2) Organization (optional)
    let orgId: number | undefined;
    if (companyName) {
      const org = await pd('/organizations', { name: companyName, ...owner, visible_to: [VISIBLE_TO] });
      orgId = (org.data as any)?.data?.id;
      if (orgId) await pd(`/persons/${personId}`, { org_id: orgId }); // link person → org
    }

    // 3) Lead
    const lead = await pd('/leads', {
      title: `${LEAD_TITLE}${service ? ` — ${service}` : ''}`,
      ...owner,
      person_id: personId,
      ...(orgId ? { organization_id: orgId } : {}),
    });
    const leadId = (lead.data as any)?.data?.id;
    if (!lead.ok || !leadId) {
      console.error('[lead] lead create failed', lead.data);
      return json({ ok: false, error: 'Could not save the lead.' }, 502);
    }

    // 4) Note with the details (works without any custom-field setup in the account).
    const noteLines = [
      service && `Service of interest: ${service}`,
      companyName && `Company: ${companyName}`,
      `Language: ${lang}`,
      landedOn && `Submitted from: ${landedOn}`,
      message && `\nMessage:\n${message}`,
    ].filter(Boolean);
    if (noteLines.length) {
      await pd('/notes', { lead_id: leadId, content: noteLines.join('\n') });
    }

    return json({ ok: true });
  } catch (err) {
    console.error('[lead] error', err);
    return json({ ok: false, error: 'Something went wrong. Please try again.' }, 500);
  }
};
