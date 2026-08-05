/**
 * CF7 country-phone flags + dial-code (IP-based).
 * intlTelInput must be on jQuery.fn (loaded before Elementor AMD in ElementorScripts).
 */
(() => {
  if (window.__EOR_PHONE_FLAGS_BOOTED__) return;
  window.__EOR_PHONE_FLAGS_BOOTED__ = true;

  const FLAG_PNG = "/js/phone-flags/flags.png";
  const FLAG_PNG_2X = "/js/phone-flags/flags@2x.png";
  const PLUGIN = "/wp-content/plugins/country-phone-field-contact-form-7/assets";
  const ITI_JS = `${PLUGIN}/js/intlTelInput.min.js`;
  const UTILS_JS = `${PLUGIN}/js/utils.js`;
  const ITI_CSS = `${PLUGIN}/css/intlTelInput.min.css`;

  let initializing = false;

  function injectFlagSpriteCss() {
    if (document.getElementById("sp-phone-flag-css")) return;
    const style = document.createElement("style");
    style.id = "sp-phone-flag-css";
    style.textContent =
      '.iti-flag,.country-select .flag,.intl-tel-input .iti-flag{background-image:url("' +
      FLAG_PNG +
      '")!important;background-repeat:no-repeat!important;}' +
      ".intl-tel-input{width:100%!important;position:relative!important;display:block!important;}" +
      ".intl-tel-input input{margin-bottom:0!important;margin-top:0!important;}" +
      ".intl-tel-input .flag-container{right:auto!important;left:1px!important;top:1px!important;bottom:1px!important;padding:0!important;z-index:3!important;}" +
      ".intl-tel-input.separate-dial-code .selected-flag{display:flex!important;align-items:center!important;height:100%!important;min-height:0!important;padding:0 10px 0 12px!important;background:#f3f7fa!important;border-radius:14px 0 0 14px!important;}" +
      ".intl-tel-input .selected-flag .iti-flag,.intl-tel-input .selected-flag .iti-arrow{position:static!important;margin:0!important;}" +
      ".intl-tel-input .selected-flag .iti-arrow{margin-left:4px!important;}" +
      ".intl-tel-input .iti-flag{width:20px;height:15px;display:inline-block!important;box-shadow:0 0 1px 0 #888;}" +
      ".intl-tel-input.separate-dial-code input{padding-left:110px!important;}" +
      "@media only screen and (-webkit-min-device-pixel-ratio:2)," +
      "only screen and (min-resolution:192dpi)," +
      "only screen and (min-resolution:2dppx){" +
      '.iti-flag,.country-select .flag,.intl-tel-input .iti-flag{background-image:url("' +
      FLAG_PNG_2X +
      '")!important;background-size:5630px 15px!important;}' +
      "}";
    document.head.appendChild(style);
  }

  function ensureCss(href) {
    if (document.querySelector('link[href*="intlTelInput"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }

  /** Load script without AMD (Elementor webpack defines define.amd and steals the plugin). */
  function ensureScript(src) {
    return new Promise((resolve) => {
      const file = src.split("/").pop();
      if (document.querySelector('script[src*="' + file + '"]')) {
        resolve();
        return;
      }
      const prevDefine = window.define;
      try {
        if (prevDefine && prevDefine.amd) window.define = undefined;
      } catch {
        /* ignore */
      }
      const s = document.createElement("script");
      s.src = src;
      s.onload = () => {
        try {
          if (prevDefine) window.define = prevDefine;
        } catch {
          /* ignore */
        }
        resolve();
      };
      s.onerror = () => {
        try {
          if (prevDefine) window.define = prevDefine;
        } catch {
          /* ignore */
        }
        resolve();
      };
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
        if (Date.now() - start > (maxMs || 8000)) {
          resolve(false);
          return;
        }
        setTimeout(tick, 40);
      })();
    });
  }

  function shouldSkip(el) {
    if (!(el instanceof HTMLElement)) return true;
    if (el.type === "hidden") return true;
    if (el.closest("#transaction_hide, .gclid_tag")) return true;
    if (el.closest(".intl-tel-input")) return true;
    if (el.dataset.eorIti === "1") return true;
    return false;
  }

  async function detectCountryFromIp() {
    const fallback = "es";
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

  function syncDialPadding(input) {
    const wrap = input.closest(".intl-tel-input");
    if (!wrap) return;
    const flag = wrap.querySelector(".selected-flag");
    if (!flag) return;
    const w = Math.ceil(flag.getBoundingClientRect().width || 0);
    input.style.setProperty("padding-left", (w > 0 ? w + 16 : 110) + "px", "important");
  }

  let geoPromise = null;
  function getGeo() {
    if (!geoPromise) {
      geoPromise = detectCountryFromIp().then((code) => {
        window.__SP_PHONE_COUNTRY__ = code;
        return code;
      });
    }
    return geoPromise;
  }

  async function initPhones() {
    if (initializing) return false;
    const phones = [
      ...document.querySelectorAll(
        "input.wpcf7-phonetext, input[name^='phonetext-'], input[name='your-phone'], input[name='phone']",
      ),
    ].filter((el) => !shouldSkip(el));
    if (!phones.length) return false;

    initializing = true;
    try {
      ensureCss(ITI_CSS);
      injectFlagSpriteCss();

      let ready =
        window.jQuery && typeof window.jQuery.fn.intlTelInput === "function";
      if (!ready) {
        await ensureScript(ITI_JS);
        await ensureScript(UTILS_JS);
        ready = await waitFor(
          () => window.jQuery && typeof window.jQuery.fn.intlTelInput === "function",
          8000,
        );
      }
      if (!ready || !window.jQuery) return false;

      const $ = window.jQuery;
      const country = await getGeo();

      phones.forEach((el) => {
        if (shouldSkip(el)) return;
        const $el = $(el);
        if ($el.data("plugin_intlTelInput") || $el.data("intlTelInput")) {
          el.dataset.eorIti = "1";
          return;
        }
        el.dataset.eorIti = "1";
        try {
          $el.intlTelInput({
            initialCountry: country || "es",
            preferredCountries: ["pk", "es", "pt", "de", "gb", "us", "in", "ae", "fr", "it"],
            separateDialCode: true,
            autoPlaceholder: "polite",
            nationalMode: true,
            utilsScript: UTILS_JS,
          });
        } catch (err) {
          el.dataset.eorIti = "0";
          console.warn("phone-flags init failed", err);
        }
      });

      phones.forEach((el) => {
        try {
          const $el = $(el);
          if ($el.data("plugin_intlTelInput") || $el.data("intlTelInput")) {
            $el.intlTelInput("setCountry", country);
            $el.off("countrychange.eorPad").on("countrychange.eorPad", () => syncDialPadding(el));
          }
        } catch {
          /* ignore */
        }
        syncDialPadding(el);
      });
      setTimeout(() => phones.forEach(syncDialPadding), 100);
      setTimeout(() => phones.forEach(syncDialPadding), 500);
      return true;
    } finally {
      initializing = false;
    }
  }

  function schedule() {
    initPhones();
    setTimeout(initPhones, 300);
    setTimeout(initPhones, 1000);
    setTimeout(initPhones, 2500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", schedule);
  } else {
    schedule();
  }
  window.addEventListener("load", () => setTimeout(initPhones, 400));

  try {
    const mo = new MutationObserver(() => {
      clearTimeout(window.__EOR_PHONE_MO_T__);
      window.__EOR_PHONE_MO_T__ = setTimeout(initPhones, 200);
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  } catch {
    /* ignore */
  }

  // Load single-post sticky form helper (fleet may serve a stale Astro script bundle)
  if (
    !window.__IBERIA_STICKY_BOOTED__ &&
    document.querySelector(
      ".single-post .elementor-element-5e2cc20, .elementor-234 .elementor-element-5e2cc20",
    )
  ) {
    window.__IBERIA_STICKY_BOOTED__ = true;
    const s = document.createElement("script");
    s.src = "/scripts/elementor-sticky-columns.js";
    document.head.appendChild(s);
  }
})();
