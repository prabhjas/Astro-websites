import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import test from 'node:test';

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(packageDir, '..', '..');
const directHelperSites = [
  'connectfreelance.ae',
  'connectresources.ae',
  'emiratiguard.com',
  'emiratisationgate.org',
  'emiratisationgateway.com',
  'freelancerdxb.com',
  'kpmpro.ae',
  'ngmanpower.com',
  'payrollmiddleast.org',
  'peomiddleast.com',
  'pittant.com',
  'thefreelancergate.com',
];

const parserStreamSites = ['redo.ae'];

const localReexportSites = [
  'c-uae.com',
  'cbss.ae',
  'connectfm.ae',
  'connectfz.com',
  'connectgroup.co',
  'connecthr.ae',
  'connectresources.sa',
  'connectstaff.ae',
  'eormiddleast.com',
  'evolutionmiddleast.com',
  'iberiaeor.com',
  'iberiaworkforce.com',
  'kinzahr.com',
  'royalvisa.ae',
  'spheavyrental.ae',
];

test('all 28 M-03 contact routes stream-limit before parsing', async () => {
  assert.equal(directHelperSites.length + parserStreamSites.length + localReexportSites.length, 28);
  for (const site of directHelperSites) {
    const path = resolve(repoRoot, 'Astro-production', site, 'src/pages/api/contact.ts');
    const source = await readFile(path, 'utf8');
    assert.match(source, /@connect\/site-cms\/http\/request-body/, site);
    assert.match(source, /readRequestBodyLimited\(request, (?:MAX_BODY_BYTES|maxBody)\)/, site);
    assert.match(source, /replayRequestWithBody\(request, limitedBody\.bytes\)/, site);
    assert.doesNotMatch(source, /await request\.(?:json|formData)\(\)/, site);
  }

  for (const site of parserStreamSites) {
    const path = resolve(repoRoot, 'Astro-production', site, 'src/pages/api/contact.ts');
    const source = await readFile(path, 'utf8');
    assert.match(source, /@connect\/site-cms\/http\/request-body/, site);
    assert.match(source, /requestWithLimitedBody\(request, maxBody\)/, site);
    assert.match(source, /isRequestBodyTooLargeError\(error\)/, site);
    assert.match(source, /MAX_JSON_BODY_BYTES = 1 \* 1024 \* 1024/, site);
    assert.match(source, /MAX_MULTIPART_BODY_BYTES = 10 \* 1024 \* 1024/, site);
    assert.match(source, /mediaType === 'multipart\/form-data'/, site);
    assert.match(source, /mediaType === 'application\/json'/, site);
    assert.doesNotMatch(source, /contentType\w*\.includes\((?:'|")application\/json/, site);
    assert.match(source, /Object\.hasOwn\(json, 'attachments_b64'\)/, site);
    assert.match(source, /fieldCount > 200/, site);
    assert.doesNotMatch(source, /replayRequestWithBody|await request\.(?:json|formData)\(\)/, site);
  }

  for (const site of localReexportSites) {
    const routePath = resolve(repoRoot, 'Astro-production', site, 'src/pages/api/contact.ts');
    const helperPath = resolve(repoRoot, 'Astro-production', site, 'src/utils/form/read-body-limited.ts');
    const [routeSource, helperSource] = await Promise.all([
      readFile(routePath, 'utf8'),
      readFile(helperPath, 'utf8'),
    ]);
    assert.match(routeSource, /utils\/form\/read-body-limited/, site);
    assert.match(routeSource, /readRequestBodyLimited\(request, MAX_BODY_BYTES\)/, site);
    assert.doesNotMatch(routeSource, /await request\.(?:arrayBuffer|json|formData)\(\)/, site);
    assert.equal(
      helperSource.trim(),
      "export { readRequestBodyLimited } from '@connect/site-cms/http/request-body';",
      site,
    );
  }
});

test('Redo sends file uploads as multipart instead of base64 JSON', async () => {
  const path = resolve(repoRoot, 'Astro-production', 'redo.ae', 'public/js/astro-mirror-fixes.js');
  const source = await readFile(path, 'utf8');
  assert.match(source, /requestBody = new FormData\(\)/);
  assert.match(source, /requestBody\.append\('attachments\[\]', file, file\.name\)/);
  assert.doesNotMatch(source, /attachments_b64|readAsDataURL/);
});
