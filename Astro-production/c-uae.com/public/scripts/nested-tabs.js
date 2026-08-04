/**
 * Elementor Nested Tabs fallback (Business Setup mega-menu: Mainland / Free Zone / Offshore).
 * Elementor's nested-tabs bundle often never boots on Astro SSR; this wires click switching.
 */
(() => {
  function activate(root, index) {
    const titles = [...root.querySelectorAll(".e-n-tab-title")];
    const panels = [...root.querySelectorAll('[role="tabpanel"], .e-n-tabs-content > [data-tab-index]')];
    if (!titles.length || !panels.length) return;

    titles.forEach((title) => {
      const i = title.getAttribute("data-tab-index");
      const on = i === String(index);
      title.setAttribute("aria-selected", on ? "true" : "false");
      title.setAttribute("tabindex", on ? "0" : "-1");
      title.classList.toggle("e-active", on);
    });

    panels.forEach((panel) => {
      const i = panel.getAttribute("data-tab-index");
      const on = i === String(index);
      panel.classList.toggle("e-active", on);
      panel.hidden = !on;
      panel.style.display = on ? "" : "none";
      if (on) {
        panel.removeAttribute("hidden");
      }
    });
  }

  function wire(root) {
    if (!(root instanceof HTMLElement) || root.dataset.spNestedTabs === "1") return;
    root.dataset.spNestedTabs = "1";

    // Ensure inactive panels start hidden
    const initial =
      root.querySelector('.e-n-tab-title[aria-selected="true"]')?.getAttribute("data-tab-index") ||
      root.querySelector(".e-n-tab-title")?.getAttribute("data-tab-index") ||
      "1";
    activate(root, initial);

    root.addEventListener(
      "click",
      (event) => {
        const title = event.target.closest?.(".e-n-tab-title");
        if (!title || !root.contains(title)) return;
        event.preventDefault();
        event.stopPropagation();
        const index = title.getAttribute("data-tab-index");
        if (!index) return;
        activate(root, index);
      },
      true,
    );

    root.addEventListener("keydown", (event) => {
      const title = event.target.closest?.(".e-n-tab-title");
      if (!title || !root.contains(title)) return;
      const titles = [...root.querySelectorAll(".e-n-tab-title")];
      const idx = titles.indexOf(title);
      if (idx < 0) return;
      let next = idx;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (idx + 1) % titles.length;
      else if (event.key === "ArrowLeft" || event.key === "ArrowUp")
        next = (idx - 1 + titles.length) % titles.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = titles.length - 1;
      else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activate(root, title.getAttribute("data-tab-index"));
        return;
      } else return;
      event.preventDefault();
      const t = titles[next];
      t?.focus();
      activate(root, t.getAttribute("data-tab-index"));
    });
  }

  function boot() {
    document
      .querySelectorAll(".elementor-widget-n-tabs .e-n-tabs, .e-n-tabs")
      .forEach(wire);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
  window.addEventListener("load", () => setTimeout(boot, 200));
})();
