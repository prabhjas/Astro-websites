/**
 * Light MBS interaction helpers — nav active fallback, accordion nudge, slider safety.
 */
(function () {
  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    // Impreza desktop dropdowns: open on hover if theme JS lags
    document.querySelectorAll(".w-nav.type_desktop .menu-item-has-children").forEach(function (li) {
      li.addEventListener("mouseenter", function () {
        li.classList.add("opened");
      });
      li.addEventListener("mouseleave", function () {
        li.classList.remove("opened");
      });
    });

    // Mobile hamburger
    document.querySelectorAll(".w-nav-control").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        var nav = btn.closest(".w-nav");
        if (!nav) return;
        nav.classList.toggle("opened");
        document.documentElement.classList.toggle("w-nav-open");
      });
    });

    // Nudge Master Addons accordion if Elementor frontend already ran
    try {
      if (window.jQuery && window.elementorFrontend) {
        window.jQuery(window).trigger("elementor/frontend/init");
      }
    } catch (_) {}

    // Re-init Smart Slider if markup present but not started
    try {
      if (window._N2 && document.querySelector(".n2-ss-slider")) {
        // boot file already registers documentReady; nothing else required
      }
    } catch (_) {}
  });
})();
