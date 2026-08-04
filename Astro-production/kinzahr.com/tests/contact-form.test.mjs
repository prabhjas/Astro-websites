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
      message: 'Hello, I need staffing help.',
      company: 'Acme Corp',
    });
    assert.equal(result.valid, true);
  });

  it('rejects invalid form without calling downstream services', () => {
    const result = validateContactForm({
      name: '',
      email: 'bad',
      phone: '',
      message: '',
      company: '',
    });
    assert.equal(result.valid, false);
    if (!result.valid) {
      assert.ok(result.errors.email);
      assert.ok(result.errors.phone);
      assert.ok(result.errors.message);
      assert.ok(result.errors.company);
    }
  });

  it('rejects name with digits', () => {
    const result = validateContactForm({
      name: '666',
      email: 'jane@example.com',
      phone: '971501234567',
      message: 'Hello, I need staffing help.',
      company: 'Acme Corp',
    });
    assert.equal(result.valid, false);
    if (!result.valid) {
      assert.match(result.errors.name || '', /letters and spaces/i);
    }
  });

  it('accepts short phone and short message when both are present', () => {
    const result = validateContactForm({
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '501234',
      message: 'Hi',
      company: 'Acme',
    });
    assert.equal(result.valid, true);
  });

  it('rejects missing message', () => {
    const result = validateContactForm({
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '971501234567',
      message: '',
      company: 'Acme Corp',
    });
    assert.equal(result.valid, false);
    if (!result.valid) {
      assert.ok(result.errors.message);
    }
  });

  it('rejects missing company when company field is present', () => {
    const result = validateContactForm({
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '971501234567',
      message: 'Hello, I need staffing help.',
      company: '',
    });
    assert.equal(result.valid, false);
    if (!result.valid) {
      assert.match(result.errors.company || '', /company/i);
    }
  });

  it('allows missing company when field was not submitted (blog forms)', () => {
    const result = validateContactForm({
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '971501234567',
      message: 'Hello, I need staffing help.',
    });
    assert.equal(result.valid, true);
  });

  it('rejects honeypot submissions', () => {
    const result = validateContactForm({
      name: 'Bot',
      email: 'bot@example.com',
      phone: '971501234567',
      message: 'spam message long enough',
      company: 'Spam Co',
      honeypot: 'filled',
    });
    assert.equal(result.valid, false);
  });

  it('rejects links in message and name fields', () => {
    const withLink = validateContactForm({
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '971501234567',
      message: 'See https://spam.example.com for details',
      company: 'Acme Corp',
    });
    assert.equal(withLink.valid, false);
    if (!withLink.valid) {
      assert.ok(withLink.errors.message);
    }

    const nameLink = validateContactForm({
      name: 'Visit www.spam.com',
      email: 'jane@example.com',
      phone: '971501234567',
      message: 'Hello there friend',
      company: 'Acme Corp',
    });
    assert.equal(nameLink.valid, false);
    if (!nameLink.valid) {
      assert.ok(nameLink.errors.name);
    }
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
      'your-phone': '+971509876543',
      'your-message': 'Hello, I need staffing help.',
      'company-name': 'Kinza Partner LLC',
    });

    const result = validateContactForm(parsed);
    assert.equal(result.valid, true);
    if (result.valid) {
      assert.equal(result.data.fullName, 'John Smith');
      assert.equal(result.data.phone, '+971509876543');
      assert.equal(result.data.company, 'Kinza Partner LLC');
    }
  });

  it('maps KinzaHR f-name / l-name CF7 fields', () => {
    const parsed = parseContactFormBody({
      'f-name': 'Sara',
      'l-name': 'Ahmed',
      'your-email': 'sara@example.com',
      'phonetext-257': '+971501112233',
      'your-message': 'Need EOR help in Abu Dhabi',
      description: 'Need EOR help in Abu Dhabi',
    });

    const result = validateContactForm(parsed);
    assert.equal(result.valid, true);
    if (result.valid) {
      assert.equal(result.data.fullName, 'Sara Ahmed');
      assert.equal(result.data.firstName, 'Sara');
      assert.equal(result.data.lastName, 'Ahmed');
      assert.equal(result.data.email, 'sara@example.com');
    }
  });

  it('rejects empty company-name from service forms', () => {
    const parsed = parseContactFormBody({
      'f-name': 'Sara Ahmed',
      'your-email': 'sara@example.com',
      'your-phone': '+971501112233',
      'company-name': '',
      'your-message': 'Need EOR help in Abu Dhabi',
    });
    const result = validateContactForm(parsed);
    assert.equal(result.valid, false);
    if (!result.valid) {
      assert.ok(result.errors.company);
    }
  });
});

describe('maskSensitiveValue', () => {
  it('masks email and phone values', () => {
    assert.equal(maskSensitiveValue('jane.doe@example.com', 'email'), 'ja***@example.com');
    assert.equal(maskSensitiveValue('+971501234567', 'phone'), '***4567');
  });
});
