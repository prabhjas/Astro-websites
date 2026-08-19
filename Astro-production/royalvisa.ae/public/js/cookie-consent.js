(function () {
  var KEY = 'rv_cookie_consent';
  if (localStorage.getItem(KEY) === '1') return;

  var style = document.createElement('style');
  style.textContent =
    '#rv-cookie-banner{position:fixed;left:0;right:0;bottom:0;z-index:99999;background:#1a1a1a;color:#fff;padding:16px 20px;display:flex;gap:16px;align-items:center;justify-content:space-between;flex-wrap:wrap;font:14px/1.4 Inter,Arial,sans-serif;box-shadow:0 -4px 24px rgba(0,0,0,.25)}' +
    '#rv-cookie-banner p{margin:0;max-width:900px}#rv-cookie-banner a{color:#f2ae38}' +
    '#rv-cookie-banner button{background:#f2ae38;color:#1a1a1a;border:0;border-radius:999px;padding:10px 18px;font-weight:600;cursor:pointer}';
  document.head.appendChild(style);

  var bar = document.createElement('div');
  bar.id = 'rv-cookie-banner';
  bar.setAttribute('role', 'dialog');
  bar.setAttribute('aria-label', 'Cookie consent');
  bar.innerHTML =
    '<p>We use cookies to improve your experience and measure site performance. By continuing, you agree to our use of cookies. <a href="/contact-us/">Contact us</a> for details.</p>' +
    '<button type="button" id="rv-cookie-accept">Accept</button>';
  document.body.appendChild(bar);

  document.getElementById('rv-cookie-accept').addEventListener('click', function () {
    localStorage.setItem(KEY, '1');
    bar.remove();
  });
})();
