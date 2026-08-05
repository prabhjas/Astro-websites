/**
 * Lightweight Elementor parity helpers for Astro mirrors.
 * - Paint gallery items that only store images in data-thumbnail
 * - Open the first accordion item when Elementor left everything collapsed
 */
(function () {
  function paintGalleries() {
    document.querySelectorAll(".e-gallery-image[data-thumbnail]").forEach(function (el) {
      var src = el.getAttribute("data-thumbnail");
      if (!src) return;
      if (!el.style.backgroundImage) {
        el.style.backgroundImage = 'url("' + src + '")';
      }
      el.style.backgroundSize = el.style.backgroundSize || "contain";
      el.style.backgroundRepeat = el.style.backgroundRepeat || "no-repeat";
      el.style.backgroundPosition = el.style.backgroundPosition || "center center";
      if (!el.style.minHeight) el.style.minHeight = "40px";
    });

    document.querySelectorAll(".elementor-gallery__container").forEach(function (container) {
      var widget = container.closest(".elementor-widget-gallery");
      var settings = {};
      try {
        settings = JSON.parse((widget && widget.getAttribute("data-settings")) || "{}");
      } catch (e) {}
      var cols = Number(settings.columns) || 9;
      var gap = (settings.gap && settings.gap.size) || 30;
      // Always apply a CSS grid fallback for masonry logo strips — Elementor
      // Pro gallery JS may leave items at 0×0 or stacked full-width.
      container.style.display = "grid";
      container.style.gridTemplateColumns = "repeat(" + cols + ", minmax(0, 1fr))";
      container.style.gap = gap + "px";
      container.style.alignItems = "center";
      container.style.minHeight = "40px";
      container.style.width = "100%";
      container.style.position = "relative";
      container.style.height = "auto";
      container.querySelectorAll(".e-gallery-item").forEach(function (item) {
        item.style.position = "relative";
        item.style.left = "auto";
        item.style.top = "auto";
        item.style.width = "auto";
        item.style.maxWidth = "100%";
        item.style.minHeight = "40px";
        item.style.display = "flex";
        item.style.alignItems = "center";
        item.style.justifyContent = "center";
        item.style.transform = "none";
      });
    });
  }

  function openFirstAccordion() {
    document.querySelectorAll(".elementor-accordion").forEach(function (acc) {
      if (acc.querySelector(".elementor-tab-title.elementor-active")) return;
      var firstTitle = acc.querySelector(".elementor-accordion-item .elementor-tab-title");
      var firstContent = acc.querySelector(".elementor-accordion-item .elementor-tab-content");
      if (!firstTitle || !firstContent) return;
      firstTitle.classList.add("elementor-active");
      firstTitle.setAttribute("aria-expanded", "true");
      firstContent.style.display = "block";
      firstContent.classList.add("elementor-active");
    });
  }

  function fixAccordionIcons() {
    // Keep a single CSS ::before arrow — clear any textContent so FA/unicode
    // glyphs do not stack next to the red ↑/↓ from migration-overrides.css.
    document.querySelectorAll(".elementor-accordion-icon i.fas, .elementor-accordion-icon i.fa").forEach(function (icon) {
      if (icon.textContent) icon.textContent = "";
    });
  }

  function fixLpFormSelect() {
    document.querySelectorAll('#lp-form select[name="select-visa"]').forEach(function (sel) {
      function syncColor() {
        sel.style.color = sel.value === "Select one" ? "#A3ADAD" : "#021212";
      }
      if (!sel.dataset.crLpSelectWired) {
        sel.dataset.crLpSelectWired = "1";
        sel.addEventListener("change", syncColor);
      }
      syncColor();
    });
  }

  function run() {
    paintGalleries();
    openFirstAccordion();
    fixAccordionIcons();
    fixLpFormSelect();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
  window.addEventListener("load", function () {
    setTimeout(run, 50);
    setTimeout(run, 500);
    setTimeout(run, 1500);
  });
})();
