/**
 * Insights category dropdown (WP Categories sidebar widget).
 * Navigates to /category/{slug}/ and styles the control for Emirati Guard.
 */
(() => {
  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  function wireSelect(select) {
    if (!(select instanceof HTMLSelectElement) || select.dataset.spCatWired === "1") return;
    select.dataset.spCatWired = "1";

    // Prevent WP form POST to homepage
    const form = select.closest("form");
    if (form) {
      form.addEventListener("submit", (e) => e.preventDefault());
      form.setAttribute("action", "#");
      form.removeAttribute("method");
    }

    select.addEventListener("change", () => {
      const opt = select.options[select.selectedIndex];
      if (!opt || select.value === "-1" || select.value === "") return;
      const href =
        opt.getAttribute("data-path") ||
        opt.getAttribute("data-url") ||
        (opt.value.startsWith("/") ? opt.value : null);
      if (href) {
        window.location.href = href;
        return;
      }
      // Fallback: WP term id → known path map from data attribute on select
      const mapRaw = select.getAttribute("data-sp-cat-map");
      if (mapRaw) {
        try {
          const map = JSON.parse(mapRaw);
          if (map[select.value]) window.location.href = map[select.value];
        } catch {
          /* ignore */
        }
      }
    });
  }

  ready(() => {
    document
      .querySelectorAll(".cat-lable select.postform, .widget_categories select.postform, select#cat")
      .forEach(wireSelect);
  });
})();
