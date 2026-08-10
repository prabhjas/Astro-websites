import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = 'Astro-production/emiratisationhub.com/.data/leads';
function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) walk(p, out);
    else if (name.name.endsWith('.json')) out.push(p);
  }
  return out;
}
const files = walk(root).sort((a, b) => {
  try {
    return readFileSync(b).length && 0;
  } catch {
    return 0;
  }
});
// Prefer newest by mtime via listing order — read all recent and pick by createdAt
let latest = null;
for (const f of files) {
  try {
    const j = JSON.parse(readFileSync(f, 'utf8'));
    if (!latest || String(j.createdAt || '') > String(latest.createdAt || '')) latest = { ...j, _file: f };
  } catch {}
}
if (!latest) {
  console.log('no leads');
  process.exit(1);
}
console.log(
  JSON.stringify(
    {
      file: latest._file,
      publicId: latest.publicId,
      deliveryStatus: latest.deliveryStatus,
      submissionStatus: latest.submissionStatus,
      personId: latest.pipedrivePersonId || latest.deliveryMeta?.personId,
      leadId: latest.pipedriveLeadId || latest.deliveryMeta?.leadId,
      dealId: latest.pipedriveDealId || latest.deliveryMeta?.dealId,
      error: latest.lastDeliveryError || latest.deliveryError,
      name: latest.payload?.fullName,
      email: latest.payload?.email,
      phone: latest.payload?.phone,
      createdAt: latest.createdAt,
    },
    null,
    2,
  ),
);
