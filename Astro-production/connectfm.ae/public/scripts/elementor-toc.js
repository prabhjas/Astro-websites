/**
 * Elementor Pro TOC fallback — builds links from post H2/H3 when the Pro widget stays empty.
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

  function fillToc(widget) {
    if (!widget || widget.dataset.spTocFilled === "1") return;
    var bodyList = widget.querySelector(".elementor-toc__list-wrapper, .elementor-toc__body ol, .elementor-toc__body ul");
    var existing = widget.querySelectorAll(".elementor-toc__list-item a, .elementor-toc a[href^='#']");
    if (existing.length) {
      widget.dataset.spTocFilled = "1";
      return;
    }

    var contentRoot =
      document.querySelector(".elementor-widget-theme-post-content") ||
      document.querySelector(".elementor-2619 .elementor-element-c0a0c0a, .sp-page-content") ||
      document.querySelector(".sp-page-content");
    if (!contentRoot) return;

    var headings = contentRoot.querySelectorAll("h2, h3");
    if (!headings.length) return;

    var used = {};
    var items = [];
    headings.forEach(function (h) {
      var text = (h.textContent || "").trim();
      if (!text) return;
      var id = ensureId(h, used);
      var level = h.tagName === "H3" ? "elementor-toc__list-item--level-2" : "elementor-toc__list-item--level-1";
      items.push(
        '<li class="elementor-toc__list-item ' +
          level +
          '"><a href="#' +
          id +
          '" class="elementor-toc__list-item-text elementor-toc__list-item-text--level-' +
          (h.tagName === "H3" ? "3" : "2") +
          '"><span class="elementor-toc__list-item-text-wrapper">' +
          text.replace(/</g, "&lt;") +
          "</span></a></li>",
      );
    });
    if (!items.length) return;

    var html = '<ol class="elementor-toc__list-wrapper">' + items.join("") + "</ol>";
    var body = widget.querySelector(".elementor-toc__body");
    if (body) {
      // Remove spinner / empty placeholder
      body.innerHTML = html;
    } else if (bodyList) {
      bodyList.outerHTML = html;
    } else {
      var header = widget.querySelector(".elementor-toc__header");
      if (header) header.insertAdjacentHTML("afterend", '<div class="elementor-toc__body">' + html + "</div>");
      else widget.insertAdjacentHTML("beforeend", html);
    }
    widget.dataset.spTocFilled = "1";
  }

  ready(function () {
    function run() {
      document.querySelectorAll(".elementor-widget-table-of-contents, .elementor-toc").forEach(fillToc);
    }
    run();
    // Elementor may mount late
    setTimeout(run, 600);
    setTimeout(run, 1800);
  });
})();
