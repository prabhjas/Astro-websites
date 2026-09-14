/**
 * Elementor TOC — only headings from THIS post (title + theme-post-content).
 * Ignores related-post / sidebar / footer H1–H2 that Elementor Pro otherwise includes.
 */
(function () {
  var updating = false;

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
    if (el.id) {
      used[el.id] = true;
      return el.id;
    }
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

  function collectPostHeadings() {
    var headings = [];
    var seen = typeof WeakSet !== "undefined" ? new WeakSet() : null;
    var seenList = [];

    function pushUnique(el) {
      if (!el) return;
      if (seen) {
        if (seen.has(el)) return;
        seen.add(el);
      } else {
        if (seenList.indexOf(el) !== -1) return;
        seenList.push(el);
      }
      headings.push(el);
    }

    // Main post H1 only (first title widget — not related cards later in the DOM).
    var mainTitle =
      document.querySelector(
        ".elementor-location-single .elementor-widget-theme-post-title h1",
      ) ||
      document.querySelector(".elementor-2619 .elementor-widget-theme-post-title h1") ||
      document.querySelector("article .elementor-widget-theme-post-title h1");
    pushUnique(mainTitle);

    // Article body only — never related posts / author / footer blocks.
    var contentRoot =
      document.querySelector(".elementor-widget-theme-post-content") ||
      document.querySelector(".sp-page-content");
    if (contentRoot) {
      // Site TOC settings use h1 + h2 (section titles). Skip h3 FAQ questions etc.
      contentRoot.querySelectorAll("h2").forEach(pushUnique);
    }

    return headings;
  }

  function textFingerprint(headings) {
    return headings
      .map(function (h) {
        return (h.textContent || "").trim();
      })
      .filter(Boolean)
      .join("\n");
  }

  function listFingerprint(widget) {
    var links = widget.querySelectorAll(".elementor-toc__list-item a, .elementor-toc a[href^='#']");
    var parts = [];
    links.forEach(function (a) {
      parts.push((a.textContent || "").trim());
    });
    return parts.filter(Boolean).join("\n");
  }

  function buildListHtml(headings) {
    var used = {};
    var items = [];
    headings.forEach(function (h) {
      var text = (h.textContent || "").trim();
      if (!text) return;
      var id = ensureId(h, used);
      items.push(
        '<li class="elementor-toc__list-item elementor-toc__list-item--level-1">' +
          '<a href="#' +
          id +
          '" class="elementor-toc__list-item-text elementor-toc__list-item-text--level-2">' +
          '<span class="elementor-toc__list-item-text-wrapper">' +
          text.replace(/</g, "&lt;") +
          "</span></a></li>",
      );
    });
    if (!items.length) return "";
    return '<ol class="elementor-toc__list-wrapper">' + items.join("") + "</ol>";
  }

  function fillToc(widget) {
    if (!widget) return;
    var headings = collectPostHeadings();
    if (!headings.length) return;

    var expected = textFingerprint(headings);
    if (widget.dataset.spTocScoped === "1" && listFingerprint(widget) === expected) {
      return;
    }

    var html = buildListHtml(headings);
    if (!html) return;

    var body = widget.querySelector(".elementor-toc__body");
    if (body) {
      body.innerHTML = html;
    } else {
      var header = widget.querySelector(".elementor-toc__header");
      if (header) header.insertAdjacentHTML("afterend", '<div class="elementor-toc__body">' + html + "</div>");
      else widget.insertAdjacentHTML("beforeend", '<div class="elementor-toc__body">' + html + "</div>");
    }
    widget.dataset.spTocScoped = "1";
    widget.dataset.spTocFilled = "1";
  }

  function run() {
    if (updating) return;
    updating = true;
    try {
      document
        .querySelectorAll(".elementor-widget-table-of-contents, .elementor-toc")
        .forEach(fillToc);
    } finally {
      updating = false;
    }
  }

  ready(function () {
    run();
    // Beat Elementor Pro's page-wide TOC scan (related-post H2s).
    setTimeout(run, 200);
    setTimeout(run, 600);
    setTimeout(run, 1500);
    setTimeout(run, 3000);

    var toc = document.querySelector(".elementor-widget-table-of-contents, .elementor-toc");
    if (toc && typeof MutationObserver !== "undefined") {
      var obs = new MutationObserver(function () {
        if (updating) return;
        run();
      });
      obs.observe(toc, { childList: true, subtree: true });
    }
  });
})();
