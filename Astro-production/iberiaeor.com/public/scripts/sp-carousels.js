/**
 * Elementor Swiper takeover for Astro SSR (logo strips, testimonials, loop carousels).
 * Elementor's bundled Swiper often throws on nav/a11y during re-init; we use a
 * minimal config and always autoplay on desktop + mobile.
 */
(() => {
  let booting = false;

  function parseSettings(el) {
    let node = el;
    for (let i = 0; i < 6 && node; i++) {
      const raw = node.getAttribute?.("data-settings");
      if (raw && /slides_to_show|slides_per_view|autoplay|infinite|loop/i.test(raw)) {
        try {
          return JSON.parse(raw.replace(/&quot;/g, '"'));
        } catch {
          /* keep walking */
        }
      }
      node = node.parentElement;
    }
    const widget =
      el.closest(".elementor-widget-image-carousel") ||
      el.closest(".elementor-widget") ||
      el.closest("[data-settings]");
    const fallback =
      widget?.getAttribute("data-settings") ||
      el.getAttribute("data-settings") ||
      "{}";
    try {
      return JSON.parse(fallback.replace(/&quot;/g, '"'));
    } catch {
      return {};
    }
  }

  function num(v, fallback) {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }

  function isVisiblyRenderable(el) {
    if (!(el instanceof HTMLElement)) return false;
    let n = el;
    for (let i = 0; i < 12 && n; i++) {
      const cs = getComputedStyle(n);
      if (cs.display === "none" || cs.visibility === "hidden") return false;
      n = n.parentElement;
    }
    return el.clientWidth > 0 || el.offsetParent !== null;
  }

  function destroyIfAny(el) {
    try {
      if (el.swiper && !el.swiper.destroyed) el.swiper.destroy(true, true);
    } catch {
      /* ignore */
    }
    try {
      el.swiper = undefined;
    } catch {
      /* ignore */
    }
    try {
      delete el.swiper;
    } catch {
      /* ignore */
    }
    el.classList.remove(
      "swiper-initialized",
      "swiper-horizontal",
      "swiper-vertical",
      "swiper-pointer-events",
      "swiper-backface-hidden",
      "swiper-watch-progress",
      "elementor-grid",
    );
    el.querySelectorAll(".swiper-slide-duplicate").forEach((n) => n.remove());
    const wrap = el.querySelector(".swiper-wrapper");
    if (wrap) {
      wrap.style.transform = "";
      wrap.style.transitionDuration = "";
    }
    el.style.overflow = "hidden";
    // Don't force display:block — it can break Elementor flex column widths
  }

  function wireNav(sw, next, prev) {
    if (!sw || !next || !prev) return;
    const goNext = (e) => {
      e.preventDefault();
      try {
        sw.slideNext();
      } catch {
        /* ignore */
      }
    };
    const goPrev = (e) => {
      e.preventDefault();
      try {
        sw.slidePrev();
      } catch {
        /* ignore */
      }
    };
    next.addEventListener("click", goNext);
    prev.addEventListener("click", goPrev);
  }

  function startAutoplay(sw) {
    if (!sw || typeof sw.slideNext !== "function") return;
    try {
      sw.autoplay?.start?.();
    } catch {
      /* ignore */
    }
    const delay = Math.max(2000, num(sw.params?.autoplay?.delay, 5000));
    // Prefer native autoplay; add ticker only if it stays idle
    setTimeout(() => {
      if (sw.destroyed) return;
      if (sw.autoplay?.running) return;
      if (sw.__spTicker) clearInterval(sw.__spTicker);
      sw.__spTicker = setInterval(() => {
        try {
          if (sw.destroyed) {
            clearInterval(sw.__spTicker);
            return;
          }
          sw.slideNext();
        } catch {
          /* ignore */
        }
      }, delay);
    }, 200);
  }

  function initOne(el) {
    const SwiperCtor = window.Swiper;
    if (!SwiperCtor || !(el instanceof HTMLElement)) return;
    if (!isVisiblyRenderable(el)) return;
    if (!el.querySelector(".swiper-slide")) return;

    if (
      el.dataset.spCarouselOk === "1" &&
      el.swiper &&
      !el.swiper.destroyed &&
      typeof el.swiper.slideNext === "function" &&
      (el.swiper.autoplay?.running || el.swiper.__spTicker)
    ) {
      return;
    }

    const settings = parseSettings(el);
    const parent = el.closest(".elementor-element") || el.parentElement;
    const next = parent?.querySelector(
      ".elementor-swiper-button-next, .swiper-button-next",
    );
    const prev = parent?.querySelector(
      ".elementor-swiper-button-prev, .swiper-button-prev",
    );

    const desktop = num(settings.slides_to_show || settings.slides_per_view, 3);
    const tablet = num(settings.slides_to_show_tablet, Math.min(2, desktop));
    const mobile = num(settings.slides_to_show_mobile, 1);
    let space = 20;
    const spaceRaw = settings.image_spacing_custom || settings.space_between;
    if (typeof spaceRaw === "object" && spaceRaw) space = num(spaceRaw.size, 20);
    else if (spaceRaw != null && spaceRaw !== "") space = num(spaceRaw, 20);

    const slides = el.querySelectorAll(
      ".swiper-slide:not(.swiper-slide-duplicate)",
    ).length;
    const deskView =
      slides > desktop
        ? desktop
        : Math.max(1, Math.min(desktop, slides - 1) || desktop);
    const tabView = Math.min(tablet, deskView);
    const mobView = Math.min(mobile, deskView);
    const wantLoop = settings.infinite !== "no" && settings.loop !== "no";
    const canLoop = wantLoop && slides > Math.max(deskView, tabView, mobView);
    const autoplayDelay = num(settings.autoplay_speed, 5000);

    // Minimal options — Elementor Swiper throws if nav/pagination/a11y els are stale
    const base = {
      slidesPerView: mobView,
      spaceBetween: space,
      speed: num(settings.speed, 500),
      watchOverflow: false,
      allowTouchMove: true,
      observer: true,
      observeParents: true,
      a11y: false,
      navigation: false,
      pagination: false,
      scrollbar: false,
      autoplay: {
        delay: autoplayDelay,
        disableOnInteraction: false,
        pauseOnMouseEnter: false,
      },
      breakpoints: {
        768: { slidesPerView: tabView, spaceBetween: space },
        1025: { slidesPerView: deskView, spaceBetween: space },
      },
    };

    const tryInit = (withLoop) => {
      destroyIfAny(el);
      const sw = new SwiperCtor(el, { ...base, loop: withLoop });
      el.dataset.spCarouselOk = "1";
      wireNav(sw, next, prev);
      startAutoplay(sw);
      return sw;
    };

    try {
      tryInit(canLoop);
    } catch (err) {
      console.warn("sp-carousel loop init failed, non-loop", err);
      try {
        tryInit(false);
      } catch (err2) {
        console.warn("sp-carousel init failed", err2);
        // Last resort: manual slide ticker without full Swiper modules
        destroyIfAny(el);
        fallbackTicker(el, autoplayDelay, deskView, space);
      }
    }
  }

  function fallbackTicker(el, delay, perView, space) {
    const wrap = el.querySelector(".swiper-wrapper");
    if (!wrap) return;
    const slides = [...el.querySelectorAll(".swiper-slide")];
    if (slides.length < 2) return;
    el.classList.add("swiper-initialized", "swiper-horizontal");
    wrap.style.display = "flex";
    wrap.style.transition = "transform 0.5s ease";
    slides.forEach((s) => {
      s.style.flex = `0 0 ${100 / perView}%`;
      s.style.maxWidth = `${100 / perView}%`;
      s.style.boxSizing = "border-box";
      s.style.paddingRight = `${space / 2}px`;
      s.style.paddingLeft = `${space / 2}px`;
    });
    let index = 0;
    const max = Math.max(1, slides.length - Math.floor(perView) + 1);
    el.dataset.spCarouselOk = "1";
    if (el.__spTicker) clearInterval(el.__spTicker);
    el.__spTicker = setInterval(() => {
      index = (index + 1) % max;
      wrap.style.transform = `translate3d(-${(100 / perView) * index}%,0,0)`;
    }, delay);
  }

  function boot() {
    if (!window.Swiper || booting) return;
    booting = true;
    try {
      document
        .querySelectorAll(
          [
            ".elementor-image-carousel-wrapper.swiper",
            ".elementor-main-swiper",
            ".elementor-slides-wrapper",
            ".elementor-loop-container.swiper",
            ".swiper.elementor-loop-container",
            ".e-n-carousel.swiper",
            ".elementor-testimonial-carousel .swiper",
          ].join(", "),
        )
        .forEach((el) => {
          initOne(el);
        });
    } finally {
      booting = false;
    }
  }

  function ensureSwiper(cb) {
    if (window.Swiper) {
      cb();
      return;
    }
    const existing = document.querySelector('script[src*="swiper"]');
    if (existing) {
      existing.addEventListener("load", cb);
      setTimeout(cb, 800);
      return;
    }
    const s = document.createElement("script");
    s.src = "/scripts/swiper.min.js";
    s.onload = cb;
    document.head.appendChild(s);
  }

  function run() {
    ensureSwiper(() => {
      setTimeout(boot, 200);
      setTimeout(boot, 1000);
      setTimeout(boot, 2200);
      setTimeout(boot, 4000);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
  window.addEventListener("load", () => setTimeout(boot, 600));
})();
