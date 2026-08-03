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
      phone: '+971501234567',
      message: 'Hello',
    });
    assert.equal(result.valid, true);
  });

  it('rejects invalid form without calling downstream services', () => {
    const result = validateContactForm({
      name: '',
      email: 'bad',
      phone: '',
      message: '',
    });
    assert.equal(result.valid, false);
    if (!result.valid) {
      assert.ok(result.errors.email);
      assert.ok(result.errors.phone);
      assert.ok(result.errors.message);
    }
  });

  it('rejects missing message', () => {
    const result = validateContactForm({
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '+971501234567',
      message: '',
    });
    assert.equal(result.valid, false);
    if (!result.valid) {
      assert.ok(result.errors.message);
    }
  });

  it('rejects honeypot submissions', () => {
    const result = validateContactForm({
      name: 'Bot',
      email: 'bot@example.com',
      phone: '+971501234567',
      message: 'spam',
      honeypot: 'filled',
    });
    assert.equal(result.valid, false);
  });

  it('rejects names with numbers or URLs', () => {
    const withNumber = validateContactForm({
      name: 'Jane 123',
      email: 'jane@example.com',
      phone: '+971501234567',
      message: 'Hello',
    });
    assert.equal(withNumber.valid, false);
    if (!withNumber.valid) assert.ok(withNumber.errors.name);

    const withUrl = validateContactForm({
      name: 'Visit www.spam.com',
      email: 'jane@example.com',
      phone: '+971501234567',
      message: 'Hello',
    });
    assert.equal(withUrl.valid, false);
    if (!withUrl.valid) assert.ok(withUrl.errors.name);
  });

  it('rejects messages containing links', () => {
    const result = validateContactForm({
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '+971501234567',
      message: 'Check https://example.com for details',
    });
    assert.equal(result.valid, false);
    if (!result.valid) assert.ok(result.errors.message);
  });

  it('rejects phone numbers that contain letters', () => {
    const result = validateContactForm({
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '+97150ABC4567',
      message: 'Hello',
    });
    assert.equal(result.valid, false);
    if (!result.valid) {
      assert.ok(result.errors.phone);
      assert.match(result.errors.phone, /numbers only/i);
    }
  });

  it('accepts multi-step submissions without a free-text message', () => {
    const result = validateContactForm({
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '+971501234567',
      formId: 'cbss-multistep',
      professionSector: 'IT/Software',
    });
    assert.equal(result.valid, true);
  });
});

describe('normaliseFormData', () => {
  it('passes campaign and location parameters', () => {
    const data = normaliseFormData({
      name: 'Jane Doe',
      campaign: 'spring-2026',
      location: 'Dubai',
      utmSource: 'google',
    });
    assert.equal(data.campaign, 'spring-2026');
    assert.equal(data.location, 'Dubai');
    assert.equal(data.utmSource, 'google');
  });
});

describe('parseContactFormBody', () => {
  it('maps legacy CF7 blog/insights field names', () => {
    const parsed = parseContactFormBody({
      'your-name': 'Jane Doe',
      'your-email': 'jane@example.com',
      'phonetext-892': '+971501234567',
      'your-subject': 'HR enquiry',
      'your-message': 'Need help with compliance',
    });

    const result = validateContactForm(parsed);
    assert.equal(result.valid, true);
    if (result.valid) {
      assert.equal(result.data.fullName, 'Jane Doe');
      assert.equal(result.data.email, 'jane@example.com');
      assert.equal(result.data.message, 'Subject: HR enquiry\n\nNeed help with compliance');
      assert.equal(result.data.campaign, 'HR enquiry');
    }
  });

  it('maps contact-us full-name field', () => {
    const parsed = parseContactFormBody({
      'full-name': 'John Smith',
      'your-email': 'john@example.com',
      'phonetext-257': '+971509876543',
      'your-message': 'Hello',
    });

    const result = validateContactForm(parsed);
    assert.equal(result.valid, true);
    if (result.valid) {
      assert.equal(result.data.fullName, 'John Smith');
    }
  });
});

describe('maskSensitiveValue', () => {
  it('masks email and phone values', () => {
    assert.equal(maskSensitiveValue('jane.doe@example.com', 'email'), 'ja***@example.com');
    assert.equal(maskSensitiveValue('+971501234567', 'phone'), '***4567');
  });
});
