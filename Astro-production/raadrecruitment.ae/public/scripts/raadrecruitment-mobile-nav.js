/**
 * Astra mobile dropdown toggle for the Astro mirror.
 * Targets only #ast-mobile-header (desktop nav must not receive toggle-on).
 * Binds only when Astra frontend.js did not initialize (missing localize / crash).
 */
(function () {
  function mobileNav() {
    return document.querySelector(
      "#masthead > #ast-mobile-header .main-header-bar-navigation",
    );
  }

  function mobileToggles() {
    return document.querySelectorAll(
      "#masthead > #ast-mobile-header .main-header-menu-toggle",
    );
  }

  function setOpen(open) {
    var nav = mobileNav();
    var toggles = mobileToggles();
    if (!nav || !toggles.length) return;

    nav.classList.toggle("toggle-on", open);
    nav.style.display = open ? "block" : "";
    document.body.classList.toggle("ast-main-header-nav-open", open);

    toggles.forEach(function (btn) {
      btn.classList.toggle("toggled", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  function onToggleClick(e) {
    e.preventDefault();
    var nav = mobileNav();
    if (!nav) return;
    setOpen(!nav.classList.contains("toggle-on"));
  }

  function bindFallback() {
    // Astra adds this during a successful frontend.js boot.
    if (document.body.classList.contains("ast-header-loaded")) return;

    mobileToggles().forEach(function (btn) {
      if (btn.getAttribute("data-raad-mobile-bound") === "1") return;
      btn.setAttribute("data-raad-mobile-bound", "1");
      btn.addEventListener("click", onToggleClick);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindFallback);
  } else {
    bindFallback();
  }
  window.addEventListener("load", function () {
    setTimeout(bindFallback, 0);
  });
})();
