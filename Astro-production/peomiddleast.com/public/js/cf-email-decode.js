/* Cloudflare email-decode shim for local/static mirrors */
(function () {
  function decode(encoded) {
    var r = parseInt(encoded.substr(0, 2), 16);
    var out = "";
    for (var n = 2; n < encoded.length; n += 2) {
      out += String.fromCharCode(parseInt(encoded.substr(n, 2), 16) ^ r);
    }
    return out;
  }
  function run() {
    document.querySelectorAll("a.__cf_email__, .__cf_email__, [data-cfemail]").forEach(function (el) {
      var enc = el.getAttribute("data-cfemail");
      if (!enc) return;
      var mail = decode(enc);
      if (el.tagName === "A") {
        el.href = "mailto:" + mail;
        if (!el.textContent || /\[email|protected\]/i.test(el.textContent)) el.textContent = mail;
      } else {
        el.textContent = mail;
      }
    });
    // Also rewrite /cdn-cgi/l/email-protection#HEX links
    document.querySelectorAll('a[href*="/cdn-cgi/l/email-protection"]').forEach(function (a) {
      var href = a.getAttribute("href") || "";
      var m = href.match(/#([0-9a-f]+)/i);
      if (!m) return;
      var mail = decode(m[1]);
      a.href = "mailto:" + mail;
      if (!a.textContent || /\[email|protected\]/i.test(a.textContent)) a.textContent = mail;
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();
