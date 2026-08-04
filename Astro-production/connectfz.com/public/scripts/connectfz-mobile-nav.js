/**
 * Connect FZ mobile nav — Oklahoma Bootstrap header.
 * Live mobile menu is a flat top-level list (no submenu dropdowns).
 */
(() => {
  const MQ = "(max-width: 991px)";

  function isMobile() {
    return window.matchMedia(MQ).matches;
  }

  function initBootstrapCollapse() {
    const btn = document.querySelector(".navbar-toggle");
    const panel = document.querySelector("#navbar");
    if (!btn || !panel) return;

    btn.addEventListener("click", (e) => {
      if (typeof window.jQuery !== "undefined" && window.jQuery.fn?.collapse) {
        // Still sync our open class when Bootstrap handles the toggle
        setTimeout(() => {
          const open = panel.classList.contains("in");
          document.documentElement.classList.toggle("cfz-nav-open", open);
        }, 0);
        return;
      }
      e.preventDefault();
      const open = panel.classList.toggle("in");
      panel.classList.toggle("collapse", !open);
      btn.classList.toggle("collapsed", !open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      document.documentElement.classList.toggle("cfz-nav-open", open);
    });
  }

  /** Remove any leftover plus-toggles; keep links flat like live. */
  function flattenMobileMenu() {
    document.querySelectorAll("#navbar .cfz-sub-toggle").forEach((el) => el.remove());
    document.querySelectorAll("#navbar .expand").forEach((el) => el.remove());
    document.querySelectorAll("#navbar .cfz-sub-open, #navbar .show-menu").forEach((el) => {
      el.classList.remove("cfz-sub-open", "show-menu");
    });
  }

  function closeOnDesktop() {
    flattenMobileMenu();
    if (isMobile()) return;
    const panel = document.querySelector("#navbar");
    const btn = document.querySelector(".navbar-toggle");
    if (panel) {
      panel.classList.add("collapse");
      panel.classList.remove("in");
    }
    if (btn) {
      btn.classList.add("collapsed");
      btn.setAttribute("aria-expanded", "false");
    }
    document.documentElement.classList.remove("cfz-nav-open");
  }

  function fixLogoHref() {
    document
      .querySelectorAll("header.header1 .logo a[href=''], header.header1 .logo a:not([href])")
      .forEach((a) => {
        a.setAttribute("href", "/");
      });
  }

  function boot() {
    fixLogoHref();
    initBootstrapCollapse();
    flattenMobileMenu();
    closeOnDesktop();
    // Oklahoma theme injects .expand toggles after load — strip them again.
    setTimeout(flattenMobileMenu, 0);
    setTimeout(flattenMobileMenu, 300);
    setTimeout(flattenMobileMenu, 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
  window.addEventListener("resize", closeOnDesktop);
})();
