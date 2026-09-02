/**
 * Blog / Insights Load More.
 * - Elementor/ECS grids: [data-sp-blog-load-more] / .ecs-load-more-button
 * - Impreza insights grid: .w-grid.pagination_ajax .g-loadmore (us_ajax_grid replacement)
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

  function parseGridJson(grid) {
    var jsonEl = grid.querySelector(".w-grid-json");
    if (!jsonEl) return null;
    try {
      if (typeof jsonEl.onclick === "function") {
        return jsonEl.onclick() || null;
      }
    } catch (_) {}
    var raw = jsonEl.getAttribute("onclick") || "";
    var m = raw.match(/return\s+(\{[\s\S]+\})\s*;?\s*$/);
    if (!m) return null;
    try {
      return JSON.parse(m[1].replace(/&quot;/g, '"'));
    } catch (_) {
      return null;
    }
  }

  function ensureLoadMoreButton(nav) {
    var btn = nav.querySelector("button, .w-btn, a[role='button'], a.w-btn");
    if (btn) return btn;

    var label = nav.querySelector(".w-btn-label");
    var text = (label && label.textContent) || "Load More";
    btn = document.createElement("a");
    btn.href = "#";
    btn.className = "w-btn us-btn-style_1";
    btn.setAttribute("role", "button");
    var span = document.createElement("span");
    span.className = "w-btn-label";
    span.textContent = text.trim() || "Load More";
    btn.appendChild(span);
    if (label) label.remove();
    nav.appendChild(btn);
    return btn;
  }

  function fetchLoadMore(url) {
    return fetch(url, { headers: { Accept: "application/json" }, credentials: "same-origin" }).then(
      function (res) {
        if (res.ok) return res.json();
        throw new Error("HTTP " + res.status);
      },
    );
  }

  function loadMoreUrls(query) {
    return [
      "/api/blog/load-more/" + query,
      "/api/geo/blog-load-more/" + query,
      "/api/geo/country/?loadMore=1&" + query.replace(/^\?/, ""),
    ];
  }

  function fetchLoadMoreWithFallback(query) {
    var urls = loadMoreUrls(query);
    var attempt = function (i) {
      if (i >= urls.length) return Promise.reject(new Error("all endpoints failed"));
      return fetchLoadMore(urls[i]).catch(function () {
        return attempt(i + 1);
      });
    };
    return attempt(0);
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

      var query =
        "?page=" +
        encodeURIComponent(String(nextPage)) +
        "&perPage=" +
        encodeURIComponent(String(perPage));

      fetchLoadMoreWithFallback(query)
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
    var loaders = document.querySelectorAll(
      ".w-grid.pagination_ajax .g-loadmore, .w-grid.cr-author-articles .g-loadmore",
    );
    if (!loaders.length) {
      loaders = document.querySelectorAll(".w-grid .g-loadmore");
    }

    loaders.forEach(function (nav) {
      var grid = nav.closest(".w-grid");
      if (!grid) return;
      var list = grid.querySelector(".w-grid-list");
      if (!list) return;

      var btn = ensureLoadMoreButton(nav);
      var cfg = parseGridJson(grid) || {};
      var qa = (cfg.template_vars && cfg.template_vars.query_args) || {};
      var perPage = Number(qa.posts_per_page) || 4;
      var nextPage = 2;
      var isAuthor = grid.classList.contains("cr-author-articles");
      var authorId = grid.getAttribute("data-author-id") || "";
      var isInsights =
        !isAuthor && (grid.id === "us_grid_3" || grid.classList.contains("pagination_ajax"));
      if (isAuthor) {
        perPage = 9;
      }
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

        var query =
          "?format=impreza&page=" +
          encodeURIComponent(String(nextPage)) +
          "&perPage=" +
          encodeURIComponent(String(perPage)) +
          "&exclude=" +
          encodeURIComponent(existingIds());
        if (isAuthor && authorId) {
          query += "&grid=author&authorId=" + encodeURIComponent(authorId);
        } else if (isInsights) {
          query += "&grid=insights";
        }

        fetchLoadMoreWithFallback(query)
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
      nav.addEventListener("click", onClick, true);
    });
  }

  ready(function () {
    wireElementorLoadMore();
    wireImprezaLoadMore();
  });
})();
