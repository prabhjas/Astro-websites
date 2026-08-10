/**
 * MBS Consultancy interaction helpers.
 * - Apply Ultimate "Row Backgrounds" (upb_color) without waiting on fragile plugin timing
 * - Ensure Impreza w-tabs switch when theme handlers miss hydration
 * - Soft-init marquees if plugin present
 */
(function () {
  function applyUpbColors() {
    var nodes = document.querySelectorAll(".upb_color[data-bg-color]");
    nodes.forEach(function (el) {
      var color = el.getAttribute("data-bg-color");
      if (!color) return;
      var row = el.previousElementSibling;
      // Ultimate inserts the marker immediately after the VC row/section
      while (row && row.nodeType === 1) {
        if (
          row.matches &&
          (row.matches("section.l-section") ||
            row.matches(".vc_row") ||
            row.matches(".wpb_row") ||
            row.classList.contains("upb_row_bg"))
        ) {
          break;
        }
        // Walk back across spacers/comments wrappers
        if (row.classList && row.classList.contains("upb_color")) {
          row = row.previousElementSibling;
          continue;
        }
        break;
      }
      if (!row) {
        // Fallback: nearest preceding section
        var p = el.previousElementSibling;
        while (p && !(p.matches && p.matches("section.l-section, .vc_row, .wpb_row"))) {
          p = p.previousElementSibling;
        }
        row = p;
      }
      if (!row) return;
      if (!row.getAttribute("data-cr-upb-applied")) {
        row.style.setProperty("background-color", color, "important");
        row.setAttribute("data-cr-upb-applied", "1");
      }
    });

    // Known homepage Key Services dark band
    document.querySelectorAll("section.mainacclerationrow").forEach(function (sec) {
      if (!sec.getAttribute("data-cr-upb-applied")) {
        sec.style.setProperty("background-color", "#0b1347", "important");
        sec.setAttribute("data-cr-upb-applied", "1");
      }
    });
  }

  function activateTab(wrap, tabItem) {
    var items = [].slice.call(wrap.querySelectorAll(".w-tabs-list .w-tabs-item"));
    if (!items.length) items = [].slice.call(wrap.querySelectorAll("button.w-tabs-item, .w-tabs-item"));
    var idx = items.indexOf(tabItem);
    if (idx < 0) return;
    items.forEach(function (it, i) {
      var on = i === idx;
      it.classList.toggle("active", on);
      it.classList.toggle("defined-active", on);
      it.setAttribute("aria-expanded", on ? "true" : "false");
      it.setAttribute("aria-selected", on ? "true" : "false");
    });
    var control = tabItem.getAttribute("aria-controls");
    var sections = [].slice.call(wrap.querySelectorAll(".w-tabs-sections > .w-tabs-section, .w-tabs-section"));
    sections.forEach(function (sec, i) {
      var content = sec.querySelector(".w-tabs-section-content");
      var header = sec.querySelector(".w-tabs-section-header");
      var on =
        (control && content && content.id === control) ||
        (control && sec.id && ("content-" + sec.id === control || sec.id === control.replace(/^content-/, ""))) ||
        (!control && i === idx);
      sec.classList.toggle("active", on);
      if (header) {
        header.classList.toggle("active", on);
        header.setAttribute("aria-expanded", on ? "true" : "false");
      }
      if (content) {
        content.style.display = on ? "" : "none";
        content.hidden = !on;
      }
    });
  }

  function bindTabs(root) {
    var tabs = (root || document).querySelectorAll(".w-tabs");
    tabs.forEach(function (wrap) {
      if (wrap.getAttribute("data-cr-tabs")) return;
      wrap.setAttribute("data-cr-tabs", "1");
      wrap.addEventListener("click", function (e) {
        var tabItem = e.target.closest(".w-tabs-item, .w-tabs-section-header");
        if (!tabItem || !wrap.contains(tabItem)) return;
        // Section headers on mobile accordion mode
        if (tabItem.classList.contains("w-tabs-section-header")) {
          var sec = tabItem.closest(".w-tabs-section");
          if (!sec) return;
          var control = tabItem.getAttribute("aria-controls");
          var btn = control
            ? wrap.querySelector('.w-tabs-list .w-tabs-item[aria-controls="' + control + '"]')
            : null;
          if (btn) activateTab(wrap, btn);
          return;
        }
        // Let Impreza handle first; if it doesn't activate, fall back
        window.setTimeout(function () {
          if (!tabItem.classList.contains("active")) activateTab(wrap, tabItem);
        }, 30);
      });
    });
  }

  /**
   * Mega-menu exclusivity: when hovering Visa, close HR (and any other) open panel.
   * Page-design CSS forced every :hover dropdown visible with !important, so siblings
   * could stay painted while Impreza left .opened on the previous item.
   */
  function refreshSmartSliders() {
    try {
      window.dispatchEvent(new Event("resize"));
      if (window._N2 && typeof window._N2.trigger === "function") {
        window._N2.trigger(window, "resize");
      }
    } catch (e) {
      /* Smart Slider optional */
    }
  }

  function bindSmartSliderRefresh() {
    var debounced;
    function schedule() {
      window.clearTimeout(debounced);
      debounced = window.setTimeout(function () {
        refreshSmartSliders();
        window.setTimeout(refreshSmartSliders, 400);
      }, 120);
    }
    window.addEventListener("resize", schedule);
    window.matchMedia("(max-width: 900px)").addEventListener("change", schedule);
    document.querySelectorAll(".ush_menu_2 .w-nav-control").forEach(function (btn) {
      btn.addEventListener("click", schedule);
    });
    document.querySelectorAll(".ush_menu_2 .w-nav-arrow").forEach(function (arrow) {
      arrow.addEventListener("click", schedule);
    });
    if (typeof ResizeObserver !== "undefined") {
      document.querySelectorAll('[id^="n2-ss-"]').forEach(function (el) {
        if (!/^n2-ss-\d+$/.test(el.id)) return;
        var col = el.closest(".wpb_text_column, .g-cols");
        if (!col) return;
        try {
          new ResizeObserver(schedule).observe(col);
        } catch (e) {
          /* ignore */
        }
      });
    }
  }

  function bindExclusiveMegaMenus(root) {
    var navs = (root || document).querySelectorAll(".w-nav.type_desktop");
    navs.forEach(function (nav) {
      if (nav.getAttribute("data-cr-mega")) return;
      nav.setAttribute("data-cr-mega", "1");
      var items = nav.querySelectorAll(".menu-item.level_1.menu-item-has-children");
      items.forEach(function (item) {
        item.addEventListener("mouseenter", function () {
          items.forEach(function (other) {
            if (other === item) return;
            other.classList.remove("opened", "focus");
            var list = other.querySelector(":scope > .w-nav-list.level_2");
            if (list) {
              list.style.removeProperty("display");
              list.style.removeProperty("visibility");
              list.style.removeProperty("opacity");
              list.style.removeProperty("transform");
            }
          });
          item.classList.add("opened");
        });
        item.addEventListener("mouseleave", function (e) {
          var related = e.relatedTarget;
          if (related && item.contains(related)) return;
          // Keep open if moving into own dropdown (dropdown may be position:absolute outside)
          var dropdown = item.querySelector(":scope > .w-nav-list.level_2");
          if (related && dropdown && dropdown.contains(related)) return;
          window.setTimeout(function () {
            if (item.matches(":hover") || (dropdown && dropdown.matches(":hover"))) return;
            item.classList.remove("opened", "focus");
          }, 80);
        });
      });
    });
  }

  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  ready(function () {
    applyUpbColors();
    bindTabs(document);
    bindExclusiveMegaMenus(document);
    bindSmartSliderRefresh();
    refreshSmartSliders();
    // Re-apply after Ultimate / theme JS mutate DOM
    window.setTimeout(applyUpbColors, 50);
    window.setTimeout(applyUpbColors, 400);
    window.setTimeout(function () {
      bindTabs(document);
      bindExclusiveMegaMenus(document);
      refreshSmartSliders();
    }, 400);
    window.setTimeout(refreshSmartSliders, 1200);
  });
})();
