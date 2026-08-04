/**
 * Connect FM blog Load More — Elementor loop-grid (e-loop) + ECS fallback.
 */
(function () {
  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    var nav =
      document.querySelector("[data-sp-blog-load-more]") ||
      document.querySelector(".e-loop__load-more") ||
      document.querySelector(".ecs-load-more-button");
    if (!nav) return;

    var grid =
      document.querySelector("[data-sp-blog-grid]") ||
      document.querySelector(".elementor-loop-container") ||
      (function () {
        var all = document.querySelectorAll(".ecs-posts.elementor-posts-container");
        return all.length ? all[all.length - 1] : null;
      })();
    if (!grid) return;

    var btn = nav.querySelector("a.elementor-button, a, button");
    if (!btn) return;

    var nextPage = Number(nav.getAttribute("data-next-page") || "2") || 2;
    var perPage =
      Number(nav.getAttribute("data-per-page") || "") ||
      grid.querySelectorAll(".e-loop-item, article.elementor-post").length ||
      15;
    var offset =
      Number(nav.getAttribute("data-offset") || "") ||
      grid.querySelectorAll(".e-loop-item, article.elementor-post").length ||
      perPage;
    var loading = false;
    var defaultLabel =
      (btn.querySelector(".elementor-button-text") || btn).textContent.trim() || "Load More";

    function setLabel(text) {
      var span = btn.querySelector(".elementor-button-text") || btn.querySelector("span");
      if (span) span.textContent = text;
      else btn.textContent = text;
    }

    function onClick(event) {
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
      if (loading || nav.hidden) return;
      loading = true;
      setLabel("Loading...");

      var categoryId = nav.getAttribute("data-category-id") || "";
      var url =
        "/api/blog/load-more/?page=" +
        encodeURIComponent(String(nextPage)) +
        "&perPage=" +
        encodeURIComponent(String(perPage)) +
        "&offset=" +
        encodeURIComponent(String(offset)) +
        (categoryId
          ? "&categoryId=" + encodeURIComponent(categoryId)
          : "");

      fetch(url, { headers: { Accept: "application/json" }, credentials: "same-origin" })
        .then(function (res) {
          if (!res.ok) throw new Error("HTTP " + res.status);
          return res.json();
        })
        .then(function (data) {
          if (!data || !data.ok || typeof data.html !== "string") throw new Error("bad payload");
          if (data.html) grid.insertAdjacentHTML("beforeend", data.html);
          offset = Number(data.nextOffset != null ? data.nextOffset : offset + perPage);
          nav.setAttribute("data-offset", String(offset));
          if (data.hasMore && data.nextPage) {
            nextPage = data.nextPage;
            nav.setAttribute("data-next-page", String(nextPage));
            if (btn.tagName === "A") {
              btn.setAttribute("href", "/blog/page/" + nextPage + "/");
            }
            setLabel(defaultLabel);
          } else {
            nav.hidden = true;
            nav.style.display = "none";
            var wrap = nav.closest(".elementor-widget-loop-grid, .elementor-element");
            if (wrap) {
              wrap.classList.add("e-load-more-pagination-end");
            }
          }
        })
        .catch(function (err) {
          console.error("[sp-blog-load-more]", err);
          setLabel(defaultLabel);
        })
        .finally(function () {
          loading = false;
        });
    }

    btn.addEventListener("click", onClick, true);
  });
})();
