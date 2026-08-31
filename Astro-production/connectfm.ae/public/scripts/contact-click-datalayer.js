/**
 * Push contact-method clicks to dataLayer for GTM / Google Ads
 * (phone, email, WhatsApp) — mirrors Just-Links style tracking.
 */
(function () {
  if (typeof window === 'undefined' || window.__connectfmContactClickBound) return;
  window.__connectfmContactClickBound = true;

  function pushEvent(eventName, detail) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: eventName,
      event_category: 'contact',
      event_label: detail.label,
      contact_method: detail.method,
      link_url: detail.url || '',
    });
  }

  function classify(href) {
    const url = String(href || '').trim();
    if (!url) return null;
    const lower = url.toLowerCase();
    if (lower.startsWith('tel:')) {
      return { event: 'phone_click', method: 'phone', label: 'Phone Click' };
    }
    if (lower.startsWith('mailto:')) {
      return { event: 'email_click', method: 'email', label: 'Email Click' };
    }
    if (
      lower.includes('wa.me/') ||
      lower.includes('api.whatsapp.com/') ||
      lower.includes('whatsapp.com/send')
    ) {
      return { event: 'whatsapp_click', method: 'whatsapp', label: 'WhatsApp Click' };
    }
    return null;
  }

  function onClick(event) {
    const anchor = event.target && event.target.closest ? event.target.closest('a[href]') : null;
    if (!anchor) return;
    const href = anchor.getAttribute('href') || '';
    let kind = classify(href);
    if (!kind) {
      if (anchor.classList.contains('whatsapp')) {
        kind = { event: 'whatsapp_click', method: 'whatsapp', label: 'WhatsApp Click' };
      } else if (anchor.classList.contains('phone')) {
        kind = { event: 'phone_click', method: 'phone', label: 'Phone Click' };
      }
    }
    if (!kind) return;
    pushEvent(kind.event, { label: kind.label, method: kind.method, url: href });
  }

  document.addEventListener('click', onClick, true);
})();
