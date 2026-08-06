/**
 * Restore CF7 country-phone flags + dial-code dropdown.
 * Country resolved from visitor IP via /api/geo/.
 */
(() => {
  const FLAG_PNG =
    "/wp-content/plugins/country-phone-field-contact-form-7/assets/img/flags.png";
  const FLAG_PNG_2X =
    "/wp-content/plugins/country-phone-field-contact-form-7/assets/img/flags@2x.png";
  const ITI_JS =
    "/wp-content/plugins/country-phone-field-contact-form-7/assets/js/intlTelInput.min.js";
  const UTILS_JS =
    "/wp-content/plugins/country-phone-field-contact-form-7/assets/js/utils.js";

  function injectFlagSpriteCss() {
    if (document.getElementById("cr-phone-flag-css")) return;
    const style = document.createElement("style");
    style.id = "cr-phone-flag-css";
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
    await ensureScript(ITI_JS);
    await ensureScript(UTILS_JS);
    const ready = await waitForIntlTel(5000);
    if (!ready || !window.jQuery) return;

    const $ = window.jQuery;

    phones.forEach((el) => {
      const $el = $(el);
      if ($el.data("plugin_intlTelInput") || $el.data("intlTelInput")) return;
      try {
        $el.intlTelInput({
          initialCountry: "auto",
          geoIpLookup: (callback) => {
            detectCountryFromIp().then((code) => {
              window.__CR_PHONE_COUNTRY__ = code;
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
    window.__CR_PHONE_COUNTRY__ = geoCountry;
    phones.forEach((el) => applyCountry($(el), geoCountry));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  // Late CF7 duplicates (desktop/mobile forms)
  setTimeout(init, 600);
  setTimeout(init, 1500);
})();
