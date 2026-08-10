/**
 * Elementor accordion parity: first item open, yellow active title, +/− icons.
 * Re-applies after Elementor frontend may reset widgets; does not fight user clicks.
 */
(() => {
  function setOpen(root, title, open) {
    const item = title.closest(".elementor-accordion-item, .elementor-toggle-item");
    if (!item) return;
    const contentId = title.getAttribute("aria-controls");
    const content = contentId
      ? document.getElementById(contentId)
      : item.querySelector(".elementor-tab-content");

    title.classList.toggle("elementor-active", open);
    title.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) title.setAttribute("aria-selected", "true");
    else title.removeAttribute("aria-selected");

    if (content) {
      content.classList.toggle("elementor-active", open);
      content.hidden = false;
      content.style.display = open ? "block" : "none";
    }
  }

  function closeAll(root) {
    root.querySelectorAll(".elementor-tab-title").forEach((t) => setOpen(root, t, false));
  }

  function applyDefaultOpen(root) {
    const preferred =
      root.querySelector(".elementor-tab-title.elementor-active") ||
      root.querySelector(".elementor-tab-title");
    if (!preferred) return;
    closeAll(root);
    setOpen(root, preferred, true);
  }

  function bindAccordion(root) {
    if (!root.dataset.spAccordionBound) {
      root.dataset.spAccordionBound = "1";
      root.querySelectorAll(".elementor-tab-title").forEach((title) => {
        title.addEventListener(
          "click",
          (e) => {
            e.preventDefault();
            e.stopImmediatePropagation();
            root.dataset.spUserInteracted = "1";
            const wasActive = title.classList.contains("elementor-active");
            closeAll(root);
            if (!wasActive) setOpen(root, title, true);
          },
          true,
        );
      });
    }

    // Open first by default; if Elementor resets (no active), restore unless user interacted
    const hasActive = !!root.querySelector(".elementor-tab-title.elementor-active");
    if (!root.dataset.spDefaultOpened) {
      root.dataset.spDefaultOpened = "1";
      applyDefaultOpen(root);
    } else if (!hasActive && root.dataset.spUserInteracted !== "1") {
      applyDefaultOpen(root);
    }
  }

  function init() {
    document.querySelectorAll(".elementor-accordion, .elementor-toggle").forEach(bindAccordion);
    window.__spAccordionBound = true;
  }

  init();
  document.addEventListener("DOMContentLoaded", init);
  window.addEventListener("load", init);
  [0, 100, 400, 1000, 2000].forEach((ms) => setTimeout(init, ms));

  if (window.jQuery) {
    window.jQuery(window).on("elementor/frontend/init", () => setTimeout(init, 50));
  }
})();
