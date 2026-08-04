/**
 * Restore CF7 country-phone flags + dial-code dropdown on mirrored pages.
 * Country is resolved from visitor IP via /api/geo/ (same-origin).
 */
(() => {
  const FLAG_PNG = "/js/phone-flags/flags.png";
  const FLAG_PNG_2X = "/js/phone-flags/flags@2x.png";
  const ITI_JS =
    "/wp-content/plugins/country-phone-field-contact-form-7/assets/js/intlTelInput.min.js";
  const UTILS_JS =
    "/wp-content/plugins/country-phone-field-contact-form-7/assets/js/utils.js";

  function injectFlagSpriteCss() {
    if (document.getElementById("sp-phone-flag-css")) return;
    const style = document.createElement("style");
    style.id = "sp-phone-flag-css";
    style.textContent =
      '.iti-flag,.country-select .flag,.intl-tel-input .iti-flag{background-image:url("' +
      FLAG_PNG +
      '")!important;background-repeat:no-repeat!important;}' +
      ".intl-tel-input .iti-flag{height:15px;box-shadow:0 0 1px 0 #888;}" +
      "@media only screen and (-webkit-min-device-pixel-ratio:2)," +
      "only screen and (min-resolution:192dpi)," +
      "only screen and (min-resolution:2dppx){" +
      '.iti-flag,.country-select .flag,.intl-tel-input .iti-flag{background-image:url("' +
      FLAG_PNG_2X +
      '")!important;background-size:5630px 15px!important;}' +
      "}";
    document.head.appendChild(style);
  }

  function ensureScript(src) {
    return new Promise((resolve) => {
      if (document.querySelector('script[src*="' + src.split("/").pop() + '"]')) {
        resolve();
        return;
      }
      const s = document.createElement("script");
      s.src = src;
      s.onload = () => resolve();
      s.onerror = () => resolve();
      document.head.appendChild(s);
    });
  }

  function waitForIntlTel(maxMs) {
    return new Promise((resolve) => {
      const start = Date.now();
      (function tick() {
        if (window.jQuery && typeof window.jQuery.fn.intlTelInput === "function") {
          resolve(true);
          return;
        }
        if (Date.now() - start > (maxMs || 4000)) {
          resolve(false);
          return;
        }
        setTimeout(tick, 50);
      })();
    });
  }

  async function detectCountryFromIp() {
    const fallback = "ae";
    try {
      const res = await fetch("/api/geo/", {
        headers: { Accept: "application/json" },
        credentials: "same-origin",
      });
      if (res.ok) {
        const data = await res.json();
        const code = String(data.country || "")
          .trim()
          .toLowerCase();
        if (/^[a-z]{2}$/.test(code)) return code;
      }
    } catch {
      /* fall through */
    }

    // Browser fallbacks if API unavailable
    for (const url of ["https://ipwho.is/", "https://ipinfo.io/json"]) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = await res.json();
        const code = String(data.country_code || data.country || "")
          .trim()
          .toLowerCase();
        if (/^[a-z]{2}$/.test(code)) return code;
      } catch {
        /* try next */
      }
    }
    return fallback;
  }

  function applyCountry($el, country) {
    try {
      if ($el.data("plugin_intlTelInput") || $el.data("intlTelInput")) {
        $el.intlTelInput("setCountry", country);
      }
    } catch {
      /* ignore */
    }
  }

  async function init() {
    const phones = document.querySelectorAll(
      "input.wpcf7-phonetext, input.wpcf7-form-control.wpcf7-phonetext, .wpcf7 input[type='tel']",
    );
    if (!phones.length) return;

    injectFlagSpriteCss();

    // intlTelInput is a jQuery plugin — wait for jQuery first
    const jqReady = await new Promise((resolve) => {
      const start = Date.now();
      (function tick() {
        if (window.jQuery) return resolve(true);
        if (Date.now() - start > 5000) return resolve(false);
        setTimeout(tick, 40);
      })();
    });
    if (!jqReady) return;

    await ensureScript(ITI_JS);
    await ensureScript(UTILS_JS);
    const ready = await waitForIntlTel(5000);
    if (!ready || !window.jQuery) return;

    const $ = window.jQuery;

    // Init immediately with auto + async geo callback, then refine via /api/geo/
    phones.forEach((el) => {
      const $el = $(el);
      if ($el.data("plugin_intlTelInput") || $el.data("intlTelInput")) return;
      try {
        $el.intlTelInput({
          initialCountry: "auto",
          geoIpLookup: (callback) => {
            detectCountryFromIp().then((code) => {
              window.__SP_PHONE_COUNTRY__ = code;
              callback(code);
            });
          },
          preferredCountries: ["ae", "pk", "sa", "in", "gb", "us"],
          separateDialCode: true,
          autoPlaceholder: "polite",
          utilsScript: UTILS_JS,
        });
      } catch {
        /* ignore */
      }
    });

    const geoCountry = await detectCountryFromIp();
    window.__SP_PHONE_COUNTRY__ = geoCountry;
    phones.forEach((el) => applyCountry($(el), geoCountry));
  }

  function boot() {
    init();
    // CF7 / Elementor may inject forms late (popups)
    [400, 1200, 3000].forEach((ms) => setTimeout(init, ms));
    window.addEventListener("chr:popup-opened", () => setTimeout(init, 50));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
