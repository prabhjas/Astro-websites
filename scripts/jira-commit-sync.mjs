#!/usr/bin/env node
/**
 * Sync recent Astro-production commits on a branch into Jira DEV tickets.
 *
 * Env (required):
 *   JIRA_EMAIL          Atlassian account email
 *   JIRA_API_TOKEN      Atlassian API token
 *   JIRA_CLOUD_ID       Cloud ID UUID (default: connect-marketing)
 *   JIRA_PROJECT_KEY    default DEV
 *
 * Optional:
 *   GIT_SINCE           git --since value (default: 24 hours ago)
 *   GIT_REF             git ref to scan (default: HEAD)
 *   DRY_RUN             1 = print only
 *
 * Skip a commit with [skip jira] in the subject.
 */
import { execFileSync } from 'node:child_process';

const CLOUD_ID = process.env.JIRA_CLOUD_ID || '5b8a830d-0824-481c-83be-1d5d8b477112';
const PROJECT = process.env.JIRA_PROJECT_KEY || 'DEV';
const EMAIL = process.env.JIRA_EMAIL;
const TOKEN = process.env.JIRA_API_TOKEN;
const SINCE = process.env.GIT_SINCE || '24 hours ago';
const REF = process.env.GIT_REF || 'HEAD';
const DRY = process.env.DRY_RUN === '1';
const ROOT = process.cwd();

const AUTHORS = {
  MuhammadMushtaq: { accountId: '712020:8851c826-494d-4345-b770-35d80838168d', name: 'Muhammad Mushtaq' },
  MuhammadMushtaque: { accountId: '712020:8851c826-494d-4345-b770-35d80838168d', name: 'Muhammad Mushtaq' },
  'Dev-Tabish': { accountId: '712020:d3d56b11-4655-4b7c-9ae5-cc054ce9d84d', name: 'Muhammad Tabish' },
  rajpalSing: { accountId: '712020:7df4daef-fbc8-46ff-a6a1-0d02b0280ea2', name: 'Rajpal Singh' },
  'prabhjass-afk': { accountId: '62860e31f0302e0068bea3ca', name: 'Prabhjas Singh' },
  'prabhjas.s': { accountId: '62860e31f0302e0068bea3ca', name: 'Prabhjas Singh' },
};

/** Brand select option ids for customfield_10092 */
const DOMAIN_BRAND = {
  'eormiddleast.com': { name: 'EOR Middle East', id: '10306' },
  'redo.ae': { name: 'Redo', id: '10124' },
  'connectfm.ae': { name: 'Connect FM', id: '10305' },
  'iberiaeor.com': { name: 'Iberia EOR', id: '10149' },
  'iberiaworkforce.com': { name: 'Iberia EOR', id: '10149' },
  'connectfreelance.ae': { name: 'Connect Freelance', id: '10130' },
  'spheavyrental.ae': { name: 'S&P Heavy Machinery', id: '10168' },
  'connectfz.com': { name: 'Connect FZ', id: '10142' },
  'mbs-consultancy.com': { name: 'MBS Consultancy', id: '10371' },
  'connecthr.ae': { name: 'Connect HR', id: '10123' },
  'connectresources.ae': { name: 'Connect Resources', id: '10122' },
  'connectgroup.co': { name: 'Connect Group', id: '10169' },
  'kpmpro.ae': { name: 'KPM PRO', id: '10127' },
  'peomiddleast.com': { name: 'PEO Middle East', id: '10126' },
  'emiratisationgate.org': { name: 'Emiratisation Gate', id: '10136' },
  'emiratisationhub.com': { name: 'EmiratisationHUB', id: '10137' },
  'emiratisationgateway.com': { name: 'Emiratisation NAFIS', id: '10138' },
  'royalvisa.ae': { name: 'Royal Visa', id: '10133' },
  'kinzahr.com': { name: 'Kinza HR', id: '10128' },
  'c-uae.com': { name: 'C-UAE', id: '10140' },
  'connectzone.ae': { name: 'Connect Zone', id: '10143' },
  'connectstaff.ae': { name: 'Connect Staff', id: '10131' },
  'izi.ae': { name: 'IZI Rent a Car', id: '10125' },
  'alburaq.ae': { name: 'Al Buraq', id: '10437' },
  'ngmanpower.com': { name: 'NG Manpower', id: '10129' },
  'saudicompanyformation.com': { name: 'Saudi Company Formation', id: '10135' },
  'companyformationsaudi.com': { name: 'Company Formation Saudi', id: '10141' },
};

const TRANSITIONS = {
  'In Progress': '31',
  Testing: '51',
  RELEASED: '61',
  'To Do': '21',
};

function sh(cmd, args) {
  return execFileSync(cmd, args, { encoding: 'utf8', cwd: ROOT }).trim();
}

