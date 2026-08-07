/**
 * Prevent double intlTelInput mounts (WP country-phone plugin + race with fleet helpers).
 * Load early (non-defer) so the first init wins; later inits become setCountry-only.
 */
(function () {
  if (window.__TFG_ITI_GUARD__) return;
  window.__TFG_ITI_GUARD__ = true;

  function isPhoneInput(el) {
    if (!(el instanceof HTMLInputElement)) return false;
    if (el.type === "hidden") return false;
    if (/country-code$/i.test(el.name || "")) return false;
    if (el.classList.contains("wpcf7-phonetext-country-code")) return false;
    return (
      el.classList.contains("wpcf7-phonetext") ||
      /^phonetext-/i.test(el.name || "") ||
      el.type === "tel"
    );
  }

  function patch($) {
    if (!$.fn || typeof $.fn.intlTelInput !== "function" || $.fn.intlTelInput.__tfgGuarded) {
      return Boolean($.fn && $.fn.intlTelInput && $.fn.intlTelInput.__tfgGuarded);
    }
    var original = $.fn.intlTelInput;
    function guarded(options) {
      var args = arguments;
      // Method calls: setCountry, getNumber, destroy, ...
      if (typeof options === "string") {
        return original.apply(this, args);
      }
      return this.each(function () {
        var el = this;
        var $el = $(el);
        if (!isPhoneInput(el)) return;

        var already =
          $el.data("plugin_intlTelInput") ||
          $el.data("intlTelInput") ||
          el.closest(".intl-tel-input");

        if (already) {
          var country =
            (options && (options.initialCountry || options.country)) ||
            window.__SP_PHONE_COUNTRY__;
          if (country && country !== "auto") {
            try {
              original.call($el, "setCountry", String(country).toLowerCase());
            } catch (e) {
              /* ignore */
            }
          }
          return;
        }

        original.call($el, options || {});
      });
    }
    guarded.getCountryData = original.getCountryData;
    guarded.setCountryData = original.setCountryData;
    guarded.windowLoaded = original.windowLoaded;
    guarded.__tfgGuarded = true;
    $.fn.intlTelInput = guarded;
    return true;
  }

  function boot() {
    if (window.jQuery && patch(window.jQuery)) return;
    setTimeout(boot, 30);
  }
  boot();
})();
