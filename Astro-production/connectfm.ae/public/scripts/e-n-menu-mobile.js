/**
 * Elementor Pro mega-menu (e-n-menu) mobile accordion fallback.
 * Ensures Services dropdown adds `.e-active` (required by widget-mega-menu CSS)
 * when Elementor's webpack chunk fails to bind or open_on:hover blocks mobile.
 */
(() => {
  const MQ = "(max-width: 1024px)";

  function isMobile() {
    return window.matchMedia(MQ).matches;
  }

  function setLayout(nav) {
    if (!nav) return;
    if (isMobile()) nav.setAttribute("data-layout", "dropdown");
    else nav.removeAttribute("data-layout");
  }

  function closeItem(li) {
    const btn = li.querySelector(":scope > .e-n-menu-title .e-n-menu-dropdown-icon");
    const content = li.querySelector(":scope > .e-n-menu-content > .e-con");
    const title = li.querySelector(":scope > .e-n-menu-title");
    if (btn) btn.setAttribute("aria-expanded", "false");
    if (content) content.classList.remove("e-active");
    if (title) title.classList.remove("e-current");
    li.classList.remove("is-open");
  }

  function openItem(li) {
    const btn = li.querySelector(":scope > .e-n-menu-title .e-n-menu-dropdown-icon");
    const content = li.querySelector(":scope > .e-n-menu-content > .e-con");
    const title = li.querySelector(":scope > .e-n-menu-title");
    if (btn) btn.setAttribute("aria-expanded", "true");
    if (content) content.classList.add("e-active");
    if (title) title.classList.add("e-current");
    li.classList.add("is-open");
  }

  function toggleItem(li) {
    if (li.classList.contains("is-open")) closeItem(li);
    else {
      const parent = li.parentElement;
      if (parent) {
        parent.querySelectorAll(":scope > .e-n-menu-item.is-open").forEach((sib) => {
          if (sib !== li) closeItem(sib);
        });
      }
      openItem(li);
    }
  }

  function ensureMenuToggle(widget) {
    const toggle = widget.querySelector(".e-n-menu-toggle");
    const wrapper = widget.querySelector(".e-n-menu-wrapper");
    if (!toggle || !wrapper || toggle.dataset.astroBound === "1") return;
    toggle.dataset.astroBound = "1";

    toggle.addEventListener("click", (e) => {
      if (!isMobile()) return;
      e.preventDefault();
      const open = toggle.getAttribute("aria-expanded") !== "true";
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      if (!open) {
        widget.querySelectorAll(".e-n-menu-item.is-open").forEach(closeItem);
      }
    });
  }

  function bindDropdowns(widget) {
    if (widget.dataset.astroDropdownBound === "1") return;
    widget.dataset.astroDropdownBound = "1";

    widget.querySelectorAll(".e-n-menu-item").forEach((li) => {
      const btn = li.querySelector(":scope > .e-n-menu-title .e-n-menu-dropdown-icon");
      const titleClick = li.querySelector(
        ":scope > .e-n-menu-title .e-n-menu-title-container:not(a)",
      );
      if (!btn) return;

      const onToggle = (e) => {
        if (!isMobile()) return;
        e.preventDefault();
        e.stopPropagation();
        toggleItem(li);
      };

      btn.addEventListener("click", onToggle);
      if (titleClick) titleClick.addEventListener("click", onToggle);
    });
  }

  function init() {
    document.querySelectorAll(".elementor-widget-n-menu").forEach((widget) => {
      const nav = widget.querySelector(".e-n-menu");
      setLayout(nav);
      ensureMenuToggle(widget);
      bindDropdowns(widget);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.addEventListener("resize", () => {
    document.querySelectorAll(".elementor-widget-n-menu .e-n-menu").forEach(setLayout);
  });
})();
