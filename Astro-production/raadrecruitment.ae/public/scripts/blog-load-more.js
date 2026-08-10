/**
 * Blog Load More — replaces ECS WordPress AJAX with Astro /api/blog/load-more.
 * Appends Elementor-861 cards into the existing ECS posts grid.
 *
 * Important: mirrored blog HTML uses live WP post IDs (e.g. post-5358), while
 * posts.json uses local CMS ids. Always exclude by permalink path.
 */
(function () {
  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  function normalizePath(href) {
    if (!href) return "";
    try {
      var u = new URL(href, window.location.origin);
      var p = u.pathname || "/";
      if (!p.endsWith("/")) p += "/";
      return p.toLowerCase();
    } catch (e) {
      return "";
    }
  }

  function collectShownPaths(scope) {
    var paths = [];
    var seen = Object.create(null);
    var roots = [];
    if (scope && scope.querySelectorAll) roots.push(scope);
    // Also exclude featured/sidecar ECS grids (e.g. latest post above the main grid).
    document.querySelectorAll(".ecs-posts.elementor-posts-container").forEach(function (g) {
      if (roots.indexOf(g) === -1) roots.push(g);
    });
    roots.forEach(function (root) {
      root.querySelectorAll("article.elementor-post").forEach(function (art) {
        var link =
          art.querySelector(".elementor-heading-title a[href]") ||
          art.querySelector("a.elementor-post__thumbnail__link[href]") ||
          art.querySelector("a[href]");
        var path = normalizePath(link && link.getAttribute("href"));
        if (path && !seen[path]) {
          seen[path] = true;
          paths.push(path);
        }
      });
    });
    return paths;
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

    // Neutralize ECS WP admin-ajax href so only our handler runs.
    if (btn.tagName === "A") {
      btn.setAttribute("href", "#");
      btn.setAttribute("role", "button");
    }

    // Live ECS widget loads 6 posts per click (not "however many are on screen").
    var perPage = Number(nav.getAttribute("data-per-page") || "") || 6;
    var loading = false;
    var defaultLabel = (btn.textContent || "Load More").trim() || "Load More";

    function setLabel(text) {
      var span = btn.querySelector("span");
      if (span) span.textContent = text;
      else btn.textContent = text;
    }

    function onClick(event) {
      if (event && event.preventDefault) event.preventDefault();
      if (event && event.stopImmediatePropagation) event.stopImmediatePropagation();
      if (event && event.stopPropagation) event.stopPropagation();
      if (loading || nav.hidden) return;
      loading = true;
      setLabel("Loading...");

      var paths = collectShownPaths(grid);
      var url =
        "/api/blog/load-more/?perPage=" +
        encodeURIComponent(String(perPage)) +
        (paths.length ? "&excludePaths=" + encodeURIComponent(paths.join(",")) : "&page=2");

      fetch(url, { headers: { Accept: "application/json" }, credentials: "same-origin" })
        .then(function (res) {
          if (!res.ok) throw new Error("HTTP " + res.status);
          return res.json();
        })
        .then(function (data) {
          if (!data || !data.ok || typeof data.html !== "string") throw new Error("bad payload");
          if (data.html) {
            grid.insertAdjacentHTML("beforeend", data.html);
          }
          if (data.hasMore) {
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

    window.ECS_load_next_page = function () {
      onClick({
        preventDefault: function () {},
        stopPropagation: function () {},
        stopImmediatePropagation: function () {},
      });
    };
  });
})();
