/**
 * Elementor Swiper takeover for Astro SSR (logo strips + loop carousels).
 * Destroys half-inited Elementor instances so autoplay/loop actually run.
 */
(() => {
  let booting = false;

  function parseSettings(el) {
    const widget =
      el.closest(".elementor-widget-image-carousel") ||
      el.closest(".elementor-widget") ||
      el.closest("[data-settings]");
    const raw =
      widget?.getAttribute("data-settings") ||
      el.getAttribute("data-settings") ||
      "{}";
    try {
      return JSON.parse(raw.replace(/&quot;/g, '"'));
    } catch {
      return {};
    }
  }

  function num(v, fallback) {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }

  function destroyIfAny(el) {
    try {
      if (el.swiper && !el.swiper.destroyed) el.swiper.destroy(true, true);
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
    );
    el.querySelectorAll(".swiper-slide-duplicate").forEach((n) => n.remove());
    const wrap = el.querySelector(".swiper-wrapper");
    if (wrap) {
      wrap.style.transform = "";
      wrap.style.transitionDuration = "";
    }
  }

  function initOne(el) {
    const SwiperCtor = window.Swiper;
    if (!SwiperCtor || !(el instanceof HTMLElement)) return;
    if (!el.querySelector(".swiper-slide")) return;

    if (
      el.dataset.spCarouselOk === "1" &&
      el.swiper &&
      !el.swiper.destroyed &&
      (!el.swiper.params.autoplay || el.swiper.autoplay?.running)
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

    const slides = el.querySelectorAll(".swiper-slide:not(.swiper-slide-duplicate)").length;
    // Need more slides than visible for loop; if equal, drop one visible slot
    const deskView = slides > desktop ? desktop : Math.max(1, Math.min(desktop, slides - 1) || desktop);
    const tabView = Math.min(tablet, deskView);
    const mobView = Math.min(mobile, deskView);
    const wantLoop = settings.infinite !== "no" && settings.loop !== "no";
    const canLoop = wantLoop && slides > Math.max(deskView, tabView, mobView);

    const base = {
      slidesPerView: mobView,
      spaceBetween: space,
      speed: num(settings.speed, 500),
      watchOverflow: false,
      allowTouchMove: true,
      autoplay:
        settings.autoplay === "yes"
          ? {
              delay: num(settings.autoplay_speed, 5000),
              disableOnInteraction: false,
              pauseOnMouseEnter: settings.pause_on_hover === "yes",
            }
          : false,
      navigation: next && prev ? { nextEl: next, prevEl: prev } : undefined,
      breakpoints: {
        768: { slidesPerView: tabView, spaceBetween: space },
        1025: { slidesPerView: deskView, spaceBetween: space },
      },
    };

    const tryInit = (withLoop) => {
      destroyIfAny(el);
      const sw = new SwiperCtor(el, { ...base, loop: withLoop });
      el.dataset.spCarouselOk = "1";
      if (sw.autoplay) {
        try {
          sw.autoplay.start();
        } catch {
          /* ignore */
        }
      }
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
      }
    }
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
            ".elementor-loop-container.swiper",
            ".swiper.elementor-loop-container",
          ].join(", "),
        )
        .forEach((el) => {
          el.dataset.spCarouselOk = "";
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
      // Wait for Elementor's often-broken first pass, then take over
      setTimeout(boot, 200);
      setTimeout(boot, 1000);
      setTimeout(boot, 2200);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
  window.addEventListener("load", () => setTimeout(boot, 600));
})();
