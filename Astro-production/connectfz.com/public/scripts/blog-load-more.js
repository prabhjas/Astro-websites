/**
 * SP Heavy blog Load More — Elementor/ECS replacement.
 * Appends into the image grid (data-sp-blog-grid), not the featured list.
 */
(function () {
  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
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

    function setLabel(text) {
      var span = btn.querySelector("span");
      if (span) span.textContent = text;
      else btn.textContent = text;
    }

    function onClick(event) {
      event.preventDefault();
      event.stopPropagation();
      if (loading || nav.hidden) return;
      loading = true;
      setLabel("Loading...");

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
            setLabel(defaultLabel);
          } else {
            nav.hidden = true;
            nav.style.display = "none";
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
