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
    document.querySelectorAll('a[href*="/cdn-cgi/l/email-protection"]').forEach(function (a) {
      var href = a.getAttribute("href") || "";
      var m = href.match(/#([0-9a-f]+)/i);
      var mail = "";
      if (m) {
        mail = decode(m[1]);
      } else {
        var span = a.querySelector("[data-cfemail]");
        if (span) mail = decode(span.getAttribute("data-cfemail") || "");
      }
      if (!mail) return;
      a.href = "mailto:" + mail;
      if (!a.textContent || /\[email|protected\]/i.test(a.textContent)) {
        var textEl = a.querySelector(".__cf_email__, [data-cfemail]") || a;
        if (textEl !== a) textEl.textContent = mail;
        else if (/\[email|protected\]/i.test(a.textContent)) a.textContent = mail;
      }
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();
