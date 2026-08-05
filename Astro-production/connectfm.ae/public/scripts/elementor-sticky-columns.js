/**
 * Single-post left TOC + right form: CSS sticky within the content row.
 * Avoid Elementor/jquery position:fixed sticky — with sticky_offset:0 it
 * overlaps the site header, and two sticky_parent children fight so the
 * right column often never sticks.
 */
(function () {
  var COLS =
    ".single-post .elementor-element-fd60144, .single-post .elementor-element-9cee146, .single .elementor-element-fd60144, .single .elementor-element-9cee146";

  function isDesktop() {
    return window.matchMedia("(min-width: 1025px)").matches;
  }

  function headerOffset() {
    var header =
      document.querySelector(".sp-elementor-header") ||
      document.querySelector(".elementor-location-header") ||
      document.querySelector("#top-header");
    if (!header) return 24;
    var h = Math.ceil(header.getBoundingClientRect().height);
    // Keep a small gap under the sticky/fixed header bar.
    return Math.max(24, h + 12);
  }

  function destroyJquerySticky(el) {
    var $ = window.jQuery;
    if (!$ || !$.fn || !$.fn.sticky) return;
    var $el = $(el);
    try {
      if ($el.data("sticky")) $el.sticky("destroy");
    } catch (e) {
      /* ignore */
    }
    $el.removeData("connectfmStickyBound");
    // Drop Elementor sticky settings so Pro sticky module won't re-bind fixed.
    var raw = el.getAttribute("data-settings");
    if (!raw) return;
    try {
      var settings = JSON.parse(raw);
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
    var cols = document.querySelectorAll(COLS);
    if (!cols.length) return;

    var top = headerOffset();
    document.documentElement.style.setProperty("--connectfm-sticky-top", top + "px");

    cols.forEach(function (el) {
      destroyJquerySticky(el);
      if (isDesktop()) {
        el.classList.add("connectfm-col-sticky");
      } else {
        el.classList.remove("connectfm-col-sticky");
      }
    });

    var row = document.querySelector(
      ".single-post .elementor-element-a044440, .single .elementor-element-a044440",
    );
    if (row) row.classList.add("connectfm-sticky-row");
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
    clearTimeout(window.__connectfmStickyResize);
    window.__connectfmStickyResize = setTimeout(apply, 150);
  });

  // After Elementor frontend may try to sticky-bind, strip again.
  if (window.jQuery) {
    window.jQuery(window).on("elementor/frontend/init", function () {
      setTimeout(apply, 50);
      setTimeout(apply, 400);
    });
  }
})();
