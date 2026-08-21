/**
 * Replay the exact custom-field payload shape used by createPipedriveLead.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const envTxt = readFileSync(join(ROOT, '.env'), 'utf8');
function env(k) {
  return (envTxt.match(new RegExp(`^${k}=(.*)$`, 'm'))?.[1] || '').trim();
}

const token = env('PIPEDRIVE_API_TOKEN');
const domain = env('PIPEDRIVE_COMPANY_DOMAIN') || 'connectgroup2';
const owner = Number(env('PIPEDRIVE_OWNER_ID') || '0');
const websiteId = Number(env('WEBSITE_ID') || '0');
const leadSource = Number(env('PIPEDRIVE_LEAD_SOURCE_ID') || '270');
const base = `https://${domain}.pipedrive.com/api/v1`;

const keys = {
  message: '3a108ee6cdcaad880546876dd524bfa9aa686da7',
  source: '296a2c3746355d2b33b7ff392bd038199eaf9665',
  website: 'af2182f3f2ee03a51c7dcfd898951a268787343c',
  leadSubmittedOn: '1b6c5556b8f2796d4a87d842248152f78384ac37',
  userLandedOn: 'da1c7e07576ae835e0cf337b831ab2db59d64707',
  device: '9c13a77c0d5cb7f5bdb1a3c63d784d88b5555029',
  campaignId: 'b8da9d1e02468bc3b9e62958fd86a1fa61d4c215',
  gclid: 'd3a15df8cde497d2eb39515f9488f681440cca92',
};

async function api(path, method = 'GET', body) {
  const url = new URL(base + path);
  url.searchParams.set('api_token', token);
  const r = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, j };
}

const stamp = Date.now();
const person = await api('/persons', 'POST', {
  name: `IZI FieldProbe ${stamp}`,
  owner_id: owner,
  visible_to: 3,
  label_ids: [5],
  email: [{ value: `izi-probe-${stamp}@example.com`, primary: true, label: 'work' }],
  phone: [{ value: '+971500000077', primary: true, label: 'work' }],
});
console.log('person', person.status, person.j?.success, person.j?.error, person.j?.data?.id);
const personId = person.j?.data?.id;
if (!personId) process.exit(1);

const full = {
  title: `IZI Rent a Car - FieldProbe ${stamp}`,
  owner_id: owner,
  person_id: personId,
  [keys.message]: 'Contact Form Submission\n\nName: GoLive\nEmail: x@y.com\nPhone: +971',
  [keys.source]: leadSource,
  [keys.website]: websiteId,
  [keys.userLandedOn]: 'User Landed on: http://127.0.0.1:5121',
  [keys.device]: 'c',
  [keys.campaignId]: '99',
  [keys.gclid]: 'golive-gclid',
};

const lead = await api('/leads', 'POST', full);
console.log('fullLead', lead.status, lead.j?.success, lead.j?.error, lead.j?.error_info, lead.j?.data?.id);

// binary search-ish: drop suspect fields
for (const drop of ['device', 'campaignId', 'gclid', 'userLandedOn', 'website', 'source']) {
  const body = { ...full, title: `IZI drop ${drop} ${stamp}` };
  delete body[keys[drop]];
  const r = await api('/leads', 'POST', body);
  console.log('drop', drop, r.status, r.j?.success, r.j?.error, r.j?.data?.id);
}

// website options include 5064?
const fields = await api('/leadFields');
const websiteField = (fields.j?.data || []).find((f) => f.key === keys.website);
const ids = (websiteField?.options || []).map((o) => o.id);
const labels = (websiteField?.options || []).map((o) => `${o.id}:${o.label}`);
console.log('has5064', ids.includes(5064));
console.log('izi-ish options', labels.filter((l) => /izi|rent|car/i.test(l)));
console.log('optionCount', ids.length);

const deviceField = (fields.j?.data || []).find((f) => f.key === keys.device);
console.log('deviceField', deviceField && { type: deviceField.field_type, options: deviceField.options });
