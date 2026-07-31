import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseNotificationEmails } from '../src/utils/form/parse-emails.ts';
import { removeEmptyValues, isMeaningfulValue } from '../src/utils/form/remove-empty.ts';
import { maskSensitiveValue } from '../src/utils/form/mask.ts';
import { parseContactFormBody } from '../src/utils/form/parse-contact-body.ts';
import { validateContactForm, normaliseFormData } from '../src/utils/form/validate.ts';

describe('parseNotificationEmails', () => {
  it('parses multiple comma-separated emails', () => {
    const result = parseNotificationEmails(' admin@example.com, sales@example.com ,team@example.com ');
    assert.deepEqual(result, ['admin@example.com', 'sales@example.com', 'team@example.com']);
  });

  it('returns empty array when no valid emails', () => {
    assert.deepEqual(parseNotificationEmails(''), []);
    assert.deepEqual(parseNotificationEmails('not-an-email'), []);
    assert.deepEqual(parseNotificationEmails(null), []);
  });
});

describe('removeEmptyValues', () => {
  it('removes empty, null, undefined, and literal null strings', () => {
    const result = removeEmptyValues({
      a: 'value',
      b: '',
      c: null,
      d: 'null',
      e: 'undefined',
      f: '  ',
    });
    assert.deepEqual(result, { a: 'value' });
  });
});

describe('isMeaningfulValue', () => {
  it('rejects meaningless values', () => {
    assert.equal(isMeaningfulValue(''), false);
    assert.equal(isMeaningfulValue('null'), false);
    assert.equal(isMeaningfulValue('hello'), true);
  });
});

describe('validateContactForm', () => {
  it('accepts valid form data', () => {
    const result = validateContactForm({
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '+34600111222',
      message: 'Hello',
    });
    assert.equal(result.valid, true);
  });

  it('accepts email without phone (Iberia)', () => {
    const result = validateContactForm({
      name: 'Jane Doe',
      email: 'jane@example.com',
      message: 'Need EOR help',
    });
    assert.equal(result.valid, true);
  });

  it('rejects invalid email and empty name', () => {
    const result = validateContactForm({
      name: '',
      email: 'bad',
      phone: '',
      message: '',
    });
    assert.equal(result.valid, false);
    if (!result.valid) {
      assert.ok(result.errors.name);
      assert.ok(result.errors.email);
    }
  });

  it('synthesises message when empty', () => {
    const result = validateContactForm({
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '+34600111222',
      message: '',
      professionSector: 'EOR',
      company: 'Acme SL',
    });
    assert.equal(result.valid, true);
    if (result.valid) {
      assert.match(result.data.message, /EOR/);
      assert.match(result.data.message, /Acme SL/);
    }
  });

  it('rejects honeypot submissions', () => {
    const result = validateContactForm({
      name: 'Bot',
      email: 'bot@example.com',
      phone: '+34600111222',
      message: 'spam',
      honeypot: 'filled',
    });
    assert.equal(result.valid, false);
  });

  it('rejects names with numbers or URLs', () => {
    const withNumber = validateContactForm({
      name: 'Jane 123',
      email: 'jane@example.com',
      phone: '+34600111222',
      message: 'Hello',
    });
    assert.equal(withNumber.valid, false);
    if (!withNumber.valid) assert.ok(withNumber.errors.name);

    const withUrl = validateContactForm({
      name: 'Visit www.spam.com',
      email: 'jane@example.com',
      phone: '+34600111222',
      message: 'Hello',
    });
    assert.equal(withUrl.valid, false);
    if (!withUrl.valid) assert.ok(withUrl.errors.name);
  });

  it('rejects messages containing links', () => {
    const result = validateContactForm({
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '+34600111222',
      message: 'Check https://example.com for details',
    });
    assert.equal(result.valid, false);
    if (!result.valid) assert.ok(result.errors.message);
  });

  it('rejects phone numbers that contain letters', () => {
    const result = validateContactForm({
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '+34600ABC1122',
      message: 'Hello',
    });
    assert.equal(result.valid, false);
    if (!result.valid) {
      assert.ok(result.errors.phone);
      assert.match(result.errors.phone, /numbers only/i);
    }
  });
});

describe('normaliseFormData', () => {
  it('passes campaign and location parameters', () => {
    const data = normaliseFormData({
      name: 'Jane Doe',
      campaign: 'spring-2026',
      location: 'Madrid',
      utmSource: 'google',
    });
    assert.equal(data.campaign, 'spring-2026');
    assert.equal(data.location, 'Madrid');
    assert.equal(data.utmSource, 'google');
  });
});

describe('parseContactFormBody', () => {
  it('maps Iberia contact form fields', () => {
    const parsed = parseContactFormBody({
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '+34600111222',
      company: 'Acme SL',
      service: 'Employer of Record',
      message: 'Need help with compliance',
      lang: 'es',
      landed_url: 'https://iberiaworkforce.com/es/contact/',
      _gotcha: '',
    });

    const result = validateContactForm(parsed);
    assert.equal(result.valid, true);
    if (result.valid) {
      assert.equal(result.data.fullName, 'Jane Doe');
      assert.equal(result.data.company, 'Acme SL');
      assert.equal(result.data.professionSector, 'Employer of Record');
      assert.equal(result.data.leadSource, 'es');
      assert.equal(result.data.pageUrl, 'https://iberiaworkforce.com/es/contact/');
    }
  });

  it('maps honeypot _gotcha', () => {
    const parsed = parseContactFormBody({
      name: 'Bot',
      email: 'bot@example.com',
      _gotcha: 'spam',
    });
    assert.equal(parsed.honeypot, 'spam');
  });
});

describe('maskSensitiveValue', () => {
  it('masks email and phone values', () => {
    assert.equal(maskSensitiveValue('jane.doe@example.com', 'email'), 'ja***@example.com');
    assert.equal(maskSensitiveValue('+34600111222', 'phone'), '***1222');
  });
});
