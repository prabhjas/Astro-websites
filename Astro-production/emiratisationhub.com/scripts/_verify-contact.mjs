#!/usr/bin/env node
const BASE = process.env.LOCAL_BASE || 'http://127.0.0.1:5107';
const payload = {
  name: 'Ops Verify Test',
  email: 'ops-verify@example.com',
  phone: '+971501234567',
  message: 'Ops verification test — please ignore / delete.',
  formName: 'Emiratisation Hub Contact Form',
  formSource: '270',
  pageUrl: `${BASE}/contact-us/`,
  submissionId: `ops-verify-${Date.now()}`,
  submittedAt: new Date().toISOString(),
};

for (const path of ['/api/contact/', '/api/contact/']) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ ...payload, submissionId: `${payload.submissionId}-${path.replace(/\W/g, '')}` }),
  });
  const text = await res.text();
  console.log(JSON.stringify({ path, status: res.status, location: res.headers.get('location'), body: text.slice(0, 400) }));
}

const h = await (await fetch(`${BASE}/emiratisation-in-private-sector/`)).text();
const abs = [...h.matchAll(/https:\/\/emiratisationhub\.com\/(?:wp-content|wp-includes)[^"'\\\s>]*/g)].map((m) => m[0]);
const cg = [...h.matchAll(/connectgroup\.co[^"'\\\s>]*/g)].map((m) => m[0].slice(0, 140));
console.log(JSON.stringify({ abs, cg }, null, 2));
