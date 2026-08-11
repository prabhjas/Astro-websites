/**
 * Diagnose Pipedrive person/lead create for izi.ae credentials.
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
console.log({ owner, websiteId, leadSource, domain });

// users/me
const me = await api('/users/me');
console.log('me', me.status, me.j?.data?.id, me.j?.data?.name, me.j?.success, me.j?.error);

// try person with no labels
const personNoLabel = await api('/persons', 'POST', {
  name: `IZI Diagnose ${stamp}`,
  owner_id: owner,
  visible_to: 3,
  email: [{ value: `izi-diag-${stamp}@example.com`, primary: true, label: 'work' }],
  phone: [{ value: '+971500000088', primary: true, label: 'work' }],
});
console.log('personNoLabel', personNoLabel.status, personNoLabel.j?.success, personNoLabel.j?.error, personNoLabel.j?.data?.id);

// try person with label 5
const personLabel5 = await api('/persons', 'POST', {
  name: `IZI Diagnose L5 ${stamp}`,
  owner_id: owner,
  visible_to: 3,
  label_ids: [5],
  email: [{ value: `izi-diag-l5-${stamp}@example.com`, primary: true, label: 'work' }],
  phone: [{ value: '+971500000087', primary: true, label: 'work' }],
});
console.log('personLabel5', personLabel5.status, personLabel5.j?.success, personLabel5.j?.error, personLabel5.j?.data?.id);

const personId = personNoLabel.j?.data?.id || personLabel5.j?.data?.id;
if (personId) {
  // website field key from env defaults
  const websiteKey = 'af2182f3f2ee03a51c7dcfd898951a268787343c';
  const sourceKey = '296a2c3746355d2b33b7ff392bd038199eaf9665';
  const msgKey = '3a108ee6cdcaad880546876dd524bfa9aa686da7';

  const leadMinimal = await api('/leads', 'POST', {
    title: `IZI Rent a Car - Diagnose ${stamp}`,
    owner_id: owner,
    person_id: personId,
  });
  console.log('leadMinimal', leadMinimal.status, leadMinimal.j?.success, leadMinimal.j?.error, leadMinimal.j?.data?.id);

  const leadWithFields = await api('/leads', 'POST', {
    title: `IZI Rent a Car - Diagnose fields ${stamp}`,
    owner_id: owner,
    person_id: personId,
    [msgKey]: 'Diagnose message',
    [sourceKey]: leadSource,
    [websiteKey]: websiteId,
  });
  console.log('leadWithFields', leadWithFields.status, leadWithFields.j?.success, leadWithFields.j?.error, leadWithFields.j?.data?.id);

  // probe website field options
  const fields = await api('/leadFields');
  const websiteField = (fields.j?.data || []).find((f) => f.key === websiteKey || /website/i.test(f.name || ''));
  console.log(
    'websiteField',
    websiteField && {
      key: websiteField.key,
      name: websiteField.name,
      field_type: websiteField.field_type,
      options: (websiteField.options || []).slice(0, 30),
    },
  );
}
