/**
 * Footer back-to-top control (Elementor image link href="#top-bar").
 */
(() => {
  function ensureTopBarId() {
    let el = document.getElementById("top-bar");
    if (el) return el;
    el =
      document.querySelector("header.elementor-location-header") ||
      document.querySelector(".sp-elementor-header header") ||
      document.querySelector("header.elementor");
    if (el) el.id = "top-bar";
    return el;
  }

  function goTop(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === "function") {
        event.stopImmediatePropagation();
      }
    }
    ensureTopBarId();
    window.scrollTo({ top: 0, behavior: "smooth" });
    try {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    } catch {
      /* ignore */
    }
  }

  function wire() {
    ensureTopBarId();
    document.querySelectorAll(".elementor-element-f908490 a, a[href='#top-bar']").forEach((a) => {
      if (a.dataset.spBackTop === "1") return;
      a.dataset.spBackTop = "1";
      a.setAttribute("href", "#top-bar");
      a.setAttribute("role", "button");
      a.setAttribute("aria-label", "Back to top");
      a.addEventListener("click", goTop, true);
    });
  }

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(() => {
    wire();
    setTimeout(wire, 500);
  });
  window.addEventListener("load", () => setTimeout(wire, 200));
})();
