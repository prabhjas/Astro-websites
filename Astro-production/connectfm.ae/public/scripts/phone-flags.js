/**
 * CF7 country-phone flags + dial-code (IP-based).
 * Init once per input; skip hidden fields; no double wrappers.
 */
(() => {
  if (window.__EOR_PHONE_FLAGS_BOOTED__) return;
  window.__EOR_PHONE_FLAGS_BOOTED__ = true;

  const FLAG_PNG = "/js/phone-flags/flags.png";
  const FLAG_PNG_2X = "/js/phone-flags/flags@2x.png";
  const PLUGIN = "/wp-content/plugins/country-phone-field-contact-form-7/assets";
  const ITI_JS = `${PLUGIN}/js/intlTelInput.min.js`;
  const UTILS_JS = `${PLUGIN}/js/utils.js`;

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

  function waitFor(fn, maxMs) {
    return new Promise((resolve) => {
      const start = Date.now();
      (function tick() {
        if (fn()) {
          resolve(true);
          return;
        }
        if (Date.now() - start > (maxMs || 5000)) {
          resolve(false);
          return;
        }
        setTimeout(tick, 50);
      })();
    });
  }

  function isVisible(el) {
    if (!(el instanceof HTMLElement)) return false;
    if (el.closest("#transaction_hide, .gclid_tag, [style*='display:none'], [style*='display: none']")) {
      return false;
    }
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;
    return true;
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
        if (/^[a-z]{2}$/.test(code) && code !== "xx") return code;
      }
    } catch {
      /* fall through */
    }
    for (const url of ["https://ipwho.is/", "https://get.geojs.io/v1/ip/country.json"]) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = await res.json();
        const code = String(data.country_code || data.country || "")
          .trim()
          .toLowerCase();
        if (/^[a-z]{2}$/.test(code) && code !== "xx") return code;
      } catch {
        /* try next */
      }
    }
    return fallback;
  }

  async function init() {
    const phones = [...document.querySelectorAll("input.wpcf7-phonetext, input[name^='phonetext-']")].filter(
      (el) => isVisible(el) && !el.closest(".intl-tel-input"),
    );
    if (!phones.length) return;

    injectFlagSpriteCss();
    await ensureScript(ITI_JS);
    await ensureScript(UTILS_JS);
    const ready = await waitFor(
      () => window.jQuery && typeof window.jQuery.fn.intlTelInput === "function",
      5000,
    );
    if (!ready || !window.jQuery) return;
    const $ = window.jQuery;

    const geoPromise = detectCountryFromIp().then((code) => {
      window.__SP_PHONE_COUNTRY__ = code;
      return code;
    });

    phones.forEach((el) => {
      const $el = $(el);
      if ($el.data("plugin_intlTelInput") || $el.data("intlTelInput") || el.dataset.eorIti === "1") {
        return;
      }
      el.dataset.eorIti = "1";
      try {
        $el.intlTelInput({
          initialCountry: "auto",
          geoIpLookup: (callback) => {
            geoPromise.then((code) => callback(code));
          },
          preferredCountries: ["ae", "sa", "qa", "kw", "bh", "om", "eg", "pk", "in", "gb", "us"],
          separateDialCode: true,
          autoPlaceholder: "polite",
          nationalMode: true,
          utilsScript: UTILS_JS,
        });
      } catch {
        /* ignore */
      }
    });

    const geoCountry = await geoPromise;
    phones.forEach((el) => {
      try {
        const $el = $(el);
        if ($el.data("plugin_intlTelInput") || $el.data("intlTelInput")) {
          $el.intlTelInput("setCountry", geoCountry);
        }
      } catch {
        /* ignore */
      }
    });

    function syncDialPadding(input) {
      const wrap = input.closest(".intl-tel-input");
      if (!wrap) return;
      const flag = wrap.querySelector(".selected-flag, .flag-container");
      if (!flag) return;
      const w = Math.ceil(flag.getBoundingClientRect().width || 0);
      if (w > 0) {
        input.style.setProperty("padding-left", w + 16 + "px", "important");
      }
    }

    phones.forEach((el) => {
      syncDialPadding(el);
      try {
        const $el = $(el);
        $el.on("countrychange", () => syncDialPadding(el));
      } catch {
        /* ignore */
      }
    });
    // Layout settles after fonts/flags
    setTimeout(() => phones.forEach(syncDialPadding), 100);
    setTimeout(() => phones.forEach(syncDialPadding), 500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
