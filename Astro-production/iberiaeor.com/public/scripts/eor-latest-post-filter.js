/**
 * “The Latest Post” taxonomy filter (Blog + category tabs).
 * Elementor Pro’s refresh-loop endpoint is unavailable on Astro - filter in-DOM instead.
 * Blog (__all) always shows at most 3 default cards; never loads more.
 */
(() => {
  if (window.__EOR_LATEST_POST_FILTER_BOOTED__) return;
  window.__EOR_LATEST_POST_FILTER_BOOTED__ = true;

  const MAX = 3;

  function boot() {
    const filters = document.querySelectorAll(
      ".elementor-widget-taxonomy-filter .e-filter",
    );
    if (!filters.length) return;

    filters.forEach((filterEl) => {
      const widget = filterEl.closest(".elementor-element");
      const settingsRaw = widget?.getAttribute("data-settings") || "{}";
      let selectedId = "";
      try {
        const settings = JSON.parse(settingsRaw.replace(/&quot;/g, '"'));
        selectedId = String(settings.selected_element || "");
      } catch {
        /* ignore */
      }

      const gridWidget = selectedId
        ? document.querySelector(`.elementor-element-${selectedId}`)
        : widget?.parentElement?.querySelector(".elementor-widget-loop-grid");
      const container =
        gridWidget?.querySelector(".elementor-loop-container") ||
        document.querySelector(".elementor-loop-container.elementor-grid");
      if (!container) return;

      // Ensure Blog label (All → Blog)
      const allBtn = filterEl.querySelector('.e-filter-item[data-filter="__all"]');
      if (allBtn && /^\s*All\s*$/i.test(allBtn.textContent || "")) {
        allBtn.textContent = "Blog";
      }

      const items = () =>
        Array.from(
          container.querySelectorAll(':scope > [data-elementor-type="loop-item"]'),
        );

      function setPressed(active) {
        filterEl.querySelectorAll(".e-filter-item").forEach((btn) => {
          const on = btn === active;
          btn.setAttribute("aria-pressed", on ? "true" : "false");
        });
      }

      function applyFilter(slug) {
        const all = items();
        let matches;
        if (slug === "__all" || slug === "blog") {
          matches = all.filter((el) => el.hasAttribute("data-sp-blog-default"));
          if (!matches.length) matches = all.slice(0, MAX);
        } else {
          matches = all.filter((el) =>
            el.classList.contains(`category-${slug}`),
          );
        }

        all.forEach((el) => {
          el.style.display = "none";
        });
        matches.slice(0, MAX).forEach((el) => {
          el.style.display = "";
        });
      }

      // Capture-phase so Elementor Pro never fires refresh-loop
      filterEl.addEventListener(
        "click",
        (event) => {
          const btn = event.target?.closest?.(".e-filter-item");
          if (!btn || !filterEl.contains(btn)) return;
          event.preventDefault();
          event.stopPropagation();
          if (typeof event.stopImmediatePropagation === "function") {
            event.stopImmediatePropagation();
          }
          const slug = btn.getAttribute("data-filter") || "__all";
          setPressed(btn);
          applyFilter(slug);
        },
        true,
      );

      // Initial: Blog / __all → exactly 3 default posts
      applyFilter("__all");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
