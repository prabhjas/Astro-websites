import { readFileSync } from 'fs';

const raw = readFileSync('src/legacy/services.cleaned.html', 'utf8');
const body = (raw.match(/<body\b[^>]*\bclass=["']([^"']*)["']/i) || [])[1] || '';
console.log('BODY_FULL', JSON.stringify(body));
console.log('len', body.length);
console.log('has single-post', /\bsingle-post\b/.test(body));
console.log('has singular', /\bsingular\b/.test(body));
console.log('indexes of single', [...body.matchAll(/single/g)].map((m) => m.index));

// Debug the body regex — maybe it's capturing too much?
const m = raw.match(/<body\b[^>]*\bclass=["']([^"']*)["']/i);
console.log('match0 slice', JSON.stringify(m?.[0]?.slice(0, 200)));
