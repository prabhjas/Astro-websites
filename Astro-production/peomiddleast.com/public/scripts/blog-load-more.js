/**
 * Blog / Insights Load More (PEO Middle East — Impreza).
 */
(function () {
  var WP_CATEGORY_ID_TO_SLUG = {
    "20": "business",
    "593": "peo",
    "29": "services",
    "26": "insights",
    "27": "news",
    "25": "hr",
    "259": "payroll-outsourcing",
    "115": "golden-visa-2",
  };

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  function setButtonLabel(btn, text) {
    var span = btn.querySelector(".w-btn-label, span");
    if (span) span.textContent = text;
    else btn.textContent = text;
  }

  function decodeGridJson(raw) {
    if (!raw) return null;
    var m = raw.match(/return\s+(\{[\s\S]+\})\s*;?\s*$/);
    if (!m) return null;
    try {
      return JSON.parse(m[1].replace(/&quot;/g, '"'));
    } catch (_) {
      return null;
    }
  }

  function parseGridJson(grid) {
    var jsonEl = grid.querySelector(".w-grid-json");
    if (!jsonEl) return null;
    var fromAttr = decodeGridJson(jsonEl.getAttribute("onclick") || "");
    if (fromAttr) return fromAttr;
    try {
      if (typeof jsonEl.onclick === "function") {
        return jsonEl.onclick() || null;
      }
    } catch (_) {}
    return null;
  }

  function resolveCategorySlugs(taxQ) {
    if (!taxQ || !taxQ.terms || !taxQ.terms.length) return [];
    return taxQ.terms
      .map(function (term) {
        var s = String(term);
        if (/^\d+$/.test(s)) return WP_CATEGORY_ID_TO_SLUG[s] || "";
        return s;
      })
      .filter(Boolean);
  }

  function currentPostSlug() {
    var path = (location.pathname || "").replace(/^\/|\/$/g, "");
    if (!path || path.indexOf("/") >= 0) return "";
    var reserved = {
      insights: 1,
      author: 1,
      contact: 1,
      blog: 1,
    };
    if (reserved[path]) return "";
    return path;
  }

  function wireImprezaLoadMore() {
    var loaders = document.querySelectorAll(".w-grid .g-loadmore");
    loaders.forEach(function (nav) {
      var grid = nav.closest(".w-grid");
      if (!grid) return;
      var list = grid.querySelector(".w-grid-list");
      if (!list) return;

      var jsonEl = grid.querySelector(".w-grid-json");
      var cfg = parseGridJson(grid) || {};
      if (jsonEl) jsonEl.removeAttribute("onclick");

      var btn = nav.querySelector("button.w-btn");
      if (!btn) {
        btn = document.createElement("button");
        btn.type = "button";
        btn.className = "w-btn us-btn-style_1";
        var span = document.createElement("span");
        span.className = "w-btn-label";
        span.textContent = "Load More";
        btn.appendChild(span);
        nav.appendChild(btn);
      } else {
        btn.type = "button";
      }

      var qa = (cfg.template_vars && cfg.template_vars.query_args) || {};
      var perPage = Number(qa.posts_per_page) || 3;
      var loading = false;
      var defaultLabel = (btn.textContent || "Load More").trim() || "Load More";

      var taxQ = qa.tax_query && qa.tax_query[0];
      var categorySlugs = resolveCategorySlugs(taxQ);

      function existingSlugs() {
        var set = {};
        list.querySelectorAll("article.w-grid-item").forEach(function (article) {
          var link = article.querySelector('a[href^="/"]');
          if (!link) return;
          try {
            var path = new URL(link.href, window.location.origin).pathname;
            var slug = path.replace(/^\/|\/$/g, "");
            if (slug) set[slug] = true;
          } catch (_) {}
        });
        var pageSlug = currentPostSlug();
        if (pageSlug) set[pageSlug] = true;
        return Object.keys(set).join(",");
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
          "?format=impreza&page=1&perPage=" +
          encodeURIComponent(String(perPage)) +
          "&excludeSlugs=" +
          encodeURIComponent(existingSlugs());

        if (categorySlugs.length === 1) {
          query += "&category=" + encodeURIComponent(categorySlugs[0]);
        } else if (categorySlugs.length > 1) {
          query += "&categories=" + encodeURIComponent(categorySlugs.join(","));
        } else if (grid.id === "us_grid_3") {
          query += "&grid=recent";
        }

        fetch("/api/blog/load-more/" + query)
          .then(function (res) {
            if (!res.ok) throw new Error("HTTP " + res.status);
            return res.json();
          })
          .then(function (data) {
            if (!data || !data.ok || typeof data.html !== "string") throw new Error("bad payload");
            if (data.html.trim()) list.insertAdjacentHTML("beforeend", data.html);
            if (data.hasMore) {
              setButtonLabel(btn, defaultLabel);
            } else {
              nav.classList.add("done");
              nav.hidden = true;
              nav.style.display = "none";
            }
          })
          .catch(function (err) {
            console.error("[peo-impreza-load-more]", err);
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

  ready(wireImprezaLoadMore);
})();