function authHeader() {
  if (!EMAIL || !TOKEN) throw new Error('JIRA_EMAIL and JIRA_API_TOKEN are required');
  return 'Basic ' + Buffer.from(`${EMAIL}:${TOKEN}`).toString('base64');
}

async function jira(path, { method = 'GET', body } = {}) {
  const res = await fetch(`https://api.atlassian.com/ex/jira/${CLOUD_ID}/rest/api/3${path}`, {
    method,
    headers: {
      Authorization: authHeader(),
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`Jira ${method} ${path} → ${res.status}: ${text.slice(0, 500)}`);
  }
  return data;
}

function listCommits() {
  const out = sh('git', [
    'log',
    REF,
    `--since=${SINCE}`,
    '--pretty=format:%H\t%h\t%an\t%s',
    '--no-merges',
  ]);
  if (!out) return [];
  return out.split('\n').map((line) => {
    const [hash, short, author, ...rest] = line.split('\t');
    return { hash, short, author, subject: rest.join('\t') };
  });
}

function filesFor(hash) {
  const out = sh('git', ['show', '--name-only', '--pretty=format:', hash]);
  return out ? out.split('\n').filter(Boolean) : [];
}

function brandFor(files) {
  const brands = [];
  for (const f of files) {
    const m = f.match(/^Astro-production\/([^/]+)\//);
    if (m && DOMAIN_BRAND[m[1]]) brands.push(DOMAIN_BRAND[m[1]]);
  }
  const uniq = [...new Map(brands.map((b) => [b.id, b])).values()];
  if (uniq.length === 1) return uniq[0];
  if (uniq.length > 1) return { name: uniq.map((b) => b.name).join(' + '), id: uniq[0].id };
  return null;
}

async function findExisting(short) {
  const jql = `project = ${PROJECT} AND labels = "git-${short}" ORDER BY created DESC`;
  const data = await jira('/search', {
    method: 'POST',
    body: { jql, maxResults: 5, fields: ['summary', 'key'] },
  });
  return data.issues?.[0] || null;
}

function statusForSubject(subject) {
  const s = subject.toLowerCase();
  if (/\b(ship|publish|fix|live)\b/.test(s)) return 'Testing';
  return 'In Progress';
}

async function createTicket({ short, subject, author, brand, files }) {
  const who = AUTHORS[author];
  if (!who) return { skipped: true, reason: `unmapped author ${author}` };
  if (/\[skip jira\]/i.test(subject)) return { skipped: true, reason: 'skip jira' };

  const existing = await findExisting(short);
  if (existing) {
    return { skipped: true, reason: `already ${existing.key}`, key: existing.key };
  }

  const brandLabel = brand?.name || 'multi-site';
  const summary = `${brandLabel}: ${subject}`.slice(0, 200);
  const description = [
    `Auto-synced from git commit \`${short}\`.`,
    '',
    `**Author:** ${who.name}`,
    brand ? `**Brand:** ${brand.name}` : '',
    '',
    '### Files',
    ...files
      .filter((f) => f.startsWith('Astro-production/'))
      .slice(0, 25)
      .map((f) => `- \`${f}\``),
    '',
    'Label: `commit-sync`',
  ]
    .filter(Boolean)
    .join('\n');

  const fields = {
    project: { key: PROJECT },
    issuetype: { name: 'Task' },
    summary,
    description: {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: description }],
        },
      ],
    },
    assignee: { accountId: who.accountId },
    labels: ['commit-sync', `git-${short}`],
  };
  if (brand?.id) fields.customfield_10092 = { id: brand.id };

  if (DRY) {
    console.log(`[dry-run] would create: ${summary}`);
    return { dry: true, summary };
  }

  const created = await jira('/issue', { method: 'POST', body: { fields } });
  const key = created.key;
  const statusName = statusForSubject(subject);
  const tid = TRANSITIONS[statusName];
  if (tid) {
    await jira(`/issue/${key}/transitions`, { method: 'POST', body: { transition: { id: tid } } });
  }
  return { key, summary, statusName };
}

async function main() {
  const commits = listCommits().filter((c) => AUTHORS[c.author]);
  console.log(`Scanning ${commits.length} mapped commits since ${SINCE} on ${REF}`);
  const results = [];
  for (const c of commits) {
    const files = filesFor(c.hash);
    if (!files.some((f) => f.startsWith('Astro-production/'))) continue;
    const brand = brandFor(files);
    try {
      const r = await createTicket({ ...c, brand, files });
      results.push({ short: c.short, ...r });
      console.log(c.short, r.key || r.reason || r.summary);
    } catch (err) {
      console.error(c.short, err.message);
      results.push({ short: c.short, error: err.message });
    }
  }
  const created = results.filter((r) => r.key && !r.skipped);
  console.log(`Done. Created ${created.length} tickets.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
