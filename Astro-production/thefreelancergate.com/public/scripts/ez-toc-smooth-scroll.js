/**
 * Easy TOC smooth scroll — replaces WP plugin smooth_scroll.min.js
 * (not loaded on Astro). Offsets fixed Impreza header.
 */
(function () {
  function headerOffset() {
    var header = document.querySelector(".l-header");
    var h = header ? header.getBoundingClientRect().height : 0;
    var css = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--header-height"),
    );
    return Math.max(h || 0, css || 0, 80) + 12;
  }

  function targetFromHash(hash) {
    if (!hash || hash === "#") return null;
    var id = decodeURIComponent(hash.replace(/^#/, ""));
    if (!id) return null;
    var byId = document.getElementById(id);
    if (byId) return byId;
    try {
      return document.querySelector('.ez-toc-section[id="' + CSS.escape(id) + '"]');
    } catch (e) {
      return document.querySelector('.ez-toc-section[id="' + id.replace(/"/g, '\\"') + '"]');
    }
  }

  function scrollToTarget(el) {
    if (!el) return;
    var top = el.getBoundingClientRect().top + window.pageYOffset - headerOffset();
    top = Math.max(0, top);
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var scroller = document.scrollingElement || document.documentElement;
    if (typeof scroller.scrollTo === "function") {
      scroller.scrollTo({ top: top, behavior: reduce ? "auto" : "smooth" });
    } else {
      scroller.scrollTop = top;
    }
  }

  function onTocClick(event) {
    var link = event.target && event.target.closest ? event.target.closest("a.ez-toc-link") : null;
    if (!link) return;
    var href = link.getAttribute("href") || "";
    var hashIndex = href.indexOf("#");
    if (hashIndex < 0) return;
    var hash = href.slice(hashIndex);
    var target = targetFromHash(hash);
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    if (history.pushState) history.pushState(null, "", hash);
    else location.hash = hash;
    scrollToTarget(target);
  }

  document.addEventListener("click", onTocClick, true);

  function scrollHashOnLoad() {
    if (!location.hash) return;
    var target = targetFromHash(location.hash);
    if (!target) return;
    requestAnimationFrame(function () {
      scrollToTarget(target);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scrollHashOnLoad);
  } else {
    scrollHashOnLoad();
  }
})();
