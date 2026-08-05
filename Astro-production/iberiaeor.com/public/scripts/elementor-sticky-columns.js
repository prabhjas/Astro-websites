/**
 * Single-post: stick the form section only (not the whole sidebar column).
 * Keeps layout/design unchanged; form stays inside its parent column/row.
 */
(function () {
  var FORM =
    ".single-post .elementor-element-5e2cc20, .single .elementor-element-5e2cc20, .elementor-234 .elementor-element-5e2cc20";

  function headerOffset() {
    var header =
      document.querySelector("#top-header") ||
      document.querySelector(".elementor-location-header") ||
      document.querySelector(".sp-elementor-header");
    if (!header) return 16;
    var cs = window.getComputedStyle(header);
    var fixed =
      cs.position === "fixed" ||
      cs.position === "sticky" ||
      !!header.querySelector(
        '.elementor-sticky--active, [style*="position: fixed"], [style*="position:fixed"]',
      );
    // Header scrolls away on single posts — keep a tight top gap only.
    if (!fixed) return 16;
    var h = Math.ceil(header.getBoundingClientRect().height);
    return Math.max(16, h + 8);
  }

  function stripFixedSticky(el) {
    if (!(el instanceof HTMLElement)) return;
    var $ = window.jQuery;
    if ($ && $.fn && $.fn.sticky) {
      try {
        var $el = $(el);
        if ($el.data("sticky")) $el.sticky("destroy");
      } catch (e) {
        /* ignore */
      }
    }
    el.classList.remove("elementor-sticky", "elementor-sticky--active");
    // Clear only fixed-sticky inline styles Elementor may have set
    if (el.style.position === "fixed") {
      el.style.position = "";
      el.style.top = "";
      el.style.width = "";
      el.style.insetInlineStart = "";
    }
    var raw = el.getAttribute("data-settings");
    if (!raw) return;
    try {
      var settings = JSON.parse(raw.replace(/&quot;/g, '"'));
      if (!settings.sticky) return;
      delete settings.sticky;
      delete settings.sticky_on;
      delete settings.sticky_parent;
      delete settings.sticky_offset;
      delete settings.sticky_effects_offset;
      delete settings.sticky_anchor_link_offset;
      el.setAttribute("data-settings", JSON.stringify(settings));
    } catch (e) {
      /* ignore */
    }
  }

  function apply() {
    var forms = document.querySelectorAll(FORM);
    if (!forms.length) return;

    document.documentElement.style.setProperty(
      "--iberia-sticky-top",
      headerOffset() + "px",
    );

    forms.forEach(stripFixedSticky);

    document.querySelectorAll(".elementor-sticky__spacer").forEach(function (n) {
      if (n.closest(FORM.split(",")[0].trim()) || n.closest(".elementor-element-5e2cc20")) {
        n.style.display = "none";
      }
    });
  }

  function boot() {
    apply();
    setTimeout(apply, 300);
    setTimeout(apply, 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.addEventListener("load", apply);
  window.addEventListener("resize", function () {
    clearTimeout(window.__iberiaStickyResize);
    window.__iberiaStickyResize = setTimeout(apply, 150);
  });

  if (window.jQuery) {
    window.jQuery(window).on("elementor/frontend/init", function () {
      setTimeout(apply, 50);
      setTimeout(apply, 400);
    });
  }
})();
