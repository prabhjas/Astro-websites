/**
 * MBS interactions — nav + FAQ accordion + Elementor/SmartSlider nudge.
 */
(function () {
  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  function initFaqAccordion() {
    var $ = window.jQuery;
    if (!$) return;

    document.querySelectorAll(".ma-advanced-accordion, .jltma-advanced-accordion").forEach(function (root) {
      if (root.getAttribute("data-mbs-faq-bound") === "1") return;
      root.setAttribute("data-mbs-faq-bound", "1");

      var speed = 300;
      try {
        var widgetEl = root.closest('[data-widget_type*="accordion"]') || root;
        var raw = widgetEl.getAttribute("data-settings");
        if (raw) {
          var parsed = JSON.parse(raw.replace(/&quot;/g, '"'));
          if (parsed && parsed.toggle_speed) speed = Number(parsed.toggle_speed) || 300;
        }
      } catch (_) {}

      var headers = root.querySelectorAll(".jltma-accordion-header");
      headers.forEach(function (header) {
        if (header.classList.contains("active-default")) {
          header.classList.add("show", "active");
          var next = header.nextElementSibling;
          if (next) $(next).show();
        }

        header.addEventListener(
          "click",
          function (e) {
            // Prefer our handler so FAQ works even if Master Accordion missed Elementor init
            e.preventDefault();
            e.stopImmediatePropagation();

            var isOpen = header.classList.contains("show");
            var widget = header.closest(".ma-advanced-accordion, .jltma-advanced-accordion") || root;

            widget.querySelectorAll(".jltma-accordion-header.show").forEach(function (h) {
              if (h === header) return;
              h.classList.remove("show", "active");
              if (h.nextElementSibling) $(h.nextElementSibling).stop(true, true).slideUp(speed);
            });

            if (isOpen) {
              header.classList.remove("show", "active");
              if (header.nextElementSibling) $(header.nextElementSibling).stop(true, true).slideUp(speed);
            } else {
              header.classList.add("show", "active");
              if (header.nextElementSibling) $(header.nextElementSibling).stop(true, true).slideDown(speed);
            }
          },
          true
        );
      });
    });
  }

  function nudgeElementor() {
    try {
      if (window.jQuery) {
        window.jQuery(window).trigger("elementor/frontend/init");
      }
    } catch (_) {}
  }

  function nudgeSmartSlider() {
    try {
      window.dispatchEvent(new Event("resize"));
      if (window._N2 && _N2.r) {
        // Force responsive recalc after fonts/images settle
        _N2.r("documentReady", function () {});
      }
    } catch (_) {}
  }

  ready(function () {
    document.querySelectorAll(".w-nav.type_desktop .menu-item-has-children").forEach(function (li) {
      li.addEventListener("mouseenter", function () {
        li.classList.add("opened");
      });
      li.addEventListener("mouseleave", function () {
        li.classList.remove("opened");
      });
    });

    document.querySelectorAll(".w-nav-control").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        var nav = btn.closest(".w-nav");
        if (!nav) return;
        nav.classList.toggle("opened");
        document.documentElement.classList.toggle("w-nav-open");
      });
    });

    initFaqAccordion();
    nudgeElementor();
    setTimeout(initFaqAccordion, 300);
    setTimeout(initFaqAccordion, 1200);
    setTimeout(nudgeSmartSlider, 400);
    setTimeout(nudgeSmartSlider, 1500);
  });
})();
