const LOCAL = 'http://127.0.0.1:5108';

async function postContact(body) {
  const res = await fetch(LOCAL + '/api/contact/', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: res.status, json };
}

function base(overrides = {}) {
  return {
    name: 'QA Tester',
    email: 'qa.tester@example.com',
    phone: '+971501234567',
    message: 'Validation and Pipedrive smoke test',
    pageUrl: LOCAL + '/contact-us/',
    ...overrides,
  };
}

console.log('\n=== Redirects ===');
for (const [from, expectLoc] of [
  ['/emiratisation/', '/emiratisation-recruitment/'],
  ['/nafis-benefits/', '/nafis-benefits-program/'],
  ['/staff-outsourcing-solutions-in-uae/', '/staff-outsourcing/'],
  ['/about/', '/about-us/'],
  ['/contact/', '/contact-us/'],
]) {
  const res = await fetch(LOCAL + from, { redirect: 'manual' });
  const loc = res.headers.get('location') || '';
  const ok = res.status === 301 && loc.includes(expectLoc);
  console.log(ok ? 'PASS' : 'FAIL', from, '→', res.status, loc);
}

console.log('\n=== Assets ===');
for (const p of [
  '/js/phone-flags/flags.png',
  '/js/phone-flags/flags@2x.png',
  '/api/geo/country',
  '/contact-us/',
]) {
  const res = await fetch(LOCAL + p, { redirect: 'manual' });
  console.log(res.status, p, res.headers.get('content-type') || '');
}

console.log('\n=== Validation ===');
const cases = [
  ['empty name', base({ name: '' }), false],
  ['digits in name', base({ name: 'John123' }), false],
  ['bad email', base({ email: 'not-an-email' }), false],
  ['empty phone', base({ phone: '' }), false],
  ['empty message', base({ message: '' }), false],
  ['valid', base({ name: 'John Doe', message: 'Hello from QA redirect and form check' }), true],
];

for (const [label, body, expectOk] of cases) {
  const { status, json } = await postContact(body);
  const ok = expectOk ? status === 200 && json.success : status >= 400 || json.success === false;
  console.log(ok ? 'PASS' : 'FAIL', label, status, JSON.stringify(json).slice(0, 160));
}
