/**
 * Flag sprites + IP country for CF7 phone fields.
 * Does NOT call intlTelInput() for mount — only setCountry after WP plugin mounts.
 * Cleans orphan/duplicate flag chrome that sits on the message field.
 */
(() => {
  if (window.__TFG_PHONE_FLAGS_BOOTED__) return;
  window.__TFG_PHONE_FLAGS_BOOTED__ = true;

  const FLAG_PNG = "/js/phone-flags/flags.png";
  const FLAG_PNG_2X = "/js/phone-flags/flags@2x.png";
  const FALLBACK_COUNTRY = "ae";
  const PHONE_SEL =
    "input.wpcf7-phonetext:not([type='hidden']):not(.wpcf7-phonetext-country-code)";

  function injectFlagSpriteCss() {
    if (document.getElementById("tfg-phone-flag-css")) return;
    const style = document.createElement("style");
    style.id = "tfg-phone-flag-css";
    style.textContent =
      '.iti-flag,.intl-tel-input .iti-flag{background-image:url("' +
      FLAG_PNG +
      '")!important;background-repeat:no-repeat!important;}' +
      ".intl-tel-input .iti-flag{height:15px;box-shadow:0 0 1px 0 #888;}" +
      "@media only screen and (-webkit-min-device-pixel-ratio:2)," +
      "only screen and (min-resolution:192dpi)," +
      "only screen and (min-resolution:2dppx){" +
      '.iti-flag,.intl-tel-input .iti-flag{background-image:url("' +
      FLAG_PNG_2X +
      '")!important;background-size:5630px 15px!important;}' +
      "}";
    document.head.appendChild(style);
  }

  function parseCountry(payload) {
    if (!payload) return "";
    if (typeof payload === "string") {
      const t = payload.trim().toLowerCase();
      return /^[a-z]{2}$/.test(t) && t !== "xx" ? t : "";
    }
    let code = String(
      payload.country_code || payload.countryCode || payload.country || "",
    )
      .trim()
      .toLowerCase();
    if (code.length > 2 && payload.country_code) {
      code = String(payload.country_code).trim().toLowerCase();
    }
    return /^[a-z]{2}$/.test(code) && code !== "xx" ? code : "";
  }

  async function detectCountryFromIp() {
    if (window.__SP_PHONE_COUNTRY__ && /^[a-z]{2}$/.test(window.__SP_PHONE_COUNTRY__)) {
      return window.__SP_PHONE_COUNTRY__;
    }
    for (const url of ["/api/geo/", "/api/geo/country/", "https://ipwho.is/", "https://get.geojs.io/v1/ip/country.json"]) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(url, {
          headers: { Accept: "application/json, text/plain" },
          signal: controller.signal,
          credentials: url.startsWith("/") ? "same-origin" : "omit",
        });
        clearTimeout(timer);
        if (!res.ok) continue;
        const ct = res.headers.get("content-type") || "";
        const code =
          ct.includes("json") || url.includes("geojs") || url.includes("ipwho")
            ? parseCountry(await res.json())
            : parseCountry(await res.text());
        if (code) {
          window.__SP_PHONE_COUNTRY__ = code;
          return code;
        }
      } catch {
        /* next */
      }
    }
    window.__SP_PHONE_COUNTRY__ = FALLBACK_COUNTRY;
    return FALLBACK_COUNTRY;
  }

  function phoneInputs() {
    return Array.from(document.querySelectorAll(PHONE_SEL)).filter((el) => {
      if (!(el instanceof HTMLInputElement) || el.type === "hidden") return false;
      if (/country-code$/i.test(el.name || "")) return false;
      return true;
    });
  }

  /** Remove every flag widget that is not the single sibling of a phone input. */
  function scrubDuplicateFlags() {
    // Orphan flag-containers sitting as siblings of .intl-tel-input (overlay next field)
    document
      .querySelectorAll(".wpcf7-form-control-wrap > .flag-container")
      .forEach((n) => n.remove());

    // Second+ .intl-tel-input roots in the same wrap
    document.querySelectorAll(".wpcf7-form-control-wrap").forEach((wrap) => {
      const roots = Array.from(wrap.querySelectorAll(":scope > .intl-tel-input"));
      roots.slice(1).forEach((extra) => extra.remove());
    });

    // Nested intl wrappers
    document.querySelectorAll(".intl-tel-input .intl-tel-input").forEach((nested) => {
      const parent = nested.parentElement;
      if (!parent) return;
      while (nested.firstChild) parent.insertBefore(nested.firstChild, nested);
      nested.remove();
    });

    // Extra flag containers inside one iti root
    document.querySelectorAll(".intl-tel-input").forEach((iti) => {
      const flags = Array.from(iti.querySelectorAll(":scope > .flag-container"));
      flags.slice(1).forEach((fc) => fc.remove());
    });

    // Never allow flag chrome on message/name/email wraps
    document
      .querySelectorAll(
        '.wpcf7-form-control-wrap[data-name="client-message"] .flag-container,' +
          '.wpcf7-form-control-wrap[data-name="client-message"] .intl-tel-input,' +
          '.wpcf7-form-control-wrap[data-name="client-name"] .flag-container,' +
          '.wpcf7-form-control-wrap[data-name="client-email"] .flag-container',
      )
      .forEach((n) => {
        if (n.classList.contains("intl-tel-input")) {
          // unwrap if phone somehow mis-nested — should not happen
          n.remove();
        } else {
          n.remove();
        }
      });
  }

  function syncDial(input) {
    if (!window.jQuery) return;
    const $ = window.jQuery;
    const $el = $(input);
    try {
      const dial = $el
        .siblings(".flag-container")
        .find(".selected-flag .selected-dial-code")
        .text();
      const name = $el.attr("name");
      if (name) $('input[name="' + name + '-country-code"]').val(dial);
    } catch {
      /* ignore */
    }
    const wrap = input.closest(".intl-tel-input");
    const flag = wrap && wrap.querySelector(":scope > .flag-container");
    if (flag) {
      const w = Math.ceil(flag.getBoundingClientRect().width || 0);
      if (w > 0) input.style.setProperty("padding-left", w + 16 + "px", "important");
    }
  }

  function applyCountry(country) {
    if (!window.jQuery || typeof window.jQuery.fn.intlTelInput !== "function") return;
    const $ = window.jQuery;
    const code = (country || FALLBACK_COUNTRY).toLowerCase();
    scrubDuplicateFlags();

    phoneInputs().forEach((el) => {
      const $el = $(el);
      try {
        if ($el.data("plugin_intlTelInput") || $el.data("intlTelInput") || el.closest(".intl-tel-input")) {
          $el.intlTelInput("setCountry", code);
          syncDial(el);
        }
      } catch {
        /* ignore */
      }
    });

    scrubDuplicateFlags();
  }

  function waitFor(fn, maxMs) {
    return new Promise((resolve) => {
      const start = Date.now();
      (function tick() {
        if (fn()) return resolve(true);
        if (Date.now() - start > (maxMs || 8000)) return resolve(false);
        setTimeout(tick, 60);
      })();
    });
  }

  async function init() {
    injectFlagSpriteCss();
    scrubDuplicateFlags();

    await waitFor(() => window.jQuery && document.querySelector(PHONE_SEL), 8000);
    await waitFor(() => typeof window.jQuery?.fn?.intlTelInput === "function", 5000);
    // Let WP plugin finish its first mount (or guarded skip of the second).
    await new Promise((r) => setTimeout(r, 600));

    const country = await detectCountryFromIp();
    applyCountry(country);

    const redo = () => {
      scrubDuplicateFlags();
      applyCountry(country);
    };
    setTimeout(redo, 400);
    setTimeout(redo, 1200);
    setTimeout(scrubDuplicateFlags, 2500);

    // Observe late mounts from the plugin's ipinfo success callback.
    const mo = new MutationObserver(() => {
      scrubDuplicateFlags();
    });
    document.querySelectorAll(".wpcf7-form").forEach((form) => {
      mo.observe(form, { childList: true, subtree: true });
    });
    setTimeout(() => mo.disconnect(), 8000);
  }

  window.__SP_INIT_PHONE_FLAGS__ = init;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
