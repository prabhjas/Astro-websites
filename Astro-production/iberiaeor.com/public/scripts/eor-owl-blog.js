/**
 * Init Dreamit homepage blog owl-carousel (and other .owl-carousel widgets).
 * Scraped markup often has owl-loaded leftovers — destroy/rebuild cleanly.
 */
(() => {
  if (window.__EOR_OWL_BOOTED__) return;
  window.__EOR_OWL_BOOTED__ = true;

  const OWL_JS = "/wp-content/themes/datatech/assets/js/owl.carousel.min.js";

  function ensureScript(src) {
    return new Promise((resolve) => {
      if (document.querySelector(`script[src*="${src.split("/").pop()}"]`)) {
        resolve();
        return;
      }
      const s = document.createElement("script");
      s.src = src;
      s.onload = () => resolve();
      s.onerror = () => resolve();
      document.head.appendChild(s);
    });
  }

  function waitFor(fn, maxMs) {
    return new Promise((resolve) => {
      const start = Date.now();
      (function tick() {
        if (fn()) {
          resolve(true);
          return;
        }
        if (Date.now() - start > (maxMs || 6000)) {
          resolve(false);
          return;
        }
        setTimeout(tick, 40);
      })();
    });
  }

  function resetOwlDom(el) {
    if (!(el instanceof HTMLElement)) return;
    // Prefer original items if owl already mutated the DOM in the scrape
    const stageItems = el.querySelectorAll(".owl-item:not(.cloned) > *");
    if (stageItems.length) {
      const frag = document.createDocumentFragment();
      stageItems.forEach((node) => frag.appendChild(node.cloneNode(true)));
      el.innerHTML = "";
      el.appendChild(frag);
    }
    el.classList.remove("owl-loaded", "owl-drag", "owl-grab");
  }

  function parseItems(el) {
    const widget = el.closest(".elementor-element");
    const raw = widget?.getAttribute("data-settings") || "{}";
    try {
      const settings = JSON.parse(raw.replace(/&quot;/g, '"'));
      return {
        items: Number(settings.item_show) || Number(settings.items) || 3,
        // Always auto-rotate on desktop + mobile
        autoplay: settings.autoplay !== "no" && settings.auto_play !== "no",
        loop: settings.loop !== "no",
        margin: Number(settings.item_space) || Number(settings.margin) || 20,
        autoplayTimeout: Number(settings.autoplay_speed) || 5000,
      };
    } catch {
      return { items: 3, autoplay: true, loop: true, margin: 20, autoplayTimeout: 5000 };
    }
  }

  async function init() {
    await ensureScript(OWL_JS);
    const ready = await waitFor(
      () => window.jQuery && typeof window.jQuery.fn.owlCarousel === "function",
      6000,
    );
    if (!ready || !window.jQuery) return;
    const $ = window.jQuery;

    document.querySelectorAll(
      ".blog_carousel.owl-carousel, .owl-carousel.curosel-style, .blog_wrap.owl-carousel, .owl-carousel",
    ).forEach((el) => {
      if (!(el instanceof HTMLElement)) return;
      if (el.dataset.eorOwl === "1") return;
      el.dataset.eorOwl = "1";

      try {
        const $el = $(el);
        if ($el.data("owl.carousel")) {
          $el.trigger("destroy.owl.carousel");
        }
      } catch {
        /* ignore */
      }

      resetOwlDom(el);
      const opts = parseItems(el);
      try {
        $(el).owlCarousel({
          items: opts.items,
          loop: opts.loop,
          margin: opts.margin,
          autoplay: true,
          autoplayTimeout: opts.autoplayTimeout || 5000,
          autoplayHoverPause: false,
          nav: true,
          dots: false,
          navText: ["<i class='fa fa-angle-left'></i>", "<i class='fa fa-angle-right'></i>"],
          responsive: {
            0: { items: 1 },
            768: { items: Math.min(2, opts.items) },
            1024: { items: opts.items },
          },
        });
      } catch (e) {
        console.warn("owl blog init failed", e);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
