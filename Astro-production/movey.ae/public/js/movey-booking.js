/**
 * Movey booking wizard — steps 1–5 + success, inline validation, country phone.
 */
(function () {
  const root = document.getElementById('movey-booking');
  if (!root) return;

  const COUNTRIES = [
    { iso: 'ae', dial: '971', name: 'United Arab Emirates', min: 9, max: 9 },
    { iso: 'sa', dial: '966', name: 'Saudi Arabia', min: 9, max: 9 },
    { iso: 'qa', dial: '974', name: 'Qatar', min: 8, max: 8 },
    { iso: 'kw', dial: '965', name: 'Kuwait', min: 8, max: 8 },
    { iso: 'bh', dial: '973', name: 'Bahrain', min: 8, max: 8 },
    { iso: 'om', dial: '968', name: 'Oman', min: 8, max: 8 },
    { iso: 'in', dial: '91', name: 'India', min: 10, max: 10 },
    { iso: 'pk', dial: '92', name: 'Pakistan', min: 10, max: 10 },
    { iso: 'ph', dial: '63', name: 'Philippines', min: 10, max: 10 },
    { iso: 'eg', dial: '20', name: 'Egypt', min: 10, max: 10 },
    { iso: 'jo', dial: '962', name: 'Jordan', min: 8, max: 9 },
    { iso: 'lb', dial: '961', name: 'Lebanon', min: 7, max: 8 },
    { iso: 'gb', dial: '44', name: 'United Kingdom', min: 10, max: 10 },
    { iso: 'us', dial: '1', name: 'United States', min: 10, max: 10 },
    { iso: 'ca', dial: '1', name: 'Canada', min: 10, max: 10 },
    { iso: 'au', dial: '61', name: 'Australia', min: 9, max: 9 },
    { iso: 'de', dial: '49', name: 'Germany', min: 10, max: 11 },
    { iso: 'fr', dial: '33', name: 'France', min: 9, max: 9 },
    { iso: 'it', dial: '39', name: 'Italy', min: 9, max: 10 },
    { iso: 'es', dial: '34', name: 'Spain', min: 9, max: 9 },
    { iso: 'nl', dial: '31', name: 'Netherlands', min: 9, max: 9 },
    { iso: 'za', dial: '27', name: 'South Africa', min: 9, max: 9 },
    { iso: 'ng', dial: '234', name: 'Nigeria', min: 10, max: 10 },
    { iso: 'ke', dial: '254', name: 'Kenya', min: 9, max: 9 },
    { iso: 'bd', dial: '880', name: 'Bangladesh', min: 10, max: 10 },
    { iso: 'lk', dial: '94', name: 'Sri Lanka', min: 9, max: 9 },
    { iso: 'np', dial: '977', name: 'Nepal', min: 10, max: 10 },
    { iso: 'cn', dial: '86', name: 'China', min: 11, max: 11 },
    { iso: 'ru', dial: '7', name: 'Russia', min: 10, max: 10 },
    { iso: 'tr', dial: '90', name: 'Turkey', min: 10, max: 10 },
    { iso: 'id', dial: '62', name: 'Indonesia', min: 9, max: 12 },
    { iso: 'my', dial: '60', name: 'Malaysia', min: 9, max: 10 },
    { iso: 'sg', dial: '65', name: 'Singapore', min: 8, max: 8 },
    { iso: 'ie', dial: '353', name: 'Ireland', min: 9, max: 9 },
    { iso: 'nz', dial: '64', name: 'New Zealand', min: 8, max: 10 },
  ];

  const TZ_COUNTRY = {
    'Asia/Dubai': 'ae',
    'Asia/Muscat': 'om',
    'Asia/Riyadh': 'sa',
    'Asia/Qatar': 'qa',
    'Asia/Kuwait': 'kw',
    'Asia/Bahrain': 'bh',
    'Asia/Karachi': 'pk',
    'Asia/Kolkata': 'in',
    'Asia/Calcutta': 'in',
    'Europe/London': 'gb',
    'America/New_York': 'us',
    'America/Chicago': 'us',
    'America/Los_Angeles': 'us',
    'Africa/Cairo': 'eg',
    'Asia/Manila': 'ph',
  };

  function flagEmoji(iso) {
    return iso
      .toUpperCase()
      .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt()));
  }

  function findCountry(iso) {
    return COUNTRIES.find((c) => c.iso === iso) || COUNTRIES[0];
  }

  const state = {
    step: 1,
    phone: '',
    country: findCountry('ae'),
    from: '',
    to: '',
    property: 'Apartment',
    bedrooms: '2',
    furnished: 'Lightly (2 Adults)',
    trucks: 2,
    moveDate: null,
    firstName: '',
    lastName: '',
    email: '',
    contactMethod: 'Phone',
  };

  const panels = [...root.querySelectorAll('[data-mb-panel]')];
  const stepItems = [...root.querySelectorAll('[data-mb-step]')];
  const summaryEl = root.querySelector('[data-mb-summary]');
  const successEl = root.querySelector('[data-mb-success]');
  const mainEl = root.querySelector('[data-mb-main]');
  const errorEl = root.querySelector('[data-mb-error]');
  const fillEl = root.querySelector('[data-mb-fill]');

  function fmtDate(d) {
    if (!d) return '';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function digitsOnly(value) {
    return String(value || '').replace(/\D/g, '');
  }

  function nationalNumber(raw) {
    let d = digitsOnly(raw);
    const dial = state.country.dial;
    if (d.startsWith(dial)) d = d.slice(dial.length);
    if (d.startsWith('0')) d = d.slice(1);
    return d;
  }

  function fullPhone() {
    const n = nationalNumber(state.phone);
    return n ? `+${state.country.dial}${n}` : '';
  }

  function isValidPhone(raw) {
    const n = nationalNumber(raw);
    return n.length >= state.country.min && n.length <= state.country.max;
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || '').trim());
  }

  function isValidName(value) {
    return /^[\p{L}][\p{L}\s'.-]{1,59}$/u.test(String(value || '').trim());
  }

  function isValidAddress(value) {
    return String(value || '').trim().length >= 5;
  }

  function clearFieldErrors(scope) {
    (scope || root).querySelectorAll('.mb-field.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
    (scope || root).querySelectorAll('[data-mb-err]').forEach((el) => {
      el.hidden = true;
      el.textContent = '';
    });
    const cal = (scope || root).querySelector('.mb-calendar');
    if (cal) cal.classList.remove('is-invalid');
    if (errorEl) errorEl.textContent = '';
  }

  function setFieldError(fieldName, message) {
    const field = root.querySelector(`[data-field="${fieldName}"]`);
    if (field) field.classList.add('is-invalid');
    const err = field ? field.querySelector('[data-mb-err]') : null;
    if (err) {
      err.hidden = false;
      err.textContent = message;
    } else if (errorEl) {
      errorEl.textContent = message;
    }
    const input = field && field.querySelector('input, .mb-calendar, .mb-cards, .mb-pills');
    return field && field.querySelector('input');
  }

  function renderSummary() {
    if (!summaryEl) return;
    const s1 =
      state.phone || state.from || state.to
        ? `<p>📞 ${fullPhone() || '—'}</p>
           <p>📍 From: ${state.from || '—'}</p>
           <p>📍 To: ${state.to || '—'}</p>`
        : '<p class="mb-muted">Not set yet</p>';
    const s2 =
      state.step > 2
        ? `<p>${state.property} · ${state.bedrooms} bed · ${state.furnished}</p>
           <p>🚚 ${state.trucks} Truck${state.trucks === 1 ? '' : 's'}</p>`
        : '';
    const s3 = state.moveDate ? `<p>📅 ${fmtDate(state.moveDate)}</p>` : '';

    summaryEl.innerHTML = `
      <li class="mb-summary__item">
        <span class="mb-summary__num">1</span>
        <div>
          <h3>Moving location</h3>
          ${s1}
        </div>
        ${state.step > 1 ? '<button type="button" class="mb-summary__edit" data-mb-goto="1">Edit</button>' : '<span></span>'}
      </li>
      <li class="mb-summary__item">
        <span class="mb-summary__num">2</span>
        <div>
          <h3>Required space</h3>
          ${s2 || '<p>Required Space</p>'}
        </div>
        ${state.step > 3 ? '<button type="button" class="mb-summary__edit" data-mb-goto="2">Edit</button>' : '<span></span>'}
      </li>
      <li class="mb-summary__item">
        <span class="mb-summary__num">3</span>
        <div>
          <h3>Your Moving Date</h3>
          ${s3 || '<p>Your Moving Date</p>'}
        </div>
        ${state.step > 4 ? '<button type="button" class="mb-summary__edit" data-mb-goto="4">Edit</button>' : '<span></span>'}
      </li>
      <li class="mb-summary__item">
        <span class="mb-summary__num">4</span>
        <div><h3>Your quote</h3></div>
        <span></span>
      </li>`;
  }

  function progressForPanel(n) {
    if (n <= 1) return 1;
    if (n <= 3) return 2;
    if (n === 4) return 3;
    return 4;
  }

  function showStep(n, opts) {
    const scroll = !opts || opts.scroll !== false;
    state.step = n;
    panels.forEach((p) => {
      p.hidden = Number(p.getAttribute('data-mb-panel')) !== n;
    });
    const progress = progressForPanel(n);
    stepItems.forEach((el) => {
      const i = Number(el.getAttribute('data-mb-step'));
      el.classList.toggle('is-active', i === progress);
      el.classList.toggle('is-done', i < progress);
    });
    if (fillEl) fillEl.style.width = `${Math.min(100, progress * 25)}%`;
    syncPhoneInputs();
    const stepsNav = root.querySelector('.mb-steps');
    if (stepsNav) stepsNav.hidden = false;
    renderSummary();
    if (errorEl) errorEl.textContent = '';
    if (!scroll) return;
    const panel = root.querySelector(`[data-mb-panel="${n}"]`);
    if (panel && typeof panel.scrollIntoView === 'function') {
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function readStep1() {
    clearFieldErrors(root.querySelector('[data-mb-panel="1"]'));
    const phoneInput = root.querySelector('[name="phone"]');
    state.phone = (phoneInput && phoneInput.value) || '';
    state.from = (root.querySelector('[name="from"]')?.value || '').trim();
    state.to = (root.querySelector('[name="to"]')?.value || '').trim();
    let firstInvalid = null;
    if (!isValidPhone(state.phone)) {
      firstInvalid = setFieldError('phone', `Enter a valid ${state.country.name} phone number.`);
    }
    if (!isValidAddress(state.from)) {
      firstInvalid = firstInvalid || setFieldError('from', 'Enter the address you are moving from.');
    }
    if (!isValidAddress(state.to)) {
      firstInvalid = firstInvalid || setFieldError('to', 'Enter the address you are moving to.');
    }
    if (firstInvalid) {
      firstInvalid.focus();
      return false;
    }
    state.phone = nationalNumber(state.phone);
    syncPhoneInputs();
    return true;
  }

  function readStep2() {
    clearFieldErrors(root.querySelector('[data-mb-panel="2"]'));
    if (!state.property || !state.bedrooms || !state.furnished) {
      setFieldError('space', 'Please choose property type, bedrooms, and furnishing.');
      return false;
    }
    return true;
  }

  function readStep3() {
    clearFieldErrors(root.querySelector('[data-mb-panel="3"]'));
    const trucksInput = root.querySelector('[data-mb-trucks-input]');
    const n = Math.max(0, Number(trucksInput && trucksInput.value) || state.trucks || 0);
    if (!Number.isInteger(n) || n < 1 || n > 10) {
      setFieldError('trucks', 'Enter between 1 and 10 truckloads.');
      if (trucksInput) trucksInput.focus();
      return false;
    }
    state.trucks = n;
    if (trucksInput) trucksInput.value = String(n);
    return true;
  }

  function readStep4() {
    clearFieldErrors(root.querySelector('[data-mb-panel="4"]'));
    if (!state.moveDate) {
      const cal = root.querySelector('.mb-calendar');
      if (cal) cal.classList.add('is-invalid');
      setFieldError('date', 'Please select a moving date.');
      return false;
    }
    return true;
  }

  function readStep5() {
    clearFieldErrors(root.querySelector('[data-mb-panel="5"]'));
    state.firstName = (root.querySelector('[name="firstName"]')?.value || '').trim();
    state.lastName = (root.querySelector('[name="lastName"]')?.value || '').trim();
    state.email = (root.querySelector('[name="email"]')?.value || '').trim();
    const mirror = root.querySelector('[data-mb-phone-mirror]');
    if (mirror) state.phone = mirror.value;
    const method = root.querySelector('[name="contactMethod"]:checked');
    state.contactMethod = method ? method.value : '';
    let firstInvalid = null;
    if (!isValidName(state.firstName)) {
      firstInvalid = setFieldError('firstName', 'Enter your first name.');
    }
    if (!isValidName(state.lastName)) {
      firstInvalid = firstInvalid || setFieldError('lastName', 'Enter your last name.');
    }
    if (!isValidEmail(state.email)) {
      firstInvalid = firstInvalid || setFieldError('email', 'Enter a valid email address.');
    }
    if (!isValidPhone(state.phone)) {
      firstInvalid = firstInvalid || setFieldError('phone2', `Enter a valid ${state.country.name} phone number.`);
    }
    if (!state.contactMethod) {
      firstInvalid = firstInvalid || setFieldError('contact', 'Choose a preferred contact method.');
    }
    if (firstInvalid) {
      firstInvalid.focus();
      return false;
    }
    state.phone = nationalNumber(state.phone);
    return true;
  }

  function paintCountryUI() {
    root.querySelectorAll('[data-mb-phone-wrap]').forEach((wrap) => {
      const flag = wrap.querySelector('[data-mb-flag]');
      const dial = wrap.querySelector('[data-mb-dial]');
      if (flag) flag.textContent = flagEmoji(state.country.iso);
      if (dial) dial.textContent = `+${state.country.dial}`;
      const input = wrap.querySelector('[data-mb-phone-input], [data-mb-phone-mirror], input');
      if (input) {
        input.setAttribute('maxlength', String(state.country.max + 2));
        input.placeholder = state.country.iso === 'ae' ? '50 123 4567' : 'Phone number';
      }
    });
    closeCountryLists();
  }

  function syncPhoneInputs() {
    const national = nationalNumber(state.phone);
    root.querySelectorAll('[name="phone"], [data-mb-phone-mirror]').forEach((el) => {
      if (document.activeElement !== el) el.value = national;
    });
    paintCountryUI();
  }

  function closeCountryLists() {
    root.querySelectorAll('[data-mb-country-list]').forEach((list) => {
      list.hidden = true;
    });
  }

  function countryListHtml() {
    return COUNTRIES.map(
      (c) =>
        `<button type="button" class="mb-country-list__item${c.iso === state.country.iso ? ' is-active' : ''}" data-mb-set-country="${c.iso}">
          <span>${flagEmoji(c.iso)}</span>
          <span>${c.name}</span>
          <span>+${c.dial}</span>
        </button>`,
    ).join('');
  }

  function setCountry(iso) {
    state.country = findCountry(iso);
    paintCountryUI();
    renderSummary();
  }

  function detectCountry() {
    const tz = (Intl.DateTimeFormat().resolvedOptions().timeZone || '').trim();
    if (TZ_COUNTRY[tz]) return TZ_COUNTRY[tz];
    const lang = String(navigator.language || '').toLowerCase();
    const region = lang.split('-')[1];
    if (region && findCountry(region) && COUNTRIES.some((c) => c.iso === region)) return region;
    return 'ae';
  }

  function initPhoneWidgets() {
    root.querySelectorAll('[data-mb-phone-wrap]').forEach((wrap) => {
      let list = wrap.parentElement.querySelector('[data-mb-country-list]');
      if (!list) {
        list = document.createElement('div');
        list.className = 'mb-country-list';
        list.setAttribute('data-mb-country-list', '');
        list.hidden = true;
        wrap.insertAdjacentElement('afterend', list);
      }
      const btn = wrap.querySelector('[data-mb-country-btn]');
      if (btn && !btn.dataset.bound) {
        btn.dataset.bound = '1';
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const open = !list.hidden;
          closeCountryLists();
          if (!open) {
            list.innerHTML = countryListHtml();
            list.hidden = false;
          }
        });
      }
      const input = wrap.querySelector('input');
      if (input && !input.dataset.boundPhone) {
        input.dataset.boundPhone = '1';
        input.setAttribute('inputmode', 'numeric');
        input.setAttribute('autocomplete', 'tel-national');
        const sanitize = () => {
          const cleaned = nationalNumber(input.value);
          if (input.value !== cleaned) input.value = cleaned;
          state.phone = cleaned;
          root.querySelectorAll('[name="phone"], [data-mb-phone-mirror]').forEach((el) => {
            if (el !== input) el.value = cleaned;
          });
        };
        input.addEventListener('input', sanitize);
        input.addEventListener('blur', sanitize);
        input.addEventListener('keypress', (e) => {
          if (e.key && e.key.length === 1 && !/[0-9]/.test(e.key)) e.preventDefault();
        });
        input.addEventListener('paste', (e) => {
          e.preventDefault();
          const text = (e.clipboardData || window.clipboardData).getData('text');
          input.value = nationalNumber(text);
          state.phone = input.value;
        });
      }
    });
  }

  root.addEventListener('click', (e) => {
    const countryBtn = e.target.closest('[data-mb-set-country]');
    if (countryBtn) {
      e.preventDefault();
      setCountry(countryBtn.getAttribute('data-mb-set-country'));
      return;
    }
    if (!e.target.closest('[data-mb-phone-wrap], [data-mb-country-list]')) closeCountryLists();

    const t = e.target.closest(
      '[data-mb-action], [data-mb-goto], [data-mb-select], [data-day], [data-mb-cal-nav], [data-mb-trucks-delta]',
    );
    if (!t) return;

    if (t.hasAttribute('data-mb-cal-nav')) {
      view.setMonth(view.getMonth() + Number(t.getAttribute('data-mb-cal-nav')));
      paintCalendar();
      return;
    }

    if (t.hasAttribute('data-day')) {
      state.moveDate = new Date(view.getFullYear(), view.getMonth(), Number(t.getAttribute('data-day')));
      const cal = root.querySelector('.mb-calendar');
      if (cal) cal.classList.remove('is-invalid');
      clearFieldErrors(root.querySelector('[data-mb-panel="4"]'));
      paintCalendar();
      renderSummary();
      return;
    }

    if (t.hasAttribute('data-mb-trucks-delta')) {
      const trucksInput = root.querySelector('[data-mb-trucks-input]');
      const current = Math.max(1, Number(trucksInput && trucksInput.value) || state.trucks || 1);
      const n = Math.max(1, Math.min(10, current + Number(t.getAttribute('data-mb-trucks-delta'))));
      state.trucks = n;
      if (trucksInput) trucksInput.value = String(n);
      renderSummary();
      return;
    }

    if (t.hasAttribute('data-mb-goto')) {
      showStep(Number(t.getAttribute('data-mb-goto')));
      return;
    }

    if (t.hasAttribute('data-mb-select')) {
      const group = t.getAttribute('data-mb-select');
      const value = t.getAttribute('data-value');
      root.querySelectorAll(`[data-mb-select="${group}"]`).forEach((el) => el.classList.remove('is-selected'));
      t.classList.add('is-selected');
      if (group === 'property') state.property = value;
      if (group === 'bedrooms') state.bedrooms = value;
      if (group === 'furnished') state.furnished = value;
      if (group === 'trucks') state.trucks = Number(value);
      renderSummary();
      return;
    }

    const action = t.getAttribute('data-mb-action');
    if (action === 'next') {
      if (state.step === 1 && !readStep1()) return;
      if (state.step === 2 && !readStep2()) return;
      if (state.step === 3 && !readStep3()) return;
      if (state.step === 4 && !readStep4()) return;
      const next = Math.min(5, state.step + 1);
      showStep(next);
      if (next === 4) paintCalendar();
      return;
    }
    if (action === 'back') {
      showStep(Math.max(1, state.step - 1));
      return;
    }
    if (action === 'submit') {
      submitQuote();
    }
  });

  const calLabel = root.querySelector('[data-mb-cal-label]');
  const calGrid = root.querySelector('[data-mb-cal-grid]');
  let view = new Date();
  view.setDate(1);

  function paintCalendar() {
    if (!calGrid || !calLabel) return;
    const y = view.getFullYear();
    const m = view.getMonth();
    calLabel.textContent = view.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    const firstDow = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let html = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
      .map((d) => `<div class="mb-calendar__dow">${d}</div>`)
      .join('');
    for (let i = 0; i < firstDow; i++) html += '<div></div>';
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(y, m, d);
      const disabled = date < today;
      const selected =
        state.moveDate &&
        state.moveDate.getFullYear() === y &&
        state.moveDate.getMonth() === m &&
        state.moveDate.getDate() === d;
      html += `<button type="button" class="mb-calendar__day${selected ? ' is-selected' : ''}" data-day="${d}" ${
        disabled ? 'disabled' : ''
      }>${d}</button>`;
    }
    calGrid.innerHTML = html;
  }

  async function submitQuote() {
    if (!readStep5()) return;
    const btn = root.querySelector('[data-mb-action="submit"]');
    const original = btn ? btn.textContent : '';
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Sending…';
    }
    const status = root.querySelector('[data-mb-submit-status]');
    if (status) {
      status.hidden = false;
      status.textContent = 'Sending your quote request…';
    }

    const message = [
      'Movey booking quote request',
      `Phone: ${fullPhone()}`,
      `From: ${state.from}`,
      `To: ${state.to}`,
      `Property: ${state.property}`,
      `Bedrooms: ${state.bedrooms}`,
      `Furnished: ${state.furnished}`,
      `Trucks: ${state.trucks}`,
      `Move date: ${fmtDate(state.moveDate)}`,
      `Preferred contact: ${state.contactMethod}`,
    ].join('\n');

    try {
      const res = await fetch('/api/contact/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          firstName: state.firstName,
          lastName: state.lastName,
          name: `${state.firstName} ${state.lastName}`.trim(),
          email: state.email,
          phone: fullPhone(),
          message,
          formName: 'Movey Booking Quote',
          formSource: 'booking-wizard',
          pageUrl: window.location.href,
          location: `${state.from} → ${state.to}`,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(data.message || 'Could not submit quote');
      }
      if (mainEl) mainEl.hidden = true;
      if (successEl) successEl.hidden = false;
      const stepsNav = root.querySelector('.mb-steps');
      if (stepsNav) stepsNav.hidden = true;
      if (successEl && typeof successEl.scrollIntoView === 'function') {
        successEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    } catch (err) {
      if (status) {
        status.hidden = false;
        status.textContent = err.message || 'Submission failed. Please try again.';
      }
      if (errorEl) errorEl.textContent = err.message || 'Submission failed. Please try again.';
      if (btn) {
        btn.disabled = false;
        btn.textContent = original || 'Get Quotation ↓';
      }
    }
  }

  initPhoneWidgets();
  setCountry(detectCountry());
  fetch('/api/geo/country')
    .then((r) => r.json())
    .then((data) => {
      const iso = String(data && data.country ? data.country : '').toLowerCase();
      if (iso && COUNTRIES.some((c) => c.iso === iso)) setCountry(iso);
    })
    .catch(() => {});
  paintCalendar();
  showStep(1, { scroll: false });
})();
