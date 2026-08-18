(() => {
  const MENU_ROOTS = [
    "header",
    "nav",
    ".elementor-nav-menu",
    ".elementor-location-header",
    ".w-nav",
    "#navbar",
    ".e-n-menu",
    ".ast-nav-menu",
    ".sp-menu",
    ".raven-nav-menu",
    "#page-header",
  ].join(",");

  const keepHash = (a) =>
    a.matches(
      "[data-modal], .modeltheme-trigger, .w-nav-control, [data-elementor-open-lightbox], .elementor-menu-toggle, .e-n-menu-toggle"
    );

  const isMenuToggle = (a) => {
    if (!(a instanceof HTMLAnchorElement)) return false;
    if (a.getAttribute("href") !== "#") return false;
    if (keepHash(a)) return false;
    if (!a.closest(MENU_ROOTS)) return false;
    const li = a.closest("li, .e-n-menu-item, .menu-item");
    const hasKids =
      (li &&
        (li.classList.contains("menu-item-has-children") ||
          li.querySelector(":scope > .sub-menu, :scope > .w-nav-list, :scope > ul, :scope > .e-n-menu-content"))) ||
      a.classList.contains("elementor-item-anchor") ||
      a.getAttribute("aria-haspopup") === "true" ||
      a.hasAttribute("aria-expanded");
    return Boolean(hasKids);
  };

  const neutralize = (a) => {
    if (!isMenuToggle(a)) return;
    a.removeAttribute("href");
    if (!a.getAttribute("role")) a.setAttribute("role", "button");
    if (!a.hasAttribute("tabindex")) a.setAttribute("tabindex", "0");
  };

  const run = () => document.querySelectorAll('a[href="#"]').forEach(neutralize);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();
