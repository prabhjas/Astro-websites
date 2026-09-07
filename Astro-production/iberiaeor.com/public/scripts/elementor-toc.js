/**
 * Elementor Pro TOC fallback - fills TOC when the Pro webpack chunk fails/404s.
 */
(function () {
  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  function slugify(text) {
    return String(text || "")
      .trim()
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 80);
  }

  function ensureId(el, used) {
    if (el.id) return el.id;
    var base = slugify(el.textContent) || "section";
    var id = base;
    var n = 2;
    while (used[id] || document.getElementById(id)) {
      id = base + "-" + n++;
    }
    used[id] = true;
    el.id = id;
    return id;
  }

  function contentRoot() {
    return (
      document.querySelector(".elementor-widget-theme-post-content") ||
      document.querySelector(".elementor-234 .elementor-widget-theme-post-content") ||
      document.querySelector(".elementor-location-single .elementor-widget-theme-post-content") ||
      document.querySelector("article .entry-content") ||
      document.querySelector(".sp-page-content")
    );
  }

  function applyTocNofollow(widget) {
    if (!widget) return;
    widget
      .querySelectorAll(".elementor-toc__list-item a, .elementor-toc__body a[href^='#']")
      .forEach(function (a) {
        a.setAttribute("rel", "nofollow");
      });
  }

  function fillToc(widget) {
    if (!widget || widget.dataset.spTocFilled === "1") return;

    var existing = widget.querySelectorAll(
      ".elementor-toc__list-item a, .elementor-toc__body a[href^='#']",
    );
    // Real Elementor TOC populated (not just spinner)
    if (existing.length) {
      applyTocNofollow(widget);
      widget.dataset.spTocFilled = "1";
      return;
    }

    var root = contentRoot();
    if (!root) return;

    var headings = root.querySelectorAll("h2, h3, h4, h5, h6");
    if (!headings.length) return;

    var used = {};
    var items = [];
    headings.forEach(function (h) {
      var text = (h.textContent || "").trim();
      if (!text) return;
      var id = ensureId(h, used);
      var levelNum = parseInt(h.tagName.charAt(1), 10) || 2;
      var listLevel = levelNum <= 2 ? 1 : 2;
      items.push(
        '<li class="elementor-toc__list-item elementor-toc__list-item--level-' +
          listLevel +
          '"><a href="#' +
          id +
          '" rel="nofollow" class="elementor-toc__list-item-text elementor-toc__list-item-text--level-' +
          levelNum +
          '"><span class="elementor-toc__list-item-text-wrapper">' +
          text.replace(/</g, "&lt;") +
          "</span></a></li>",
      );
    });
    if (!items.length) return;

    var html = '<ol class="elementor-toc__list-wrapper">' + items.join("") + "</ol>";
    var body = widget.querySelector(".elementor-toc__body");
    if (body) {
      body.innerHTML = html;
    } else {
      var header = widget.querySelector(".elementor-toc__header");
      if (header) header.insertAdjacentHTML("afterend", '<div class="elementor-toc__body">' + html + "</div>");
      else widget.insertAdjacentHTML("beforeend", html);
    }
    applyTocNofollow(widget);
    widget.dataset.spTocFilled = "1";
  }

  ready(function () {
    function run() {
      document.querySelectorAll(".elementor-widget-table-of-contents").forEach(function (widget) {
        fillToc(widget);
        applyTocNofollow(widget);
      });
    }
    run();
    // Elementor Pro may populate late if its chunk loads
    setTimeout(run, 600);
    setTimeout(run, 1800);
    setTimeout(run, 4000);

    // Keep nofollow when Pro TOC re-renders the list after our first pass
    if (typeof MutationObserver !== "undefined") {
      document.querySelectorAll(".elementor-widget-table-of-contents").forEach(function (widget) {
        var body = widget.querySelector(".elementor-toc__body") || widget;
        var obs = new MutationObserver(function () {
          applyTocNofollow(widget);
        });
        obs.observe(body, { childList: true, subtree: true });
      });
    }
  });
})();
