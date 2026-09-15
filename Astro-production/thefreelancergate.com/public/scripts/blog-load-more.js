/**
 * Insights / category Load More.
 * Supports Impreza `.w-grid .g-loadmore` (TFG /insights/) and Elementor ECS nav.
 */
(function () {
  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    var nav =
      document.querySelector("[data-sp-blog-load-more]") ||
      document.querySelector(".ecs-load-more-button") ||
      document.querySelector(".w-grid .g-loadmore");
    if (!nav) return;

    var gridRoot = nav.closest(".w-grid");
    var grid =
      document.querySelector("[data-sp-blog-grid]") ||
      (function () {
        var all = document.querySelectorAll(
          ".ecs-posts.elementor-posts-container",
        );
        return all.length ? all[all.length - 1] : null;
      })() ||
      (gridRoot ? gridRoot.querySelector(".w-grid-list") : null);
    if (!grid) return;

    var btn = nav.querySelector("a.elementor-button, button.w-btn, a, button");
    if (!btn) return;

    var isImpreza = Boolean(gridRoot && grid.classList.contains("w-grid-list"));
    var articleSel = isImpreza ? "article.w-grid-item" : "article.elementor-post";
    var layout = nav.getAttribute("data-layout") || (isImpreza ? "impreza" : "elementor");

    var nextPage = Number(nav.getAttribute("data-next-page") || "2") || 2;
    var perPage =
      Number(nav.getAttribute("data-per-page") || "") ||
      grid.querySelectorAll(articleSel).length ||
      (isImpreza ? 8 : 12);
    var offset =
      Number(nav.getAttribute("data-offset") || "") ||
      grid.querySelectorAll(articleSel).length ||
      perPage;
    var loading = false;
    var defaultLabel =
      (btn.querySelector(".w-btn-label, span") || btn).textContent.trim() ||
      "Load More";

    // Mark so we can skip WP Impreza ajax if it races in.
    nav.setAttribute("data-sp-blog-load-more", "1");
    nav.setAttribute("data-layout", layout);
    nav.setAttribute("data-per-page", String(perPage));
    nav.setAttribute("data-offset", String(offset));
    nav.setAttribute("data-next-page", String(nextPage));

    function setLabel(text) {
      var span = btn.querySelector(".w-btn-label, span");
      if (span) span.textContent = text;
      else btn.textContent = text;
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
      setLabel("Loading...");

      var categoryId = nav.getAttribute("data-category-id") || "";
      var authorId = nav.getAttribute("data-author-id") || "";
      var url =
        "/api/blog/load-more/?page=" +
        encodeURIComponent(String(nextPage)) +
        "&perPage=" +
        encodeURIComponent(String(perPage)) +
        "&offset=" +
        encodeURIComponent(String(offset)) +
        "&layout=" +
        encodeURIComponent(layout) +
        (categoryId ? "&categoryId=" + encodeURIComponent(categoryId) : "") +
        (authorId ? "&authorId=" + encodeURIComponent(authorId) : "");

      fetch(url, {
        headers: { Accept: "application/json" },
        credentials: "same-origin",
      })
        .then(function (res) {
          if (!res.ok) throw new Error("HTTP " + res.status);
          return res.json();
        })
        .then(function (data) {
          if (!data || !data.ok || typeof data.html !== "string") {
            throw new Error("bad payload");
          }
          if (data.html) grid.insertAdjacentHTML("beforeend", data.html);
          offset = Number(
            data.nextOffset != null ? data.nextOffset : offset + perPage,
          );
          nav.setAttribute("data-offset", String(offset));
          if (data.hasMore && data.nextPage) {
            nextPage = data.nextPage;
            nav.setAttribute("data-next-page", String(nextPage));
            if (btn.tagName === "A") {
              // Keep href on current archive; pagination URLs are 301'd away.
              // Click still uses preventDefault + API load-more.
              var basePath = window.location.pathname.replace(/\/?$/, "/");
              btn.setAttribute("href", basePath);
            }
            setLabel(defaultLabel);
          } else {
            nav.hidden = true;
            nav.style.display = "none";
            nav.classList.add("done");
          }
        })
        .catch(function (err) {
          console.error("[sp-blog-load-more]", err);
          setLabel(defaultLabel);
        })
        .finally(function () {
          loading = false;
          nav.classList.remove("loading");
        });
    }

    btn.addEventListener("click", onClick, true);
  });
})();
