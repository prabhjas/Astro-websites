/**
 * Homepage Dreamit blog slider: 8 posts, 3 visible (Owl Carousel).
 * Cleans scraped owl-loaded leftovers, then inits with items: 3.
 */
(() => {
  if (window.__EOR_OWL_BOOTED__) return;
  window.__EOR_OWL_BOOTED__ = true;

  const OWL_JS = "/wp-content/themes/datatech/assets/js/owl.carousel.min.js";
  const MAX_POSTS = 8;
  const VISIBLE = 3;

  function ensureCss() {
    if (document.getElementById("eor-home-blog-css")) return;
    const link = document.createElement("link");
    link.id = "eor-home-blog-css";
    link.rel = "stylesheet";
    link.href = "/css/eor-home-blog.css";
    document.head.appendChild(link);
  }

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
        if (fn()) return resolve(true);
        if (Date.now() - start > (maxMs || 8000)) return resolve(false);
        setTimeout(tick, 40);
      })();
    });
  }

  function prepareBlogWrap(el) {
    if (!(el instanceof HTMLElement)) return false;
    if (el.dataset.eorOwl === "1") return false;

    // Pull real slides out of any leftover owl stage
    const stageItems = el.querySelectorAll(".owl-item:not(.cloned) > *");
    if (stageItems.length) {
      const frag = document.createDocumentFragment();
      stageItems.forEach((node) => frag.appendChild(node.cloneNode(true)));
      el.innerHTML = "";
      el.appendChild(frag);
    }

    el.querySelectorAll(".owl-nav, .owl-dots, .owl-stage-outer, .owl-stage").forEach((n) =>
      n.remove(),
    );

    // Keep only first 8 post cards
    const slides = [...el.children].filter(
      (c) =>
        c instanceof HTMLElement &&
        (c.classList.contains("col-md-12") || c.querySelector(".single_blog_adn")),
    );
    slides.forEach((slide, idx) => {
      if (idx >= MAX_POSTS) slide.remove();
    });

    // Clean classes for a fresh Owl init (owl-loaded without stage breaks layout)
    el.classList.remove(
      "eor-blog-grid",
      "owl-loaded",
      "owl-drag",
      "owl-grab",
      "owl-hidden",
      "owl-loading",
    );
    el.classList.add("blog_wrap", "blog_carousel", "owl-carousel", "curosel-style");
    el.removeAttribute("style");

    // Ensure each slide is a simple block Owl can measure
    [...el.children].forEach((child) => {
      if (!(child instanceof HTMLElement)) return;
      child.style.width = "";
      child.style.maxWidth = "";
      child.style.float = "";
      child.style.display = "";
      child.style.margin = "";
    });

    return true;
  }

  async function init() {
    ensureCss();
    const wraps = document.querySelectorAll(
      ".elementor-widget-blogpost .blog_wrap, .blog_wrap.blog_carousel, .blog_wrap.eor-blog-grid, .blog_wrap.owl-carousel",
    );
    if (!wraps.length) return;

    await ensureScript(OWL_JS);
    const ready = await waitFor(
      () => window.jQuery && typeof window.jQuery.fn.owlCarousel === "function",
      8000,
    );
    if (!ready) {
      console.warn("[eor-owl-blog] Owl/jQuery not ready");
      return;
    }
    const $ = window.jQuery;

    wraps.forEach((el) => {
      if (!(el instanceof HTMLElement)) return;
      if (!prepareBlogWrap(el)) return;
      el.dataset.eorOwl = "1";

      try {
        const $el = $(el);
        if ($el.data("owl.carousel")) $el.trigger("destroy.owl.carousel");
      } catch {
        /* ignore */
      }

      try {
        $(el).owlCarousel({
          items: VISIBLE,
          loop: true,
          margin: 20,
          autoplay: true,
          autoplayTimeout: 5000,
          autoplayHoverPause: true,
          nav: true,
          dots: false,
          navText: [
            "<i class='fa fa-angle-left' aria-hidden='true'></i>",
            "<i class='fa fa-angle-right' aria-hidden='true'></i>",
          ],
          responsive: {
            0: { items: 1 },
            768: { items: 2 },
            1024: { items: VISIBLE },
          },
        });
        // Recalc widths after side gutters/padding apply
        requestAnimationFrame(() => {
          try {
            $(el).trigger("refresh.owl.carousel");
          } catch (_) {}
        });
      } catch (e) {
        console.warn("[eor-owl-blog] init failed", e);
        el.dataset.eorOwl = "0";
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  window.addEventListener("load", () => {
    // Re-init if a theme script wiped our carousel
    const broken = document.querySelector(
      ".elementor-widget-blogpost .blog_wrap.owl-loaded:not(:has(.owl-stage))",
    );
    const plain = document.querySelector(
      ".elementor-widget-blogpost .blog_wrap:not(.owl-loaded)",
    );
    if (broken || (plain && plain.dataset.eorOwl !== "1")) {
      document.querySelectorAll(".blog_wrap").forEach((el) => {
        if (el instanceof HTMLElement) el.dataset.eorOwl = "0";
      });
      window.__EOR_OWL_BOOTED__ = false;
      init();
    }
  });
})();
