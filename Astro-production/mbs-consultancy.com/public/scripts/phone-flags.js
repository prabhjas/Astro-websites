/**
 * CF7 country-phone flags + dial code (geo via /api/geo/).
 */
(() => {
  const FLAG_PNG =
    "/wp-content/plugins/country-phone-field-contact-form-7/assets/img/flags.png";
  const FLAG_PNG_2X =
    "/wp-content/plugins/country-phone-field-contact-form-7/assets/img/flags@2x.png";
  const UTILS_JS =
    "/wp-content/plugins/country-phone-field-contact-form-7/assets/js/utils.js";

  function injectFlagSpriteCss() {
    if (document.getElementById("mbs-phone-flag-css")) return;
    const style = document.createElement("style");
    style.id = "mbs-phone-flag-css";
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
    return "ae";
  }

  function syncPhonePadding(input) {
    if (!input) return;
    const wrap = input.closest(".intl-tel-input, .iti");
    if (!wrap) return;
    const flag =
      wrap.querySelector(".selected-flag, .iti__selected-country, .iti__flag-container") ||
      wrap;
    const w = Math.ceil(flag.getBoundingClientRect().width) || 120;
    // Beat CSS !important floors so placeholder never sits under dial code (+971 etc.)
    input.style.setProperty("padding-left", Math.max(w + 16, 150) + "px", "important");
  }

  function rememberCountry(iso2) {
    const code = String(iso2 || "")
      .trim()
      .toLowerCase();
    if (!/^[a-z]{2}$/.test(code)) return;
    window.__MBS_PHONE_COUNTRY__ = code;
    window.__SP_PHONE_COUNTRY__ = code;
  }

  function getSelectedCountry($el) {
    try {
      const data = $el.intlTelInput("getSelectedCountryData");
      return data?.iso2 ? String(data.iso2).toLowerCase() : "";
    } catch {
      return "";
    }
  }

  function applyCountry($el, country) {
    try {
      if ($el.data("plugin_intlTelInput") || $el.data("intlTelInput")) {
        $el.intlTelInput("setCountry", country);
        rememberCountry(country);
        syncPhonePadding($el.get(0));
      }
    } catch {
      /* ignore */
    }
  }

  function initField($, $el, geoCountry) {
    const el = $el.get(0);
    if ($el.data("plugin_intlTelInput") || $el.data("intlTelInput")) {
      // Already inited — never force geo over the user's current selection
      const current = getSelectedCountry($el);
      if (current) rememberCountry(current);
      syncPhonePadding(el);
      return;
    }
    try {
      $el.intlTelInput({
        initialCountry: geoCountry,
        preferredCountries: ["in", "ae", "pk", "sa", "gb", "us"],
        separateDialCode: true,
        autoPlaceholder: "off",
        utilsScript: UTILS_JS,
      });
      rememberCountry(geoCountry);
      if (el) {
        el.addEventListener("countrychange", () => {
          rememberCountry(getSelectedCountry($el));
          syncPhonePadding(el);
        });
        // Layout may settle after fonts/flag sprite load
        syncPhonePadding(el);
        requestAnimationFrame(() => syncPhonePadding(el));
        setTimeout(() => syncPhonePadding(el), 50);
        setTimeout(() => syncPhonePadding(el), 300);
      }
    } catch {
      /* ignore */
    }
  }

  window.__MBS_SYNC_PHONE_PADDING__ = syncPhonePadding;
  window.__MBS_SET_PHONE_COUNTRY__ = function setPhoneCountry(input, iso2) {
    if (!input || !window.jQuery) return;
    const $el = window.jQuery(input);
    if (!($el.data("plugin_intlTelInput") || $el.data("intlTelInput"))) return;
    applyCountry($el, iso2 || window.__MBS_PHONE_COUNTRY__ || "ae");
  };

  async function init() {
    const phones = document.querySelectorAll(
      "input.wpcf7-phonetext, input.wpcf7-form-control.wpcf7-phonetext, .wpcf7 input[type='tel']",
    );
    if (!phones.length) return;

    injectFlagSpriteCss();
    const ready = await waitForIntlTel(5000);
    if (!ready || !window.jQuery) return;

    const $ = window.jQuery;
    const geoCountry = await detectCountryFromIp();
    if (!window.__MBS_PHONE_COUNTRY__) rememberCountry(geoCountry);

    phones.forEach((el) => initField($, $(el), window.__MBS_PHONE_COUNTRY__ || geoCountry));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  setTimeout(init, 600);
  setTimeout(init, 1500);
})();
