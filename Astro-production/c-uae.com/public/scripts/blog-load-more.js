/**
 * C-UAE insights / category Load More — pure AJAX (no URL navigation).
 */
(function () {
  if (window.__SP_BLOG_LOAD_MORE__) return;
  window.__SP_BLOG_LOAD_MORE__ = true;

  /** Block legacy ECS pagination if its script is ever present. */
  window.ECS_load_next_page = function () {};

  var PAGINATION_URL = /\/page\/\d+\/?(?:[?#]|$)|[?&]page=\d+/;

  function normalizePath(path) {
    var value = String(path || location.pathname || "/");
    if (!value.startsWith("/")) value = "/" + value;
    return value.endsWith("/") ? value : value + "/";
  }

  function isPaginationUrl(url) {
    if (!url) return false;
    var value = String(url);
    return PAGINATION_URL.test(value) || value.indexOf("/insights/page/") !== -1;
  }

  function installUrlLock(basePath) {
    if (!basePath || window.__SP_BLOG_URL_LOCK__) return;
    window.__SP_BLOG_URL_LOCK__ = true;

    var lockPath = normalizePath(basePath);

    function restoreIfNeeded() {
      if (isPaginationUrl(location.pathname) || isPaginationUrl(location.search)) {
        history.replaceState(history.state, "", lockPath);
      }
    }

    restoreIfNeeded();

    var origPush = history.pushState.bind(history);
    var origReplace = history.replaceState.bind(history);

    history.pushState = function (state, title, url) {
      if (isPaginationUrl(url)) {
        restoreIfNeeded();
        return;
      }
      return origPush(state, title, url);
    };

    history.replaceState = function (state, title, url) {
      if (isPaginationUrl(url)) {
        restoreIfNeeded();
        return;
      }
      return origReplace(state, title, url);
    };

    window.addEventListener("popstate", restoreIfNeeded);
  }

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  function initNav(nav) {
    if (!nav || nav.getAttribute("data-sp-blog-load-more-init") === "1") return;
    nav.setAttribute("data-sp-blog-load-more-init", "1");

    installUrlLock(nav.getAttribute("data-sp-url-lock") || "/insights/");

    var grid =
      document.querySelector("[data-sp-blog-grid]") ||
      (function () {
        var all = document.querySelectorAll(".ecs-posts.elementor-posts-container");
        return all.length ? all[all.length - 1] : null;
      })();
    if (!grid) return;

    var btn = nav.querySelector("[data-sp-load-more-btn], button.elementor-button, a.elementor-button, button");
    if (!btn) return;

    var nextPage = Number(nav.getAttribute("data-next-page") || "2") || 2;
    var perPage =
      Number(nav.getAttribute("data-per-page") || "") ||
      grid.querySelectorAll("article.elementor-post").length ||
      12;
    var offset =
      Number(nav.getAttribute("data-offset") || "") ||
      grid.querySelectorAll("article.elementor-post").length ||
      perPage;
    var categoryId = nav.getAttribute("data-category-id") || "";
    var loading = false;
    var defaultLabel = (btn.textContent || "Load More").trim() || "Load More";

    if (btn.tagName === "A") {
      btn.setAttribute("href", "#");
      btn.setAttribute("role", "button");
    } else if (btn.tagName === "BUTTON") {
      btn.setAttribute("type", "button");
    }

    function setLabel(text) {
      var span = btn.querySelector("span");
      if (span) span.textContent = text;
      else btn.textContent = text;
    }

    function setBusy(busy) {
      loading = busy;
      nav.setAttribute("aria-busy", busy ? "true" : "false");
      nav.classList.toggle("sp-load-more--loading", busy);
      btn.setAttribute("aria-disabled", busy ? "true" : "false");
      if (btn.tagName === "BUTTON") {
        btn.disabled = busy;
      } else {
        btn.style.pointerEvents = busy ? "none" : "";
      }
    }

    function hideNav() {
      nav.hidden = true;
      nav.style.display = "none";
      nav.setAttribute("aria-hidden", "true");
    }

    function loadNext(event) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === "function") {
          event.stopImmediatePropagation();
        }
      }
      if (loading || nav.hidden) return false;

      setBusy(true);
      setLabel("Loading...");

      var url =
        "/api/blog/load-more/?page=" +
        encodeURIComponent(String(nextPage)) +
        "&perPage=" +
        encodeURIComponent(String(perPage)) +
        "&offset=" +
        encodeURIComponent(String(offset)) +
        (categoryId ? "&categoryId=" + encodeURIComponent(categoryId) : "");

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
            setLabel(defaultLabel);
          } else {
            hideNav();
          }
        })
        .catch(function (err) {
          console.error("[sp-blog-load-more]", err);
          setLabel(defaultLabel);
        })
        .finally(function () {
          setBusy(false);
          if (isPaginationUrl(location.pathname) || isPaginationUrl(location.search)) {
            history.replaceState(history.state, "", normalizePath(nav.getAttribute("data-sp-url-lock") || "/insights/"));
          }
        });

      return false;
    }

    btn.addEventListener("click", loadNext, true);
    nav.addEventListener(
      "click",
      function (event) {
        var target = event.target && event.target.closest ? event.target.closest("a[href]") : null;
        if (target && nav.contains(target) && isPaginationUrl(target.getAttribute("href"))) {
          loadNext(event);
        }
      },
      true,
    );
  }

  ready(function () {
    document
      .querySelectorAll("[data-sp-blog-load-more], .ecs-load-more-button")
      .forEach(initNav);
  });
})();
