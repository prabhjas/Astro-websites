/**
 * Blog / Insights Load More.
 * - Elementor/ECS grids: [data-sp-blog-load-more] / .ecs-load-more-button
 * - Impreza insights grid: .g-loadmore (us_ajax_grid replacement)
 */
(function () {
  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  function setButtonLabel(btn, text) {
    var span = btn.querySelector(".w-btn-label, span");
    if (span) span.textContent = text;
    else btn.textContent = text;
  }

  function wireElementorLoadMore() {
    var nav =
      document.querySelector("[data-sp-blog-load-more]") ||
      document.querySelector(".ecs-load-more-button");
    if (!nav) return;

    var grid =
      document.querySelector("[data-sp-blog-grid]") ||
      (function () {
        var all = document.querySelectorAll(".ecs-posts.elementor-posts-container");
        return all.length ? all[all.length - 1] : null;
      })();
    if (!grid) return;

    var btn = nav.querySelector("a.elementor-button, a, button");
    if (!btn) return;

    var nextPage = Number(nav.getAttribute("data-next-page") || "2") || 2;
    var perPage = Number(nav.getAttribute("data-per-page") || "12") || 12;
    var loading = false;
    var defaultLabel = (btn.textContent || "Load More").trim() || "Load More";

    function onClick(event) {
      event.preventDefault();
      event.stopPropagation();
      if (loading || nav.hidden) return;
      loading = true;
      setButtonLabel(btn, "Loading...");

      var url =
        "/api/blog/load-more/?page=" +
        encodeURIComponent(String(nextPage)) +
        "&perPage=" +
        encodeURIComponent(String(perPage));

      fetch(url, { headers: { Accept: "application/json" }, credentials: "same-origin" })
        .then(function (res) {
          if (!res.ok) throw new Error("HTTP " + res.status);
          return res.json();
        })
        .then(function (data) {
          if (!data || !data.ok || typeof data.html !== "string") throw new Error("bad payload");
          if (data.html) grid.insertAdjacentHTML("beforeend", data.html);
          if (data.hasMore && data.nextPage) {
            nextPage = data.nextPage;
            nav.setAttribute("data-next-page", String(nextPage));
            if (btn.tagName === "A") {
              btn.setAttribute("href", "/blog/page/" + nextPage + "/");
            }
            setButtonLabel(btn, defaultLabel);
          } else {
            nav.hidden = true;
            nav.style.display = "none";
          }
        })
        .catch(function (err) {
          console.error("[sp-blog-load-more]", err);
          setButtonLabel(btn, defaultLabel);
        })
        .finally(function () {
          loading = false;
        });
    }

    btn.addEventListener("click", onClick, true);
  }

  function wireImprezaLoadMore() {
    var loaders = document.querySelectorAll(".w-grid .g-loadmore");
    if (!loaders.length) return;

    loaders.forEach(function (nav) {
      var grid = nav.closest(".w-grid");
      if (!grid) return;
      var list = grid.querySelector(".w-grid-list");
      var btn = nav.querySelector("button, .w-btn, a");
      if (!list || !btn) return;

      // Read per-page from embedded grid JSON when available
      var perPage = 4;
      var nextPage = 2;
      var jsonEl = grid.querySelector(".w-grid-json");
      try {
        if (jsonEl && typeof jsonEl.onclick === "function") {
          var cfg = jsonEl.onclick() || {};
          var qa = (cfg.template_vars && cfg.template_vars.query_args) || {};
          if (qa.posts_per_page) perPage = Number(qa.posts_per_page) || perPage;
        }
      } catch (_) {}

      var loading = false;
      var defaultLabel = (btn.textContent || "Load More").trim() || "Load More";

      function existingIds() {
        return Array.prototype.map
          .call(list.querySelectorAll("article.w-grid-item[data-id]"), function (el) {
            return el.getAttribute("data-id");
          })
          .filter(Boolean)
          .join(",");
      }

      function onClick(event) {
        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === "function") {
          event.stopImmediatePropagation();
        }
        if (loading || nav.hidden || nav.classList.contains("done")) return;
        loading = true;
        nav.classList.add("loading");
        setButtonLabel(btn, "Loading...");

        var url =
          "/api/blog/load-more/?format=impreza&page=" +
          encodeURIComponent(String(nextPage)) +
          "&perPage=" +
          encodeURIComponent(String(perPage)) +
          "&exclude=" +
          encodeURIComponent(existingIds());

        fetch(url, { headers: { Accept: "application/json" }, credentials: "same-origin" })
          .then(function (res) {
            if (!res.ok) throw new Error("HTTP " + res.status);
            return res.json();
          })
          .then(function (data) {
            if (!data || !data.ok || typeof data.html !== "string") throw new Error("bad payload");
            if (data.html) list.insertAdjacentHTML("beforeend", data.html);
            if (data.hasMore && data.nextPage) {
              nextPage = data.nextPage;
              setButtonLabel(btn, defaultLabel);
            } else {
              nav.classList.add("done");
              nav.hidden = true;
              nav.style.display = "none";
            }
          })
          .catch(function (err) {
            console.error("[impreza-blog-load-more]", err);
            setButtonLabel(btn, defaultLabel);
          })
          .finally(function () {
            loading = false;
            nav.classList.remove("loading");
          });
      }

      btn.addEventListener("click", onClick, true);
    });
  }

  ready(function () {
    wireElementorLoadMore();
    wireImprezaLoadMore();
  });
})();
