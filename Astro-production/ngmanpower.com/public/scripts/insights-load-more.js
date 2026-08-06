/**
 * Impreza w-grid Load More for /insights/ Latest Articles.
 * Appends unused posts into the grid that owns the Load More button.
 */
(function () {
  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    var loadMore =
      document.querySelector("[data-sp-insights-load-more]") ||
      document.querySelector(".g-loadmore");
    if (!loadMore) return;

    var gridRoot =
      loadMore.closest(".w-grid") ||
      document.querySelector("[data-sp-insights-grid]") ||
      document.querySelector(".w-grid.type_grid");
    if (!gridRoot) return;

    var list =
      gridRoot.querySelector("[data-sp-insights-list]") ||
      gridRoot.querySelector(".w-grid-list");
    if (!list) return;

    var btn = loadMore.querySelector("button, a.w-btn, a");
    if (!btn) return;

    var perPage = Number(loadMore.getAttribute("data-per-page") || "12") || 12;
    var loading = false;
    var defaultLabel =
      (btn.querySelector(".w-btn-label") || btn).textContent.trim() || "Load More";

    function setLabel(text) {
      var span = btn.querySelector(".w-btn-label, span");
      if (span) span.textContent = text;
      else btn.textContent = text;
    }

    function hide() {
      loadMore.hidden = true;
      loadMore.style.display = "none";
      loadMore.classList.add("done");
    }

    function shownIds() {
      // Exclude every card already on the insights page (featured + latest)
      // so we never append duplicates of the top row.
      return Array.prototype.map
        .call(document.querySelectorAll(".w-grid-item[data-id]"), function (el) {
          return el.getAttribute("data-id");
        })
        .filter(Boolean)
        .join(",");
    }

    function onClick(event) {
      event.preventDefault();
      event.stopPropagation();
      if (loading || loadMore.hidden) return;
      loading = true;
      loadMore.classList.add("loading");
      setLabel("Loading...");

      var url =
        "/api/blog/load-more/?format=impreza&perPage=" +
        encodeURIComponent(String(perPage)) +
        "&exclude=" +
        encodeURIComponent(shownIds());

      fetch(url, { headers: { Accept: "application/json" }, credentials: "same-origin" })
        .then(function (res) {
          if (!res.ok) throw new Error("HTTP " + res.status);
          return res.json();
        })
        .then(function (data) {
          if (!data || !data.ok || typeof data.html !== "string") throw new Error("bad payload");
          if (data.html) list.insertAdjacentHTML("beforeend", data.html);
          if (data.hasMore) setLabel(defaultLabel);
          else hide();
        })
        .catch(function (err) {
          console.error("[sp-insights-load-more]", err);
          setLabel(defaultLabel);
        })
        .finally(function () {
          loading = false;
          loadMore.classList.remove("loading");
        });
    }

    btn.addEventListener("click", onClick, true);
  });
})();
