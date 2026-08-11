/**
 * Verify contact form → Pipedrive after PIPEDRIVE_OWNER_ID change.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnv(p) {
  const out = {};
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

function ownerOf(entity) {
  const o = entity?.data?.owner_id;
  if (o && typeof o === 'object') return Number(o.id);
  return o == null ? null : Number(o);
}

const env = loadEnv('.env');
const token = env.PIPEDRIVE_API_TOKEN;
const domain = env.PIPEDRIVE_COMPANY_DOMAIN;
const expectedOwner = Number(env.PIPEDRIVE_OWNER_ID);
const base = `https://${domain}.pipedrive.com/api/v1`;

async function pd(path) {
  const res = await fetch(`${base}${path}${path.includes('?') ? '&' : '?'}api_token=${token}`);
  return res.json();
}

const prev = JSON.parse(
  readFileSync('.data/leads/state/0b27ea28-d66b-44c9-ae42-0b21781a4dbc.json', 'utf8'),
);
const prevPerson = await pd(`/persons/${prev.pipedrivePersonId}`);
const prevLead = await pd(`/leads/${prev.pipedriveLeadId}`);
const prevPersonOwner = ownerOf(prevPerson);
const prevLeadOwner = ownerOf(prevLead);

const sid = `qa-owner-${Date.now()}`;
const payload = {
  fullName: 'QA Owner Verify',
  firstName: 'QA',
  lastName: 'Owner Verify',
  email: `qa.owner.verify.lla+${Date.now()}@example.com`,
  phone: '+971501112233',
  message: `QA test after PIPEDRIVE_OWNER_ID update to ${expectedOwner}`,
  formName: 'contact-form',
  formSource: '270',
  pageUrl: 'http://127.0.0.1:5112/contact-us/',
  submissionPageUrl: 'http://127.0.0.1:5112/contact-us/',
  submissionId: sid,
};

const apiRes = await fetch('http://127.0.0.1:5112/api/contact/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-idempotency-key': sid },
  body: JSON.stringify(payload),
});
const apiJson = await apiRes.json();

await new Promise((r) => setTimeout(r, 2000));

let newState = null;
for (const n of readdirSync('.data/leads/state')) {
  if (!n.endsWith('.json')) continue;
  const rec = JSON.parse(readFileSync(resolve('.data/leads/state', n), 'utf8'));
  if (rec.publicId === sid || rec.publicId === apiJson.submissionId) {
    newState = rec;
    break;
  }
}

let newPersonOwner = null;
let newLeadOwner = null;
if (newState?.pipedrivePersonId && newState?.pipedriveLeadId) {
  newPersonOwner = ownerOf(await pd(`/persons/${newState.pipedrivePersonId}`));
  newLeadOwner = ownerOf(await pd(`/leads/${newState.pipedriveLeadId}`));
}

const report = {
  expectedOwner,
  previousBrowserLead: {
    publicId: prev.publicId,
    deliveryStatus: prev.deliveryStatus,
    personId: prev.pipedrivePersonId,
    leadId: prev.pipedriveLeadId,
    personOwner: prevPersonOwner,
    leadOwner: prevLeadOwner,
    ownerMatch: prevPersonOwner === expectedOwner && prevLeadOwner === expectedOwner,
  },
  newApiSubmit: {
    httpStatus: apiRes.status,
    success: apiJson.success,
    submissionId: apiJson.submissionId,
    deliveryStatus: newState?.deliveryStatus ?? null,
    personId: newState?.pipedrivePersonId ?? null,
    leadId: newState?.pipedriveLeadId ?? null,
    summary: newState?.pipedriveResponseSummary ?? null,
    personOwner: newPersonOwner,
    leadOwner: newLeadOwner,
    ownerMatch: newPersonOwner === expectedOwner && newLeadOwner === expectedOwner,
  },
};

writeFileSync('scripts/_qa-owner-verify.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
