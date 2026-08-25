/**
 * Movey booking wizard — steps 1–5 + success.
 */
(function () {
  const root = document.getElementById('movey-booking');
  if (!root) return;

  const state = {
    step: 1,
    phone: '',
    from: '',
    to: '',
    property: 'Apartment',
    bedrooms: '2',
    furnished: 'Lightly (A few items)',
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

  function fmtDate(d) {
    if (!d) return '';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function renderSummary() {
    if (!summaryEl) return;
    const s1 =
      state.phone || state.from || state.to
        ? `<p>📞 ${state.phone || '—'}</p>
           <p>📍 From: ${state.from || '—'}</p>
           <p>📍 To: ${state.to || '—'}</p>`
        : '<p class="mb-muted">Not set yet</p>';
    const s2 =
      state.step > 1
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
        ${state.step > 2 ? '<button type="button" class="mb-summary__edit" data-mb-goto="2">Edit</button>' : '<span></span>'}
      </li>
      <li class="mb-summary__item">
        <span class="mb-summary__num">3</span>
        <div>
          <h3>Your Moving Date</h3>
          ${s3 || '<p>Your Moving Date</p>'}
        </div>
        ${state.step > 3 ? '<button type="button" class="mb-summary__edit" data-mb-goto="3">Edit</button>' : '<span></span>'}
      </li>
      <li class="mb-summary__item">
        <span class="mb-summary__num">4</span>
        <div><h3>Your quote</h3></div>
        <span></span>
      </li>`;
  }

  /** Map wizard panel (1–5) → progress bar index (1–4) */
  function progressForPanel(n) {
    if (n <= 1) return 1;
    if (n <= 3) return 2; // property + trucks = Required space
    if (n === 4) return 3; // date
    return 4; // quote form
  }

  function showStep(n) {
    state.step = n;
    panels.forEach((p) => {
      p.hidden = Number(p.getAttribute('data-mb-panel')) !== n;
    });
    const progress = progressForPanel(n);
    stepItems.forEach((el) => {
      const i = Number(el.getAttribute('data-mb-step'));
      el.classList.toggle('is-active', i === progress);
      el.classList.toggle('is-done', i < progress);
      const num = el.querySelector('.mb-steps__num');
      if (num) num.textContent = i < progress ? '✓' : String(i);
    });
    renderSummary();
    if (errorEl) errorEl.textContent = '';
    const embed = root.classList.contains('movey-booking--embed');
    if (embed) {
      root.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function readStep1() {
    state.phone = (root.querySelector('[name="phone"]')?.value || '').trim();
    state.from = (root.querySelector('[name="from"]')?.value || '').trim();
    state.to = (root.querySelector('[name="to"]')?.value || '').trim();
    if (!state.phone || !state.from || !state.to) {
      if (errorEl) errorEl.textContent = 'Please enter phone number and both addresses.';
      return false;
    }
    return true;
  }

  function readStep5() {
    state.firstName = (root.querySelector('[name="firstName"]')?.value || '').trim();
    state.lastName = (root.querySelector('[name="lastName"]')?.value || '').trim();
    state.email = (root.querySelector('[name="email"]')?.value || '').trim();
    const method = root.querySelector('[name="contactMethod"]:checked');
    state.contactMethod = method ? method.value : 'Phone';
    if (!state.firstName || !state.lastName || !state.email) {
      if (errorEl) errorEl.textContent = 'Please complete your name and email.';
      return false;
    }
    return true;
  }

  /* Calendar */
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

  root.addEventListener('click', (e) => {
    const t = e.target.closest('[data-mb-action], [data-mb-goto], [data-mb-select], [data-day], [data-mb-cal-nav]');
    if (!t) return;

    if (t.hasAttribute('data-mb-cal-nav')) {
      view.setMonth(view.getMonth() + Number(t.getAttribute('data-mb-cal-nav')));
      paintCalendar();
      return;
    }

    if (t.hasAttribute('data-day')) {
      state.moveDate = new Date(view.getFullYear(), view.getMonth(), Number(t.getAttribute('data-day')));
      paintCalendar();
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
      if (state.step === 3) {
        const trucksInput = root.querySelector('[data-mb-trucks-input]');
        const n = Math.max(1, Math.min(10, Number(trucksInput && trucksInput.value) || state.trucks || 1));
        state.trucks = n;
        if (trucksInput) trucksInput.value = String(n);
      }
      if (state.step === 4 && !state.moveDate) {
        if (errorEl) errorEl.textContent = 'Please select a moving date.';
        return;
      }
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

  async function submitQuote() {
    if (!readStep5()) return;
    if (errorEl) errorEl.textContent = '';
    const btn = root.querySelector('[data-mb-action="submit"]');
    if (btn) btn.disabled = true;

    const message = [
      'Movey booking quote request',
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
          phone: state.phone.startsWith('+') ? state.phone : `+971${state.phone.replace(/^0+/, '')}`,
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
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      if (errorEl) errorEl.textContent = err.message || 'Submission failed. Please try again.';
      if (btn) btn.disabled = false;
    }
  }

  paintCalendar();
  showStep(1);
})();
